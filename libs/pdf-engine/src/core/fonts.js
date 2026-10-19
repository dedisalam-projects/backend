const path = require('path');
const fs = require('fs');

/**
 * src/core/fonts.js - Unified Font Registration Subsystem
 *
 * Registers required font families (Arial, DejaVuSans, NimbusSanL)
 * with graceful fallbacks across Windows, Linux, and Docker environments.
 */
function getFontsDirectory() {
    const candidates = [
        path.resolve(__dirname, '../../assets/fonts'),
        path.resolve(__dirname, '../../fonts'),
        path.resolve(process.cwd(), 'libs/pdf-engine/assets/fonts'),
        path.resolve(process.cwd(), 'fonts'),
        path.resolve(process.cwd(), 'assets/fonts'),
        path.resolve(process.cwd(), 'src/assets/fonts'),
        path.resolve(process.cwd(), '../aset/fonts'),
        path.resolve(__dirname, '../../../../backend/apps/gateway/src/assets/fonts'),
        path.resolve(__dirname, '../../../../backend/fonts'),
    ];
    for (const cand of candidates) {
        if (fs.existsSync(cand)) return cand;
    }
    return path.resolve(__dirname, '../../fonts');
}

const FONTS_DIR = getFontsDirectory();

/**
 * Register all standard fonts onto a PDFDocument instance
 * @param {PDFDocument} doc
 */
function registerAllFonts(doc) {
    registerGojekFonts(doc);
    registerTravelokaFonts(doc);
}

/**
 * Register Gojek typography fonts (DejaVu Sans & Nimbus Sans L)
 * @param {PDFDocument} doc
 */
function registerGojekFonts(doc) {
    const dejavuReg = path.join(FONTS_DIR, 'DejaVuSans.ttf');
    const dejavuBold = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');
    const nimbusReg = path.join(FONTS_DIR, 'NimbusSanL-Reg.otf');
    const nimbusBold = path.join(FONTS_DIR, 'NimbusSanL-Bol.otf');

    if (fs.existsSync(dejavuReg)) doc.registerFont('DejaVuSans', dejavuReg);
    if (fs.existsSync(dejavuBold)) doc.registerFont('DejaVuSans-Bold', dejavuBold);
    if (fs.existsSync(nimbusReg)) doc.registerFont('NimbusSanL-Reg', nimbusReg);
    if (fs.existsSync(nimbusBold)) doc.registerFont('NimbusSanL-Bol', nimbusBold);
}

/**
 * Register Traveloka typography fonts (Windows Arial with DejaVu fallback)
 * @param {PDFDocument} doc
 */
function registerTravelokaFonts(doc) {
    const windowsArial = 'C:/Windows/Fonts/arial.ttf';
    const windowsArialBold = 'C:/Windows/Fonts/arialbd.ttf';

    if (fs.existsSync(windowsArial) && fs.existsSync(windowsArialBold)) {
        doc.registerFont('TravelokaFont', windowsArial);
        doc.registerFont('TravelokaFont-Bold', windowsArialBold);
    } else {
        // Fallback to project DejaVuSans
        const dejavuReg = path.join(FONTS_DIR, 'DejaVuSans.ttf');
        const dejavuBold = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');
        doc.registerFont('TravelokaFont', dejavuReg);
        doc.registerFont('TravelokaFont-Bold', dejavuBold);
    }
}

/**
 * Register inDrive typography fonts (DejaVuSans/Arial fallback)
 * @param {PDFDocument} doc
 */
function registerIndriveFonts(doc) {
    const dejavuReg = path.join(FONTS_DIR, 'DejaVuSans.ttf');
    const dejavuBold = path.join(FONTS_DIR, 'DejaVuSans-Bold.ttf');
    const windowsArial = 'C:/Windows/Fonts/arial.ttf';
    const windowsArialBold = 'C:/Windows/Fonts/arialbd.ttf';

    if (fs.existsSync(dejavuReg) && fs.existsSync(dejavuBold)) {
        doc.registerFont('IndriveFont', dejavuReg);
        doc.registerFont('IndriveFont-Bold', dejavuBold);
    } else if (fs.existsSync(windowsArial) && fs.existsSync(windowsArialBold)) {
        doc.registerFont('IndriveFont', windowsArial);
        doc.registerFont('IndriveFont-Bold', windowsArialBold);
    }
}

/**
 * Register Jackal Holidays typography fonts (Standard Helvetica built-in)
 * @param {PDFDocument} doc
 */
function registerJackalFonts(doc) {
    // Helvetica and Helvetica-Bold are standard PDF built-in 14 fonts in PDFKit.
}

function registerAllFonts(doc) {
    registerGojekFonts(doc);
    registerTravelokaFonts(doc);
    registerIndriveFonts(doc);
    registerJackalFonts(doc);
}

module.exports = {
    registerAllFonts,
    registerGojekFonts,
    registerTravelokaFonts,
    registerIndriveFonts,
    registerJackalFonts
};

