const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const http = require('node:http');

/**
 * src/core/helpers.js - Shared Formatting, Calculation & Drawing Primitives
 *
 * Centralizes currency formatting, multiline text wrapping, exact tabular alignment,
 * and high-precision vector drawing utilities for all document templates.
 */

let sharedMeasurerDoc = null;
function getSharedMeasurerDoc() {
    if (!sharedMeasurerDoc) {
        sharedMeasurerDoc = new PDFDocument({ autoFirstPage: false });
        const fontsDir = path.resolve(__dirname, '../../fonts');
        const dejavuReg = path.join(fontsDir, 'DejaVuSans.ttf');
        const dejavuBold = path.join(fontsDir, 'DejaVuSans-Bold.ttf');
        try {
            if (fs.existsSync(dejavuReg)) sharedMeasurerDoc.registerFont('DejaVuSans', dejavuReg);
            if (fs.existsSync(dejavuBold)) sharedMeasurerDoc.registerFont('DejaVuSans-Bold', dejavuBold);
        } catch (e) {}
    }
    return sharedMeasurerDoc;
}

/**
 * Format currency or number with Indonesian locale (120.000 or Rp120.000)
 * @param {number|string} val - Number or formatted string
 * @param {boolean} prefix - If true, adds 'Rp' or '-Rp' prefix (Gojek style)
 * @returns {string}
 */
function formatRupiah(val, prefix = false) {
    if (typeof val === 'string') return val.trim();
    if (val == null || Number.isNaN(Number(val))) {
        return prefix ? 'Rp0' : '0';
    }
    if (prefix) {
        if (val < 0) {
            return '-Rp' + Math.abs(val).toLocaleString('id-ID');
        }
        return 'Rp' + val.toLocaleString('id-ID');
    }
    return val.toLocaleString('id-ID');
}

/**
 * Helper to compute exact X coordinate for numbers (matching OpenPDF tabular digit metrics)
 * @param {PDFDocument} doc
 * @param {string} str
 * @param {number} targetRightX
 * @returns {number}
 */
function getAmountX(doc, str, targetRightX) {
    const cleanStr = String(str).trim();
    if (cleanStr.length === 7) {
        // 6 digits + 1 dot (e.g., "120.000", "244.821", "253.000")
        return targetRightX === 482.00 ? 454.91 : 535.69;
    }
    if (cleanStr.length === 6) {
        // 5 digits + 1 dot (e.g., "18.000", "15.000")
        return targetRightX === 482.00 ? 459.08 : 539.85;
    }
    return targetRightX - doc.widthOfString(cleanStr);
}

/**
 * Universal text wrapping utility supporting both PDFKit doc and standalone font/size metrics
 * Signature 1: wrapText(doc, text, maxWidth)
 * Signature 2: wrapText(text, maxWidth, font, size)
 */
