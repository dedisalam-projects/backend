#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateWkhtmlPdf } = require('../src/core/wkhtml');

/**
 * bin/generate_wkhtmltopdf.js - Dedicated CLI Wrapper for WebKit HTML Generator
 */

async function main() {
    const inputArg = process.argv[2] || 'datasets/templates/gocar_202509231916.json';
    const outputArg = process.argv[3] || 'scratch/test_wkhtml.pdf';

    const inputPath = path.resolve(process.cwd(), inputArg);
    if (!fs.existsSync(inputPath)) {
        console.error(`[Error] File ${inputPath} does not exist.`);
        process.exit(1);
    }

    console.log(`[wkhtmltopdf] Generating PDF from: ${inputPath}`);
    const jsonData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    const startTime = Date.now();
    await generateWkhtmlPdf(jsonData, outputArg);
    const duration = Date.now() - startTime;

    console.log(`[wkhtmltopdf] Successfully generated: ${outputArg} (${duration}ms)`);
}

if (require.main === module) {
    main().catch(err => {
        console.error('[wkhtmltopdf] Error:', err.message);
        process.exit(1);
    });
}

module.exports = {
    generateWkhtmlPdf
};
