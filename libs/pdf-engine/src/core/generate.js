#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateTravelokaPdf, determineService: determineTravelokaService } = require('../templates/traveloka/renderer');
const { generateGojekPdf } = require('../templates/gojek/renderer');
const { generateIndrivePdf, isIndrivePayload } = require('../templates/indrive');
const { generateJackalPdf, isJackalPayload } = require('../templates/jackal');
const { generateWkhtmlPdf, generateWkhtmlBuffer } = require('./wkhtml');
const { isGojekPayload } = require('../normalizers/gojek');

/**
 * generate.js - Unified CLI & Master Dispatcher
 *
 * Automatically inspects input JSON payloads, detects whether the document
 * is a Traveloka, Gojek, inDrive, or Jackal Holidays receipt/ticket, and routes
 * to the appropriate high-fidelity rendering engine with zero memory leak.
 */

function printUsage() {
    console.log(`
Unified PDF Receipt Generator
==============================
Usage:
    node generate.js <input.json> [output.pdf] [options]

Supported Document Types:
    - Traveloka (Tiket Bus & Shuttle, Hotel / Akomodasi)
    - Gojek (GoCar, GoCar Hemat, GoRide, GoRide Comfort, GoRide Hemat)
    - inDrive (inDrive Mobil, inDrive Motor)
    - Jackal Holidays (Jackal Shuttle E-Ticket)

Options:
    --engine=pdfkit|wkhtmltopdf   Specify rendering engine for Gojek (default: pdfkit)
    -h, --help                    Show this help guide

Examples:
    node generate.js datasets/templates/traveloka_bus_sample.json
    node generate.js datasets/templates/indrive_sample.json
    node generate.js datasets/templates/jackal_sample.json
    node generate.js datasets/templates/gocar_202509231916.json
`);
}


/**
 * Detect whether payload belongs to Traveloka schema
 * @param {Object} data
 * @returns {boolean}
 */
function isTravelokaPayload(data) {
    if (!data || typeof data !== 'object') return false;
    if (isIndrivePayload(data) || isJackalPayload(data)) return false;
    if (data.receipt_no || data.po_number || data.hotel || data.has_data_penumpang) return true;
    const cat = (data.category || data.service || data.type || '').toLowerCase();
    if (cat.includes('bus') || cat.includes('hotel') || cat.includes('shuttle') || cat.includes('akomodasi')) return true;
    if (data.company && (data.company.nama || '').toLowerCase().includes('trinusa')) return true;
    return false;
}

/**
 * Universal generation function: takes either raw object or JSON file path
 * @param {Object|string} input - Payload object or path to JSON file
 * @param {string} [outputPath] - Destination PDF path
 * @param {Object} [options] - Options (e.g. engine: 'pdfkit'|'wkhtmltopdf')
 * @returns {Promise<{ outputPath: string, docType: string, duration: number, size: number }>}
 */
