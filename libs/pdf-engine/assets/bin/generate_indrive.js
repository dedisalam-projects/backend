#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateIndrivePdf, render } = require('../src/templates/indrive/renderer');

/**
 * bin/generate_indrive.js - Dedicated CLI Wrapper for inDrive Receipts
 */

async function main() {
    const inputArg = process.argv[2];
    const outputArg = process.argv[3];

    if (!inputArg) {
        console.log('Usage: node bin/generate_indrive.js <template.json> [output.pdf]');
        process.exit(1);
    }

    const templatePath = path.resolve(process.cwd(), inputArg);
    if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(templatePath, 'utf8');
    const templateData = JSON.parse(rawData);

    const service = templateData.service || 'indrive-mobil';
    const defaultOutput = `output_${service}.pdf`;
    const outputPath = path.resolve(process.cwd(), outputArg || defaultOutput);

    console.log(`[inDrive Generator] Service: ${service.toUpperCase()}`);
    console.log(`[inDrive Generator] Input:   ${templatePath}`);
    console.log(`[inDrive Generator] Output:  ${outputPath}`);

    const startTime = Date.now();
    await generateIndrivePdf(templateData, outputPath);
    const duration = Date.now() - startTime;

    const stats = fs.statSync(outputPath);
    console.log(`[inDrive Generator] Status:  SUCCESS (${duration}ms)`);
    console.log(`[inDrive Generator] Size:    ${stats.size} bytes`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('[inDrive Generator] Error:', err);
        process.exit(1);
    });
}

module.exports = {
    generateIndrivePdf,
    render
};
