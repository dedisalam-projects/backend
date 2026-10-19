#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateTravelokaPdf, determineService, render } = require('../src/templates/traveloka/renderer');

/**
 * bin/generate_traveloka.js - Dedicated CLI Wrapper for Traveloka Receipts
 */

async function main() {
    const inputArg = process.argv[2];
    const outputArg = process.argv[3];

    if (!inputArg) {
        console.log('Usage: node bin/generate_traveloka.js <template.json> [output.pdf]');
        process.exit(1);
    }

    const templatePath = path.resolve(process.cwd(), inputArg);
    if (!fs.existsSync(templatePath)) {
        console.error(`Error: Template file not found: ${templatePath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(templatePath, 'utf8');
    const templateData = JSON.parse(rawData);

    const service = determineService(templateData);
    const defaultOutput = `output_traveloka_${service}.pdf`;
    const outputPath = path.resolve(process.cwd(), outputArg || defaultOutput);

    console.log(`[Traveloka Generator] Service: ${service.toUpperCase()}`);
    console.log(`[Traveloka Generator] Input:   ${templatePath}`);
    console.log(`[Traveloka Generator] Output:  ${outputPath}`);

    const startTime = Date.now();
    await generateTravelokaPdf(templateData, outputPath);
    const duration = Date.now() - startTime;

    const stats = fs.statSync(outputPath);
    console.log(`[Traveloka Generator] Status:  SUCCESS (${duration}ms)`);
    console.log(`[Traveloka Generator] Size:    ${stats.size} bytes`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('[Traveloka Generator] Error:', err);
        process.exit(1);
    });
}

module.exports = {
    generateTravelokaPdf,
    determineService,
    render
};
