const PDFDocument = require('pdfkit');
const renderPage = require('./page_renderer');
const { GOJEK_CANVAS } = require('../../core/canvas');
const { registerGojekFonts } = require('../../core/fonts');
const { writePdfToFile, writePdfToBuffer } = require('../../core/stream');
const { normalizeGojekData } = require('../../normalizers/gojek');

/**
 * templates/gojek/renderer.js - Central Dispatcher for Gojek PDFs
 *
 * Normalizes input multi-page schemas, registers standard Gojek typography,
 * and renders high-precision vector layouts with safe stream error handling.
 */

/**
 * Render Gojek page(s) onto an existing PDFDocument
 * @param {PDFDocument} doc
 * @param {Object|Array} rawData
 */
function render(doc, rawData) {
    registerGojekFonts(doc);
    const pages = normalizeGojekData(rawData);
    pages.forEach((pageData, index) => {
        if (index > 0) doc.addPage();
        renderPage(doc, pageData, index);
    });
}

/**
 * High-level generation function: creates PDFDocument, renders, and returns file or Buffer
 * @param {Object|Array} rawData - Template JSON data
 * @param {string} [outputPath] - Destination file path. If omitted, returns Buffer.
 * @returns {Promise<string|Buffer>}
 */
async function generateGojekPdf(rawData, outputPath) {
    const doc = new PDFDocument({
        size: [GOJEK_CANVAS.width, GOJEK_CANVAS.height],
        margins: GOJEK_CANVAS.margins,
        layout: 'portrait'
    });

    if (!outputPath) {
        const bufferPromise = writePdfToBuffer(doc);
        render(doc, rawData);
        doc.end();
        return bufferPromise;
    }

    const writePromise = writePdfToFile(doc, outputPath);
    render(doc, rawData);
    doc.end();

    return writePromise;
}

module.exports = {
    render,
    generateGojekPdf
};

