#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateJackalPdf, render } = require('../src/templates/jackal/renderer');

/**
 * bin/generate_jackal.js - Dedicated CLI Wrapper for Jackal Holidays E-Tickets
 */

async function main() {
    const inputArg = process.argv[2];
    const outputArg = process.argv[3];

    if (!inputArg) {
        console.log('Usage: node bin/generate_jackal.js <template.json> [output.pdf]');
        process.exit(1);
    }

    const templatePath = path.resolve(process.cwd(), inputArg);
    if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(templatePath, 'utf8');
    const templateData = JSON.parse(rawData);

    const service = templateData.service || 'jackal-shuttle';
    const defaultOutput = `output_${service}.pdf`;
    const outputPath = path.resolve(process.cwd(), outputArg || defaultOutput);

    console.log(`[Jackal Holidays Generator] Service: ${service.toUpperCase()}`);
    console.log(`[Jackal Holidays Generator] Input:   ${templatePath}`);
    console.log(`[Jackal Holidays Generator] Output:  ${outputPath}`);

    const startTime = Date.now();
    await generateJackalPdf(templateData, outputPath);
    const duration = Date.now() - startTime;

    const stats = fs.statSync(outputPath);
    console.log(`[Jackal Holidays Generator] Status:  SUCCESS (${duration}ms)`);
    console.log(`[Jackal Holidays Generator] Size:    ${stats.size} bytes`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('[Jackal Holidays Generator] Error:', err);
        process.exit(1);
    });
}

module.exports = {
    generateJackalPdf,
    render
};
