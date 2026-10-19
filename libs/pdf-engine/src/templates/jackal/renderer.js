const PDFDocument = require('pdfkit');
const { JACKAL_CANVAS: DIMENSIONS } = require('../../core/canvas');
const { generatePdfFromDocument } = require('../../core/stream');
const { normalizeJackalData, isJackalPayload } = require('../../normalizers/jackal');
const { renderJackalTicket } = require('./ticket');

/**
 * templates/jackal/renderer.js - Central Dispatcher for Jackal Holidays PDFs
 */

async function render(doc, rawData) {
    const data = normalizeJackalData(rawData);
    await renderJackalTicket(doc, data);
}

async function generateJackalPdf(rawData, outputPath) {
    return generatePdfFromDocument(PDFDocument, DIMENSIONS, render, rawData, outputPath);
}

module.exports = {
    isJackalPayload,
    render,
    generateJackalPdf
};
