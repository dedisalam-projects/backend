const gojek = require('./index');
const { plotImage } = require('../../helpers');

/**
 * templates/gojek/goride.js - Template Layout Engine for GoRide Receipts
 *
 * Uses the shared Gojek library for base primitives while defining
 * specific coordinates and dimensions for GoRide services.
 */

const FONT_FAMILY = 'NimbusSanL';

function drawImages(doc, pageIndex) {
    if (pageIndex === 0) {
        // ── IMAGES HALAMAN 1 ─────────────────────────────────────────────────
        plotImage(doc, 'logo_goride_comfort', 127.88, 10.46,  120.01, 20.93);
        plotImage(doc, 'icon_jarak',          137.39, 396.51,   9.6,   9.6);
        plotImage(doc, 'icon_waktu',          137.39, 411.68,   9.6,   9.6);
        plotImage(doc, 'icon_jemput',         304.63, 359.93,   9.6,   9.6);
        plotImage(doc, 'icon_antar',          304.63, 457.09,   9.6,   9.6);
        plotImage(doc, 'icon_bantuan',        166.67, 571.82,   8.35,  8.35);
        plotImage(doc, 'icon_laporkan',       254.42, 571.82,   8.35,  8.35);
        plotImage(doc, 'icon_tentang',        365.98, 571.82,   8.35,  8.35);
        plotImage(doc, 'icon_ig',             217.46, 680.41,  16.8,  16.8);
        plotImage(doc, 'icon_tw',             253.27, 680.41,  16.8,  16.8);
        plotImage(doc, 'icon_fb',             289.08, 680.41,  16.8,  16.8);
        plotImage(doc, 'icon_yt',             324.89, 680.41,  16.8,  16.8);
        plotImage(doc, 'icon_in',             360.61, 680.41,  16.8,  16.8);
        plotImage(doc, 'logo_gojek',          266.81, 721.5,   61.25, 17.95);
    } else {
        // ── IMAGES HALAMAN 2 ─────────────────────────────────────────────────
        plotImage(doc, 'logo_goride_comfort', 127.88, 10.46,  120.01, 20.93);
    }
}

function drawLinks(doc, pageIndex) {
    if (pageIndex === 0) {
        // Footer Help Links
        doc.link(179.88, 573.60, 32.88,  8.88, gojek.GOJEK_URLS.help);
        doc.link(267.60, 573.60, 72.60,  8.88, gojek.GOJEK_URLS.report);
        doc.link(379.20, 573.60, 64.80, 19.44, gojek.GOJEK_URLS.feeInfo);

        // Social Media Links
        gojek.drawSocialLinks(doc, 690.60, 8.88);
    }
}

function renderLayout(doc, pageData, pageIndex) {
    if (pageIndex === 0) {
        // ── HALAMAN 1 (GoRide) ───────────────────────────────────────────────
        // Canvas (594.96 x 842.08), Card H=543.69, Header H=45.12
        gojek.drawCanvasAndCard(doc, 842.08, 543.69, 45.12);

        // Total Box (y=128.84, h=28.61)
        gojek.drawTotalBox(doc, 128.84, 28.61);

        // Payment Rows Box (y=197.78, h=109.06)
        doc.rect(124.62, 197.78, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, 306.26, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, 197.78, 0.58, 109.06).fill('#e8e8e8');
        doc.rect(469.67, 197.78, 0.58, 109.06).fill('#e8e8e8');
        gojek.drawHR(doc, 135.66, 251.73, 323.55);

        // Trip Detail Box (y=347.16, h=186.93)
        doc.rect(124.62, 347.16, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, 533.52, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, 347.16, 0.58, 186.93).fill('#e8e8e8');
        doc.rect(469.67, 347.16, 0.58, 186.93).fill('#e8e8e8');

        // Link Underlines
        gojek.drawLinkUnderlines(doc, [
            [179.92, 580.32, 212.85, 580.32],
            [267.67, 580.32, 340.35, 580.32],
            [379.23, 580.32, 444.04, 580.32],
            [389.31, 590.88, 420.71, 590.88]
        ]);
    } else {
        // ── HALAMAN 2 (Faktur Pajak GoRide) ──────────────────────────────────
        // Canvas (594.96 x 239.83), Card H=182.32, Header H=45.12
        gojek.drawCanvasAndCard(doc, 239.83, 182.32, 45.12);

        // Invoice Box (y=102.25, h=70.47)
        gojek.drawInvoiceBox(doc, 102.25, 70.47);
        gojek.drawHR(doc, 135.47, 143.34, 323.55);
    }

    drawImages(doc, pageIndex);
    drawLinks(doc, pageIndex);
}

module.exports = {
    FONT_FAMILY,
    SECTION_DEFAULTS: gojek.SECTION_DEFAULTS,
    renderLayout
};
