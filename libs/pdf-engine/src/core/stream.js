const fs = require('fs');

/**
 * src/core/stream.js - Safe Stream Pipeline & Memory Management
 *
 * Implements zero-leak stream writing for PDFKit documents.
 * Listens to both write stream errors and document generation errors,
 * ensuring promises reject safely and file handles are freed.
 */

/**
 * Pipe PDFDocument to an output file safely
 * @param {PDFDocument} doc - PDFKit document instance
 * @param {string} outputPath - Destination file path
 * @returns {Promise<string>} - Resolves with outputPath on success
 */
function writePdfToFile(doc, outputPath) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const stream = fs.createWriteStream(outputPath);

        const onError = (err, context) => {
            if (settled) return;
            settled = true;
            try { stream.destroy(); } catch (e) {}
            try { doc.end(); } catch (e) {}
            reject(new Error(`[${context}] Error creating ${outputPath}: ${err.message || err}`));
        };

        stream.on('finish', () => {
            if (settled) return;
            settled = true;
            resolve(outputPath);
        });

        stream.on('error', (err) => onError(err, 'WriteStream'));
        doc.on('error', (err) => onError(err, 'PDFDocument'));

        doc.pipe(stream);
    });
}

/**
 * Collect PDFDocument data into an in-memory Buffer safely
 * @param {PDFDocument} doc - PDFKit document instance
 * @returns {Promise<Buffer>} - Resolves with Buffer on completion
 */
function writePdfToBuffer(doc) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const chunks = [];

        const onError = (err, context) => {
            if (settled) return;
            settled = true;
            try { doc.end(); } catch (e) {}
            reject(new Error(`[${context}] Error writing PDF to buffer: ${err.message || err}`));
        };

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks));
        });

        doc.on('error', (err) => onError(err, 'PDFDocument'));
    });
}

/**
 * High-level generation pipeline: creates PDFDocument, executes renderFn (sync or async),
 * and safely pipes to output file or resolves to in-memory Buffer.
 * @param {typeof import('pdfkit')} PDFDocument
 * @param {{ width: number, height: number }} dimensions
 * @param {(doc: any, data: any) => void|Promise<void>} renderFn
 * @param {any} rawData
 * @param {string} [outputPath]
 * @returns {Promise<string|Buffer>}
 */
async function generatePdfFromDocument(PDFDocument, dimensions, renderFn, rawData, outputPath) {
    const doc = new PDFDocument({
        size: [dimensions.width, dimensions.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true
    });

    if (!outputPath) {
        const bufferPromise = writePdfToBuffer(doc);
        await renderFn(doc, rawData);
        doc.end();
        return bufferPromise;
    }

    const writePromise = writePdfToFile(doc, outputPath);
    await renderFn(doc, rawData);
    doc.end();
    return writePromise;
}

module.exports = {
    writePdfToFile,
    writePdfToBuffer,
    generatePdfFromDocument
};