async function generate(input, outputPath, options = {}) {
    let payload;
    let inputLabel;

    if (typeof input === 'string') {
        const resolvedPath = path.resolve(process.cwd(), input);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Input file not found: ${resolvedPath}`);
        }
        inputLabel = resolvedPath;
        payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } else if (typeof input === 'object' && input !== null) {
        inputLabel = 'In-Memory Payload';
        payload = input;
    } else {
        throw new Error('Invalid input: Expected JSON file path or object payload.');
    }

    const isIndrive = isIndrivePayload(payload);
    const isJackal = isJackalPayload(payload);
    const isTraveloka = isTravelokaPayload(payload);
    const isGojek = isGojekPayload(payload);

    let docType = 'unknown';
    let targetOut = outputPath;
    let generatorFn = null;

    if (isIndrive) {
        const service = payload.service || 'indrive-mobil';
        docType = `INDRIVE (${service.toUpperCase()})`;
        if (!targetOut) {
            targetOut = `output_${service}.pdf`;
        }
        const finalPath = path.resolve(process.cwd(), targetOut);
        generatorFn = () => generateIndrivePdf(payload, finalPath);
        targetOut = finalPath;
    } else if (isJackal) {
        const service = payload.service || 'jackal-shuttle';
        docType = `JACKAL HOLIDAYS (${service.toUpperCase()})`;
        if (!targetOut) {
            targetOut = `output_${service}.pdf`;
        }
        const finalPath = path.resolve(process.cwd(), targetOut);
        generatorFn = () => generateJackalPdf(payload, finalPath);
        targetOut = finalPath;
    } else if (isTraveloka) {
        const service = determineTravelokaService(payload);
        docType = `TRAVELOKA (${service.toUpperCase()})`;
        if (!targetOut) {
            targetOut = `output_traveloka_${service}.pdf`;
        }
        const finalPath = path.resolve(process.cwd(), targetOut);
        generatorFn = () => generateTravelokaPdf(payload, finalPath);
        targetOut = finalPath;
    } else if (isGojek || Array.isArray(payload) || (payload && payload.sections)) {
        const templateName = (payload && payload.template) || (Array.isArray(payload) && payload[0] && payload[0].template) || 'gojek';
        docType = `GOJEK (${templateName.toUpperCase()})`;
        if (!targetOut) {
            targetOut = `output_${templateName}.pdf`;
        }
        const finalPath = path.resolve(process.cwd(), targetOut);

        const engine = (options.engine || '').toLowerCase();
        if (engine === 'wkhtmltopdf' || engine === 'wkhtml' || engine === 'docker') {
            generatorFn = () => generateWkhtmlPdf(payload, finalPath, options);
        } else {
            generatorFn = () => generateGojekPdf(payload, finalPath);
        }
        targetOut = finalPath;
    } else {
        throw new Error('Unrecognized document schema: Could not detect Traveloka, Gojek, inDrive, or Jackal properties.');
    }


    const startTime = Date.now();
    await generatorFn();
    const duration = Date.now() - startTime;
    const stats = fs.statSync(targetOut);

    return {
        outputPath: targetOut,
        docType,
        duration,
        size: stats.size,
        inputLabel
    };
}

async function main() {
    const rawArgs = process.argv.slice(2);
    if (rawArgs.length === 0 || rawArgs.includes('-h') || rawArgs.includes('--help')) {
        printUsage();
        process.exit(0);
    }

    const options = {};
    const positionalArgs = [];

    rawArgs.forEach(arg => {
        if (arg.startsWith('--engine=')) {
            options.engine = arg.split('=')[1];
        } else if (!arg.startsWith('-')) {
            positionalArgs.push(arg);
        }
    });

    const inputArg = positionalArgs[0];
    const outputArg = positionalArgs[1];

    try {
        console.log(`=======================================================`);
        console.log(`[Unified Generator] Starting generation pipeline...`);

        const result = await generate(inputArg, outputArg, options);

        console.log(`[Unified Generator] Type:     ${result.docType}`);
        console.log(`[Unified Generator] Input:    ${result.inputLabel}`);
        console.log(`[Unified Generator] Output:   ${result.outputPath}`);
        console.log(`[Unified Generator] Status:   SUCCESS (${result.duration}ms)`);
        console.log(`[Unified Generator] File Size: ${result.size} bytes`);
        console.log(`=======================================================`);
    } catch (err) {
        console.error(`\n[Unified Generator] Error: ${err.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

/**
 * Universal in-memory buffer generation: generates PDF Buffer directly without disk writes
 * @param {Object|string} input - Payload object or path to JSON file
 * @param {Object} [options] - Options (e.g. engine: 'pdfkit'|'wkhtmltopdf')
 * @returns {Promise<{ buffer: Buffer, docType: string, duration: number, size: number }>}
 */
async function generateBuffer(input, options = {}) {
    let payload;

    if (typeof input === 'string') {
        const resolvedPath = path.resolve(process.cwd(), input);
        if (!fs.existsSync(resolvedPath)) {
            throw new Error(`Input file not found: ${resolvedPath}`);
        }
        payload = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    } else if (typeof input === 'object' && input !== null) {
        payload = input;
    } else {
        throw new Error('Invalid input: Expected JSON file path or object payload.');
    }

    const isIndrive = isIndrivePayload(payload);
    const isJackal = isJackalPayload(payload);
    const isTraveloka = isTravelokaPayload(payload);
    const isGojek = isGojekPayload(payload);

    let docType = 'unknown';
    let generatorFn = null;

    if (isIndrive) {
        const service = payload.service || 'indrive-mobil';
        docType = `INDRIVE (${service.toUpperCase()})`;
        generatorFn = () => generateIndrivePdf(payload, null);
    } else if (isJackal) {
        const service = payload.service || 'jackal-shuttle';
        docType = `JACKAL HOLIDAYS (${service.toUpperCase()})`;
        generatorFn = () => generateJackalPdf(payload, null);
    } else if (isTraveloka) {
        const service = determineTravelokaService(payload);
        docType = `TRAVELOKA (${service.toUpperCase()})`;
        generatorFn = () => generateTravelokaPdf(payload, null);
    } else if (isGojek || Array.isArray(payload) || (payload && payload.sections)) {
        const templateName = (payload && payload.template) || (Array.isArray(payload) && payload[0] && payload[0].template) || 'gojek';
        docType = `GOJEK (${templateName.toUpperCase()})`;
        const engine = (options.engine || 'wkhtmltopdf').toLowerCase();
        if (engine === 'wkhtmltopdf' || engine === 'wkhtml' || engine === 'docker') {
            generatorFn = async () => {
                try {
                    return await generateWkhtmlBuffer(payload, options);
                } catch (err) {
                    console.warn(`[PDF Engine] Wkhtml failed, falling back to PDFKit: ${err.message}`);
                    return await generateGojekPdf(payload, null);
                }
            };
        } else {
            generatorFn = () => generateGojekPdf(payload, null);
        }
    } else {
        throw new Error('Unrecognized document schema: Could not detect Traveloka, Gojek, inDrive, or Jackal properties.');
    }

    const startTime = Date.now();
    const buffer = await generatorFn();
    const duration = Date.now() - startTime;

    return {
        buffer,
        docType,
        duration,
        size: buffer ? buffer.length : 0
    };
}

module.exports = {
    generate,
    generateBuffer,
    isTravelokaPayload,
    isGojekPayload,
    isIndrivePayload,
    isJackalPayload
};


