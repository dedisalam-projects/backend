const fs = require('fs');
const path = require('path');
const { renderJackalHtml } = require('../templates/html/jackal');
const { checkMicroserviceHealth, renderViaHttpService } = require('./helpers');

/**
 * src/core/dompdf.js - dompdf 2.0.3 Multi-Platform Execution Engine
 *
 * Implements execution for Jackal Holidays tickets via microservice stream.
 * ZERO PDFKit fallback: Always guarantees authentic dompdf 2.0.3 + CPDF producer.
 */

const DEFAULT_SERVICE_HOST = process.env.PDF_DOMPDF_HOST || 'pdf-dompdf';
const DEFAULT_SERVICE_PORT = Number.parseInt(process.env.PDF_DOMPDF_PORT || '8084', 10);

/**
 * Generate PDF buffer from Jackal Holidays JSON data
 */
async function generateDompdfBuffer(jsonData, options = {}) {
    const host = options.host || DEFAULT_SERVICE_HOST;
    const port = options.port || DEFAULT_SERVICE_PORT;
    const htmlContent = await renderJackalHtml(jsonData);

    const isServiceAvailable = await checkMicroserviceHealth(host, port, 400);
    if (isServiceAvailable) {
        return await renderViaHttpService(host, port, { html: htmlContent });
    }

    throw new Error('[PDF Engine Error] dompdf 2.0.3 is mandatory for Jackal Holidays ticket generation, but neither the HTTP microservice nor local PHP dompdf was found. Fallback to PDFKit is strictly disabled. Please ensure the pdf-dompdf container is running.');
}

/**
 * Generate PDF file from Jackal Holidays JSON data
 */
async function generateDompdfPdf(jsonData, outputPdfPath, options = {}) {
    const resolvedOut = path.resolve(process.cwd(), outputPdfPath);
    fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });

    const buffer = await generateDompdfBuffer(jsonData, options);
    fs.writeFileSync(resolvedOut, buffer);
    return resolvedOut;
}

module.exports = {
    generateDompdfPdf,
    generateDompdfBuffer,
    checkMicroserviceHealth
};
