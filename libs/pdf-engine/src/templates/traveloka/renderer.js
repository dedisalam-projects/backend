const PDFDocument = require('pdfkit');
const { TRAVELOKA_CANVAS: DIMENSIONS } = require('../../core/canvas');
const { writePdfToFile, writePdfToBuffer } = require('../../core/stream');
const { determineService, normalizeTravelokaData } = require('../../normalizers/traveloka');
const { renderBusReceipt } = require('./bus');
const { renderHotelReceipt } = require('./hotel');

/**
 * templates/traveloka/renderer.js - Central Dispatcher for Traveloka PDFs
 *
 * Normalizes input schemas and routes to the pixel-perfect layout engine (Bus or Hotel).
 * Uses robust stream pipeline for zero memory leak generation.
 */

/**
 * Render data onto an existing PDFDocument instance
 * @param {PDFDocument} doc
 * @param {Object} rawData
 */
function render(doc, rawData) {
    const data = normalizeTravelokaData(rawData);
    const service = determineService(data);
    if (service === 'hotel') {
        renderHotelReceipt(doc, data);
    } else {
        renderBusReceipt(doc, data);
    }
}

/**
 * High-level generation function: creates PDFDocument, renders, and returns file or Buffer
 * @param {Object} rawData - Template JSON data
 * @param {string} [outputPath] - Destination file path. If omitted, returns Buffer.
 * @returns {Promise<string|Buffer>}
 */
async function generateTravelokaPdf(rawData, outputPath) {
    const doc = new PDFDocument({
        size: [DIMENSIONS.width, DIMENSIONS.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true
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
    determineService,
    render,
    generateTravelokaPdf
};

