const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('node:crypto');
const { spawnSync } = require('child_process');
const { renderGoCarHtml } = require('../templates/html/gocar');
const { renderGoRideHtml } = require('../templates/html/goride');

/**
 * src/core/wkhtml.js - HTML/WebKit Multi-Platform Execution Engine
 *
 * Implements dual-mode execution for Gojek receipts:
 * 1. Microservice Mode: HTTP POST stream to dedicated container (e.g., http://pdf-wkhtmltopdf:8082/render)
 * 2. Standalone / Local CLI Mode: Directly invokes native wkhtmltopdf binary or PATH executable.
 *
 * ZERO PDFKit fallback: Always guarantees authentic Qt 4.8.7 WebKit / wkhtmltopdf 0.12.6.1 producer,
 * subpixel CSS positioning, and identical font rasterization.
 */

const ENGINE_DIR = path.resolve(__dirname, '../../');

const DEFAULT_SERVICE_HOST = process.env.PDF_WKHTML_HOST || 'pdf-wkhtmltopdf';
const DEFAULT_SERVICE_PORT = Number.parseInt(process.env.PDF_WKHTML_PORT || '8082', 10);

const { checkMicroserviceHealth, renderViaHttpService } = require('./helpers');

function findWkhtmlBinary() {
    const candidates = [
        path.resolve(ENGINE_DIR, 'bin/wkhtmltox/bin/wkhtmltopdf.exe'),
        path.resolve(ENGINE_DIR, 'assets/bin/wkhtmltox/bin/wkhtmltopdf.exe'),
        path.resolve(process.cwd(), 'libs/pdf-engine/bin/wkhtmltox/bin/wkhtmltopdf.exe'),
        path.resolve(process.cwd(), 'libs/pdf-engine/assets/bin/wkhtmltox/bin/wkhtmltopdf.exe'),
    ];

    for (const cand of candidates) {
        if (fs.existsSync(cand)) {
            return { type: 'native', binPath: cand };
        }
    }

    // Try system PATH
    try {
        const checkCmd = process.platform === 'win32' ? 'where.exe' : '/usr/bin/which';
        const res = spawnSync(checkCmd, ['wkhtmltopdf'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout.trim()) {
            return { type: 'system', binPath: res.stdout.trim().split(/\r?\n/)[0] };
        }
    } catch (e) {}

    // Check docker
    try {
        const dockerCmd = process.platform === 'win32' ? 'docker.exe' : '/usr/bin/docker';
        const dRes = spawnSync(dockerCmd, ['--version'], { encoding: 'utf8' });
        if (dRes.status === 0) {
            return { type: 'docker', binPath: dockerCmd };
        }
    } catch (e) {}

    return null;
}

function getHtmlContent(jsonData) {
    const templateType = (jsonData.template || jsonData.service || '').toLowerCase();
    const isGoRide = templateType.includes('goride');
    return isGoRide ? renderGoRideHtml(jsonData) : renderGoCarHtml(jsonData);
}

function getScratchDir() {
    const scratch = path.join(ENGINE_DIR, 'scratch');
    fs.mkdirSync(scratch, { recursive: true });
    return scratch;
}

/**
 * Generate PDF buffer from Gojek JSON data
 */
async function generateWkhtmlBuffer(jsonData, options = {}) {
    const host = options.host || DEFAULT_SERVICE_HOST;
    const port = options.port || DEFAULT_SERVICE_PORT;
    const dpi = options.dpi || '600';
    const htmlContent = getHtmlContent(jsonData);

    // 1. Try Microservice HTTP stream first
    const isServiceAvailable = await checkMicroserviceHealth(host, port, 400);
    if (isServiceAvailable) {
        return await renderViaHttpService(host, port, { html: htmlContent, dpi: String(dpi) });
    }

    // 2. Fallback to Local CLI runner
    const scratchDir = getScratchDir();
    const tempPrefix = `wk_${Date.now()}_${crypto.randomUUID()}`;
    const tempHtmlPath = path.join(scratchDir, `${tempPrefix}.html`);
    const tempPdfPath = path.join(scratchDir, `${tempPrefix}.pdf`);

    try {
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        const runner = findWkhtmlBinary();
        if (!runner) {
            throw new Error('[PDF Engine Error] wkhtmltopdf is mandatory for Gojek receipt generation, but neither the HTTP microservice nor local executable was found. Fallback to PDFKit is strictly disabled. Please ensure wkhtmltopdf 0.12.6.1 is installed or container is running.');
        }

        if (runner.type === 'native' || runner.type === 'system') {
            const args = [
                '-s', 'A4',
                '-T', '0',
                '-B', '0',
                '-L', '0',
                '-R', '0',
                '--dpi', dpi,
                '--enable-local-file-access',
                tempHtmlPath,
                tempPdfPath
            ];
            const res = spawnSync(runner.binPath, args, { encoding: 'utf8' });
            if (res.status !== 0) {
                throw new Error(`wkhtmltopdf failed (exit ${res.status}): ${res.stderr || res.stdout}`);
            }
        } else {
            // Docker fallback
            const relOutputPath = `scratch/${tempPrefix}.pdf`;
            const relInputHtml = `scratch/${tempPrefix}.html`;
            const dockerArgs = [
                'run', '--rm',
                '-v', `${ENGINE_DIR}:/app`,
                '-w', '/app',
                options.dockerImage || 'wkhtmltopdf:0.12.6.1',
                '-s', 'A4',
                '-T', '0',
                '-B', '0',
                '-L', '0',
                '-R', '0',
                '--dpi', dpi,
                relInputHtml,
                relOutputPath
            ];
            const res = spawnSync(runner.binPath, dockerArgs, { encoding: 'utf8' });
            if (res.status !== 0) {
                throw new Error(`wkhtmltopdf docker failed (exit ${res.status}): ${res.stderr || res.stdout}`);
            }
        }

        if (!fs.existsSync(tempPdfPath)) {
            throw new Error('wkhtmltopdf finished but output PDF was not produced.');
        }

        return fs.readFileSync(tempPdfPath);
    } finally {
        try {
            if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        } catch (e) {}
        try {
            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        } catch (e) {}
    }
}

/**
 * Generate PDF file from Gojek JSON data
 */
async function generateWkhtmlPdf(jsonData, outputPdfPath, options = {}) {
    const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

    const host = options.host || DEFAULT_SERVICE_HOST;
    const port = options.port || DEFAULT_SERVICE_PORT;

    // Check if microservice is running
    const isServiceAvailable = await checkMicroserviceHealth(host, port, 400);
    if (isServiceAvailable) {
        const buffer = await renderViaMicroservice(host, port, getHtmlContent(jsonData), options.dpi || '600');
        fs.writeFileSync(resolvedOut, buffer);
        return resolvedOut;
    }

    // Otherwise use local buffer generation
    const buffer = await generateWkhtmlBuffer(jsonData, options);
    fs.writeFileSync(resolvedOut, buffer);
    return resolvedOut;
}

module.exports = {
    getHtmlContent,
    generateWkhtmlPdf,
    generateWkhtmlBuffer,
    findWkhtmlBinary,
    checkMicroserviceHealth
};
