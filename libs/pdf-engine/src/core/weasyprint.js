const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('node:crypto');
const { spawnSync } = require('child_process');
const { renderIndriveHtml } = require('../templates/html/indrive');

/**
 * src/core/weasyprint.js - WeasyPrint 68.1 Multi-Platform Execution Engine
 *
 * Implements dual-mode execution for inDrive receipts:
 * 1. Microservice Mode: HTTP POST stream to dedicated container (e.g., http://pdf-weasyprint:8083/render)
 * 2. Standalone / Local CLI Mode: Directly invokes weasyprint CLI or python -m weasyprint.
 *
 * ZERO PDFKit fallback: Always guarantees authentic WeasyPrint 68.1 producer,
 * PDF 1.7 specification, and Noto Sans TrueType font subsets.
 */

const ENGINE_DIR = path.resolve(__dirname, '../../');

const DEFAULT_SERVICE_HOST = process.env.PDF_WEASYPRINT_HOST || 'pdf-weasyprint';
const DEFAULT_SERVICE_PORT = Number.parseInt(process.env.PDF_WEASYPRINT_PORT || '8083', 10);

const { checkMicroserviceHealth, renderViaHttpService } = require('./helpers');

function findWeasyprintBinary() {
    // 1. Try weasyprint CLI
    const checkCmd = process.platform === 'win32' ? 'where.exe' : '/usr/bin/which';
    try {
        const res = spawnSync(checkCmd, ['weasyprint'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout.trim()) {
            return { type: 'cli', binPath: res.stdout.trim().split(/\r?\n/)[0] };
        }
    } catch (e) {}

    // 2. Try python -m weasyprint
    try {
        const pythonCmd = process.platform === 'win32' ? 'python.exe' : '/usr/bin/python3';
        const pyRes = spawnSync(pythonCmd, ['-m', 'weasyprint', '--version'], { encoding: 'utf8' });
        if (pyRes.status === 0) {
            return { type: 'python', binPath: pythonCmd };
        }
    } catch (e) {}

    return null;
}

function getScratchDir() {
    const scratch = path.join(ENGINE_DIR, 'scratch');
    fs.mkdirSync(scratch, { recursive: true });
    return scratch;
}

/**
 * Generate PDF buffer from inDrive JSON data
 */
async function generateWeasyprintBuffer(jsonData, options = {}) {
    const host = options.host || DEFAULT_SERVICE_HOST;
    const port = options.port || DEFAULT_SERVICE_PORT;
    const htmlContent = renderIndriveHtml(jsonData);

    // 1. Try Microservice HTTP stream first
    const isServiceAvailable = await checkMicroserviceHealth(host, port, 400);
    if (isServiceAvailable) {
        return await renderViaHttpService(host, port, { html: htmlContent });
    }

    // 2. Fallback to Local CLI runner
    const scratchDir = getScratchDir();
    const tempPrefix = `weasy_${Date.now()}_${crypto.randomUUID()}`;
    const tempHtmlPath = path.join(scratchDir, `${tempPrefix}.html`);
    const tempPdfPath = path.join(scratchDir, `${tempPrefix}.pdf`);

    try {
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        const runner = findWeasyprintBinary();
        if (!runner) {
            throw new Error('[PDF Engine Error] WeasyPrint 68.1 is mandatory for inDrive receipt generation, but neither the HTTP microservice nor local executable was found. Fallback to PDFKit is strictly disabled. Please ensure WeasyPrint container is running or installed.');
        }

        let res;
        if (runner.type === 'cli') {
            res = spawnSync(runner.binPath, [tempHtmlPath, tempPdfPath], { encoding: 'utf8' });
        } else {
            res = spawnSync(runner.binPath, ['-m', 'weasyprint', tempHtmlPath, tempPdfPath], { encoding: 'utf8' });
        }

        if (res.status !== 0) {
            throw new Error(`WeasyPrint failed (exit ${res.status}): ${res.stderr || res.stdout}`);
        }

        if (!fs.existsSync(tempPdfPath)) {
            throw new Error('WeasyPrint finished but output PDF was not produced.');
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
 * Generate PDF file from inDrive JSON data
 */
async function generateWeasyprintPdf(jsonData, outputPdfPath, options = {}) {
    const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

    const host = options.host || DEFAULT_SERVICE_HOST;
    const port = options.port || DEFAULT_SERVICE_PORT;

    const isServiceAvailable = await checkMicroserviceHealth(host, port, 400);
    if (isServiceAvailable) {
        const buffer = await renderViaMicroservice(host, port, renderIndriveHtml(jsonData));
        fs.writeFileSync(resolvedOut, buffer);
        return resolvedOut;
    }

    const buffer = await generateWeasyprintBuffer(jsonData, options);
    fs.writeFileSync(resolvedOut, buffer);
    return resolvedOut;
}

module.exports = {
    generateWeasyprintPdf,
    generateWeasyprintBuffer,
    findWeasyprintBinary,
    checkMicroserviceHealth
};
