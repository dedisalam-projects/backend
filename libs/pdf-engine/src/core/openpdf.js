const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const { spawnSync } = require('child_process');
const { normalizeTravelokaData } = require('../normalizers/traveloka');
const { checkMicroserviceHealth, renderViaHttpService } = require('./helpers');

/**
 * src/core/openpdf.js - Polyglot Java/OpenPDF Multi-Platform Execution Engine
 *
 * Implements dual-mode execution for Traveloka receipts:
 * 1. Microservice Mode: HTTP POST stream to dedicated container (e.g., http://pdf-openpdf:8081/render)
 * 2. Standalone / Local CLI Mode: Directly invokes TravelokaPdfRunner via Java runtime.
 *
 * ZERO PDFKit fallback: Always guarantees authentic OpenPDF 1.3.30 producer,
 * CIDFont Type0 TrueType fonts, and identical SMask XObjects.
 */

const ENGINE_DIR = path.resolve(__dirname, '../../');
const OPENPDF_BIN_DIR = path.join(ENGINE_DIR, 'bin/openpdf');

const DEFAULT_SERVICE_HOST = process.env.PDF_OPENPDF_HOST || 'pdf-openpdf';
const DEFAULT_SERVICE_PORT = Number.parseInt(process.env.PDF_OPENPDF_PORT || '8081', 10);

/**
 * Check if local Java is available and OpenPDF classes exist
 */
function findLocalJavaRunner() {
    try {
        const checkCmd = process.platform === 'win32' ? 'where' : 'which';
        const res = spawnSync(checkCmd, ['java'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout.trim()) {
            const javaBin = res.stdout.trim().split(/\r?\n/)[0];
            const jarOpenPdf = path.join(OPENPDF_BIN_DIR, 'openpdf-1.3.30.jar');
            const jarJson = path.join(OPENPDF_BIN_DIR, 'json-20240303.jar');
            if (fs.existsSync(jarOpenPdf) && fs.existsSync(jarJson)) {
                return {
                    javaBin,
                    classPath: `${jarOpenPdf}${path.delimiter}${jarJson}${path.delimiter}${OPENPDF_BIN_DIR}`
                };
            }
        }
    } catch (e) {}
    return null;
}

/**
 * Render via local Java CLI subprocess
 */
function renderViaLocalJava(jsonData, outputPdfPath) {
    const runner = findLocalJavaRunner();
    if (!runner) {
        throw new Error(
            '[PDF Engine Error] OpenPDF 1.3.30 is mandatory for Traveloka receipt generation. ' +
            'Neither OpenPDF microservice nor local Java runtime (with openpdf-1.3.30.jar) was reachable. ' +
            'Fallback to PDFKit is strictly disabled.'
        );
    }

    const scratchDir = path.join(ENGINE_DIR, 'scratch');
    fs.mkdirSync(scratchDir, { recursive: true });
    const tempJsonPath = path.join(scratchDir, `traveloka_temp_${Date.now()}_${crypto.randomUUID()}.json`);

    try {
        fs.writeFileSync(tempJsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
        const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
        fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

        const args = [
            '-cp', runner.classPath,
            'com.blipstudio.pdf.TravelokaPdfRunner',
            tempJsonPath,
            resolvedOut
        ];

        const env = Object.assign({}, process.env, {
            PDF_ENGINE_DIR: ENGINE_DIR
        });

        const execRes = spawnSync(runner.javaBin, args, {
            encoding: 'utf8',
            env,
            cwd: OPENPDF_BIN_DIR
        });

        if (execRes.status !== 0) {
            throw new Error(`OpenPDF Java runner failed (exit ${execRes.status}): ${execRes.stderr || execRes.stdout}`);
        }

        return resolvedOut;
    } finally {
        if (fs.existsSync(tempJsonPath)) {
            try { fs.unlinkSync(tempJsonPath); } catch (e) {}
        }
    }
}

/**
 * Generate Traveloka PDF to target file
 */
async function generateOpenPdf(jsonData, outputPdfPath, options = {}) {
    const payload = normalizeTravelokaData(jsonData);
    const serviceHost = options.host || DEFAULT_SERVICE_HOST;
    const servicePort = options.port || DEFAULT_SERVICE_PORT;

    // 1. Try microservice if reachable
    const isServiceUp = await checkMicroserviceHealth(serviceHost, servicePort);
    if (isServiceUp) {
        const buffer = await renderViaHttpService(serviceHost, servicePort, payload);
        const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
        fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
        fs.writeFileSync(resolvedOut, buffer);
        return resolvedOut;
    }

    // 2. Fallback to local Java runner
    return renderViaLocalJava(payload, outputPdfPath);
}

/**
 * Generate Traveloka PDF to Buffer
 */
async function generateOpenPdfBuffer(jsonData, options = {}) {
    const payload = normalizeTravelokaData(jsonData);
    const serviceHost = options.host || DEFAULT_SERVICE_HOST;
    const servicePort = options.port || DEFAULT_SERVICE_PORT;

    // 1. Try microservice
    const isServiceUp = await checkMicroserviceHealth(serviceHost, servicePort);
    if (isServiceUp) {
        return renderViaHttpService(serviceHost, servicePort, payload);
    }

    // 2. Local Java runner
    const scratchDir = path.join(ENGINE_DIR, 'scratch');
    fs.mkdirSync(scratchDir, { recursive: true });
    const tempPdfPath = path.join(scratchDir, `temp_out_${Date.now()}_${crypto.randomUUID()}.pdf`);
    try {
        renderViaLocalJava(payload, tempPdfPath);
        return fs.readFileSync(tempPdfPath);
    } finally {
        if (fs.existsSync(tempPdfPath)) {
            try { fs.unlinkSync(tempPdfPath); } catch (e) {}
        }
    }
}

module.exports = {
    generateOpenPdf,
    generateOpenPdfBuffer,
    findLocalJavaRunner,
    checkMicroserviceHealth
};
