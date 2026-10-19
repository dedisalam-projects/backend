const PDFDocument = require('pdfkit');
const { INDRIVE_CANVAS: DIMENSIONS } = require('../../core/canvas');
const { generatePdfFromDocument } = require('../../core/stream');
const { normalizeIndriveData, isIndrivePayload } = require('../../normalizers/indrive');
const { renderIndriveReceipt } = require('./receipt');

/**
 * templates/indrive/renderer.js - Central Dispatcher for inDrive PDFs
 */

function render(doc, rawData) {
    const data = normalizeIndriveData(rawData);
    renderIndriveReceipt(doc, data);
}

async function generateIndrivePdf(rawData, outputPath) {
    return generatePdfFromDocument(PDFDocument, DIMENSIONS, render, rawData, outputPath);
}

module.exports = {
    isIndrivePayload,
    render,
    generateIndrivePdf
};