function wrapText(arg1, arg2, arg3, arg4) {
    let doc;
    let text;
    let maxWidth;

    if (arg1 && typeof arg1 === 'object' && typeof arg1.widthOfString === 'function') {
        doc = arg1;
        text = arg2;
        maxWidth = arg3;
    } else {
        text = arg1;
        maxWidth = arg2;
        const font = arg3 || 'DejaVuSans';
        const size = arg4 || 8.83;
        doc = getSharedMeasurerDoc();
        doc.font(font).fontSize(size);
    }

    if (!text) return [];
    const words = String(text).split(' ');
    const lines = [];
    let currentLine = '';

    for (const w of words) {
        const testLine = currentLine ? `${currentLine} ${w}` : w;
        if (doc.widthOfString(testLine) <= maxWidth) {
            currentLine = testLine;
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = w;
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

/**
 * Compute dynamic table column positions and grid line dividers
 * based on OpenPDF col1_width
 */
function getTableColumns(data = {}, isHotel = false) {
    const col1W = typeof data.col1_width === 'number' ? data.col1_width : (isHotel ? 20.40 : 19.91);
    const vLine1 = 27.98 + col1W;
    const vLine2 = vLine1 + 80.77;
    return {
        col1W,
        vLine1,
        vLine2,
        colDividers: [28.35, vLine1, vLine2, 351.15, 378.08, 485.78, 566.17],
        no: 32.48,
        jenis: vLine1 + 4.50,
        deskripsi: vLine2 + 4.50,
        jml: 370.13,
        hargaSatuan: 482.00,
        total: 562.80,
        summaryLabel: 382.58,
        summaryVal: 562.80
    };
}

/**
 * Precise horizontal divider with double-stroke shadow
 */
const drawHR = (doc, x, y, w) => {
    doc.rect(x, y, w, 0.57).fill('#9a9a9a');
    doc.rect(x, y + 0.57, w, 0.58).fill('#eeeeee');
    doc.rect(x, y, 0.57, 1.15).fill('#9a9a9a');
    doc.rect(x + w - 0.58, y, 0.58, 1.15).fill('#eeeeee');
};

/**
 * 4-side inner border rectangle
 */
const drawInnerBorder = (doc, x, y, w, h, color) => {
    doc.rect(x, y, w, 0.57).fill(color);
    doc.rect(x, y + h - 0.58, w, 0.58).fill(color);
    doc.rect(x, y, 0.58, h).fill(color);
    doc.rect(x + w - 0.57, y, 0.57, h).fill(color);
};

/**
 * Resolves an image path from multiple candidate directories
 */
const resolveImagePath = (filename) => {
    const ext = path.extname(filename) ? '' : '.png';
    const fileWithExt = `${filename}${ext}`;

    const candidates = [
        path.resolve(__dirname, '../../assets/img', fileWithExt),
        path.resolve(__dirname, '../../img', fileWithExt),
        path.resolve(process.cwd(), 'libs/pdf-engine/assets/img', fileWithExt),
        path.resolve(process.cwd(), 'assets/img', fileWithExt),
        path.resolve(process.cwd(), 'src/assets/img', fileWithExt),
        path.resolve(process.cwd(), '../aset/img', fileWithExt),
        path.resolve(process.cwd(), '../../aset/img', fileWithExt),
        path.resolve(__dirname, '../../../../backend/apps/gateway/src/assets/img', fileWithExt),
        path.resolve(__dirname, '../../../../backend/img', fileWithExt),
        path.resolve(`img/${fileWithExt}`)
    ];

    for (const cand of candidates) {
        if (fs.existsSync(cand)) {
            return cand;
        }
    }
    return `img/${fileWithExt}`;
};

/**
 * Safe image plot with error swallowing and multi-path resolution
 */
const plotImage = (doc, name, x, y, width, height) => {
    try {
        const opts = { width: width };
        if (height) opts.height = height;
        const imgPath = resolveImagePath(name);
        doc.image(imgPath, x, y, opts);
    } catch (e) {
        console.warn(`[PDF Engine] Warning: Could not plot image '${name}':`, e.message);
    }
};

/**
 * High-precision exact text rendering with micro-tracking adjustments
 */
const drawTextExact = (doc, text, x, y, width, size, color, font) => {
    doc.font(font).fontSize(size).fillColor(color);
    const currentWidth = doc.widthOfString(text);
    const options = { lineBreak: false };
    if (width && currentWidth > 0 && text.length > 1) {
        if (Math.abs(width - currentWidth) <= 3.0) {
            options.characterSpacing = (width - currentWidth) / (text.length - 1);
        }
    }
    doc.text(text, x, y, options);
};

/**
 * Ping microservice health endpoint
 */
async function checkMicroserviceHealth(host, port, timeoutMs = 500) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: host,
            port: port,
            path: '/health',
            method: 'GET',
            timeout: timeoutMs
        }, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
            req.destroy();
            resolve(false);
        });
        req.end();
    });
}

/**
 * Render PDF buffer via HTTP microservice
 */
async function renderViaHttpService(host, port, bodyPayload, endpoint = '/render') {
    return new Promise((resolve, reject) => {
        const payloadStr = typeof bodyPayload === 'string' ? bodyPayload : JSON.stringify(bodyPayload);
        const req = http.request({
            hostname: host,
            port: port,
            path: endpoint,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payloadStr)
            }
        }, (res) => {
            if (res.statusCode !== 200) {
                let errBody = '';
                res.on('data', chunk => errBody += chunk);
                res.on('end', () => reject(new Error(`Microservice render failed (HTTP ${res.statusCode}): ${errBody}`)));
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', (err) => reject(new Error(`Microservice request error: ${err.message}`)));
        req.write(payloadStr);
        req.end();
    });
}

module.exports = {
    formatRupiah,
    getAmountX,
    wrapText,
    getTableColumns,
    drawHR,
    drawInnerBorder,
    plotImage,
    drawTextExact,
    checkMicroserviceHealth,
    renderViaHttpService
};
