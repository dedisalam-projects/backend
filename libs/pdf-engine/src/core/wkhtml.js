const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { renderGoCarHtml } = require('../templates/html/gocar');
const { renderGoRideHtml } = require('../templates/html/goride');

/**
 * src/core/wkhtml.js - HTML/WebKit Multi-Platform Execution Engine
 *
 * Renders high-fidelity HTML templates and invokes wkhtmltopdf
 * via native binary (fastest), system PATH, or Docker container with automatic resource cleanup.
 */

const ENGINE_DIR = path.resolve(__dirname, '../../');

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
        const checkCmd = process.platform === 'win32' ? 'where' : 'which';
        const res = spawnSync(checkCmd, ['wkhtmltopdf'], { encoding: 'utf8' });
        if (res.status === 0 && res.stdout.trim()) {
            return { type: 'system', binPath: res.stdout.trim().split(/\r?\n/)[0] };
        }
    } catch (e) {}

    // Check docker
    try {
        const dRes = spawnSync('docker', ['--version'], { encoding: 'utf8' });
        if (dRes.status === 0) {
            return { type: 'docker', binPath: 'docker' };
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

async function generateWkhtmlPdf(jsonData, outputPdfPath, options = {}) {
    const scratchDir = getScratchDir();
    const tempHtmlName = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}.html`;
    const tempHtmlPath = path.join(scratchDir, tempHtmlName);

    try {
        const htmlContent = getHtmlContent(jsonData);
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
        fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

        const runner = findWkhtmlBinary();
        if (!runner) {
            throw new Error('[PDF Engine Error] wkhtmltopdf is mandatory for Gojek receipt generation, but no executable was found in PATH, libs/pdf-engine/bin, or Docker. Fallback to PDFKit is strictly disabled. Please ensure wkhtmltopdf 0.12.6.1 is installed.');
        }

        const dpi = options.dpi || '600';
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
                resolvedOut
            ];
            const res = spawnSync(runner.binPath, args, { encoding: 'utf8' });
            if (res.status !== 0) {
                throw new Error(`wkhtmltopdf failed (exit ${res.status}): ${res.stderr || res.stdout}`);
            }
        } else {
            // Docker fallback
            const relOutputPath = path.relative(ENGINE_DIR, resolvedOut).replace(/\\/g, '/');
            const relInputHtml = `scratch/${tempHtmlName}`;
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
            const res = spawnSync('docker', dockerArgs, { encoding: 'utf8' });
            if (res.status !== 0) {
                throw new Error(`wkhtmltopdf docker failed (exit ${res.status}): ${res.stderr || res.stdout}`);
            }
        }

        return resolvedOut;
    } finally {
        try {
            if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        } catch (e) {}
    }
}

async function generateWkhtmlBuffer(jsonData, options = {}) {
    const scratchDir = getScratchDir();
    const tempPrefix = `wk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempHtmlPath = path.join(scratchDir, `${tempPrefix}.html`);
    const tempPdfPath = path.join(scratchDir, `${tempPrefix}.pdf`);

    try {
        const htmlContent = getHtmlContent(jsonData);
        fs.writeFileSync(tempHtmlPath, htmlContent, 'utf8');

        const runner = findWkhtmlBinary();
        if (!runner) {
            throw new Error('[PDF Engine Error] wkhtmltopdf is mandatory for Gojek receipt generation, but no executable was found in PATH, libs/pdf-engine/bin, or Docker. Fallback to PDFKit is strictly disabled. Please ensure wkhtmltopdf 0.12.6.1 is installed.');
        }

        const dpi = options.dpi || '600';
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
            const res = spawnSync('docker', dockerArgs, { encoding: 'utf8' });
            if (res.status !== 0) {
                throw new Error(`wkhtmltopdf docker failed (exit ${res.status}): ${res.stderr || res.stdout}`);
            }
        }

        if (!fs.existsSync(tempPdfPath)) {
            throw new Error('wkhtmltopdf finished but output PDF was not produced.');
        }

        const buffer = fs.readFileSync(tempPdfPath);
        return buffer;
    } finally {
        try {
            if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
        } catch (e) {}
        try {
            if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        } catch (e) {}
    }
}

module.exports = {
    getHtmlContent,
    generateWkhtmlPdf,
    generateWkhtmlBuffer,
    findWkhtmlBinary
};
