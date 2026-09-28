#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateGojekPdf } = require('../src/templates/gojek/renderer');

/**
 * bin/generate_gojek.js - Dedicated CLI Wrapper for Gojek Receipts
 */

async function main() {
    const templateArg = process.argv[2] || 'datasets/templates/goride_comfort.json';
    const outputArg = process.argv[3] || 'output_struk.pdf';

    const resolvedTemplate = path.resolve(process.cwd(), templateArg);
    if (!fs.existsSync(resolvedTemplate)) {
        console.error(`[Error] Template file not found: ${resolvedTemplate}`);
        process.exit(1);
    }

    const outputPath = path.resolve(process.cwd(), outputArg);
    const templateData = JSON.parse(fs.readFileSync(resolvedTemplate, 'utf8'));

    console.log(`Generating PDF using template: ${templateArg}`);
    await generateGojekPdf(templateData, outputPath);
    console.log("Selesai!");
}

if (require.main === module) {
    main().catch(err => {
        console.error('[Gojek Generator] Error:', err);
        process.exit(1);
    });
}

module.exports = {
    generateGojekPdf,
    main
};
