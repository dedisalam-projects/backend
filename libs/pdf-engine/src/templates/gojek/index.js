const { drawHR } = require('../../helpers');

/**
 * templates/gojek/index.js - Shared Library for Gojek Templates
 *
 * Provides shared design tokens, section defaults, and reusable drawing
 * primitives (cards, headers, boxes, divider lines, and link underlines)
 * used across all Gojek service templates (GoCar, GoRide, etc.).
 */

const SECTION_DEFAULTS = {
    header: {
        color: '#ffffff',
        align: 'right',
        anchor: 467.0
    },
    payment_rows: {
        left_anchor: 135.66,
        right_anchor: 459.16
    },
    footer_links: {
        color: '#0000ee'
    },
    disclaimer: {
        align: 'center',
        anchor: 297.5
    },
    social: {
        align: 'center',
        anchor: 297.5
    }
};

/**
 * Draw A4 Canvas Background & Main Receipt Card Container
 */
function drawCanvasAndCard(doc, pageHeight, cardHeight, headerHeight) {
    // Canvas background
    doc.rect(0.0, 0.0, 594.96, pageHeight).fill('#fafafa');
    // White receipt card
    doc.rect(117.42, 0.0, 360.03, cardHeight).fill('#ffffff');
    // Green header bar
    doc.rect(117.42, 0.0, 360.03, headerHeight).fill('#00880d');
}

/**
 * Draw Total Box Container with 4-side borders
 */
function drawTotalBox(doc, y, h) {
    doc.rect(171.37, y, 252.02, h).fill('#fafafa');
    doc.rect(171.37, y, 252.02, 0.57).fill('#e8e8e8');
    doc.rect(171.37, y + h - 0.58, 252.02, 0.58).fill('#e8e8e8');
    doc.rect(171.37, y, 0.58, h).fill('#e8e8e8');
    doc.rect(422.82, y, 0.57, h).fill('#e8e8e8');
}

/**
 * Draw Section Card Outer Border (Payment / Trip detail)
 */
function drawSectionBox(doc, y, h) {
    doc.rect(124.62, y, 345.63, 0.58).fill('#e8e8e8');
    doc.rect(124.62, y + h, 345.63, 0.58).fill('#e8e8e8');
    doc.rect(124.62, y, 0.58, h).fill('#e8e8e8');
    doc.rect(469.67, y, 0.58, h).fill('#e8e8e8');
}

/**
 * Draw Invoice Table Box for Page 2
 */
function drawInvoiceBox(doc, y, h) {
    doc.rect(124.43, y, 345.62, 0.57).fill('#e8e8e8');
    doc.rect(124.43, y + h - 0.58, 345.62, 0.58).fill('#e8e8e8');
    doc.rect(124.43, y, 0.57, h).fill('#e8e8e8');
    doc.rect(469.48, y, 0.57, h).fill('#e8e8e8');
}

/**
 * Draw Invoice Divider HR for Page 2
 */
function drawInvoiceHR(doc, x, y, w) {
    doc.rect(x, y, w, 0.58).fill('#9a9a9a');
    doc.rect(x, y + 0.58, w, 0.57).fill('#eeeeee');
    doc.rect(x, y, 0.57, 1.15).fill('#9a9a9a');
    doc.rect(x + w - 0.57, y, 0.57, 1.15).fill('#eeeeee');
}

/**
 * Draw Underline strokes for links
 */
function drawLinkUnderlines(doc, lines) {
    doc.lineWidth(0.1).strokeColor('#0000ee');
    lines.forEach(([x1, y1, x2, y2]) => {
        doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
    });
}

/**
 * Standard Gojek URLs
 */
const GOJEK_URLS = {
    help: 'https://gojek.link/gocore/help',
    report: 'https://gojek.link/gocore/help/article/a8905486-95ef-4e98-9d18-efa8fa6a63ae',
    feeInfo: 'https://gojek.link/gocore/help/articlegroup/01e5c230-5861-459d-a71f-fd37fb56bf67',
    instagram: 'https://www.instagram.com/gojekindonesia/',
    twitter: 'https://twitter.com/gojekindonesia',
    facebook: 'https://www.facebook.com/gojekindonesia',
    youtube: 'https://www.youtube.com/channel/UCmlKSK0OKn_B3oPwElW4n5w',
    linkedin: 'https://www.linkedin.com/company/gojek/'
};

/**
 * Draw 5 standard social media link hitboxes
 */
function drawSocialLinks(doc, y, h) {
    const socials = [
        { x: 217.44, url: GOJEK_URLS.instagram },
        { x: 253.20, url: GOJEK_URLS.twitter },
        { x: 288.96, url: GOJEK_URLS.facebook },
        { x: 324.72, url: GOJEK_URLS.youtube },
        { x: 360.48, url: GOJEK_URLS.linkedin }
    ];
    socials.forEach(s => {
        doc.link(s.x, y, 16.8, h, s.url);
    });
}

module.exports = {
    SECTION_DEFAULTS,
    GOJEK_URLS,
    drawCanvasAndCard,
    drawTotalBox,
    drawSectionBox,
    drawInvoiceBox,
    drawInvoiceHR,
    drawHR,
    drawLinkUnderlines,
    drawSocialLinks
};
