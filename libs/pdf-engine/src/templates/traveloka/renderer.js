const PDFDocument = require('pdfkit');
const { TRAVELOKA_CANVAS: DIMENSIONS } = require('../../core/canvas');
const { generatePdfFromDocument } = require('../../core/stream');
const { determineService, normalizeTravelokaData } = require('../../normalizers/traveloka');
const { renderBusReceipt } = require('./bus');
const { renderHotelReceipt } = require('./hotel');

/**
 * templates/traveloka/renderer.js - Central Dispatcher for Traveloka PDFs
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

async function generateTravelokaPdf(rawData, outputPath) {
    return generatePdfFromDocument(PDFDocument, DIMENSIONS, render, rawData, outputPath);
}

module.exports = {
    determineService,
    render,
    generateTravelokaPdf
};
