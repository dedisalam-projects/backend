const PDFDocument = require('pdfkit');
const { JACKAL_CANVAS: DIMENSIONS } = require('../../core/canvas');
const { writePdfToFile, writePdfToBuffer } = require('../../core/stream');
const { normalizeJackalData, isJackalPayload } = require('../../normalizers/jackal');
const { renderJackalTicket } = require('./ticket');

/**
 * templates/jackal/renderer.js - Central Dispatcher for Jackal Holidays PDFs
 *
 * Normalizes input schemas and renders pixel-perfect multi-page Jackal E-Tickets.
 * Uses robust stream pipeline for zero memory leak generation.
 */

/**
 * Render data onto an existing PDFDocument instance
 * @param {PDFDocument} doc
 * @param {Object} rawData
 * @returns {Promise<void>}
 */
async function render(doc, rawData) {
    const data = normalizeJackalData(rawData);
    await renderJackalTicket(doc, data);
}

/**
 * High-level generation function: creates PDFDocument, renders, and returns file or Buffer
 * @param {Object} rawData - Template JSON data
 * @param {string} [outputPath] - Output file path. If omitted, returns Buffer.
 * @returns {Promise<string|Buffer>}
 */
async function generateJackalPdf(rawData, outputPath) {
    const doc = new PDFDocument({
        size: [DIMENSIONS.width, DIMENSIONS.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true
    });

    if (!outputPath) {
        const bufferPromise = writePdfToBuffer(doc);
        await render(doc, rawData);
        doc.end();
        return bufferPromise;
    }

    const writePromise = writePdfToFile(doc, outputPath);
    await render(doc, rawData);
    doc.end();

    return writePromise;
}

module.exports = {
    isJackalPayload,
    render,
    generateJackalPdf
};

