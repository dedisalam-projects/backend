const path = require('path');
const fs = require('fs');
const {
    TRAVELOKA_CANVAS: DIMENSIONS,
    TRAVELOKA_COLORS: COLORS,
    TRAVELOKA_TABLE_COLUMNS: TABLE_COLUMNS
} = require('../../core/canvas');
const { registerTravelokaFonts } = require('../../core/fonts');
const { getAmountX, wrapText, getTableColumns } = require('../../core/helpers');

/**
 * templates/traveloka/index.js - Shared Library for Traveloka Templates
 *
 * Implements exact grid coordinates, colors, fonts, and drawing primitives
 * based on traveloka_anchor_guide.md and original OpenPDF geometry.
 */

/**
 * Setup standard fonts on doc instance
 */
function setupFonts(doc) {
    registerTravelokaFonts(doc);
}

/**
 * Draw Top Header: Title, Receipt #, Date, Accent Bar, and Top-Right Logo
 */
function drawHeader(doc, meta = {}) {
    const imgDir = path.resolve(__dirname, '../../../img');
    const logoPath = path.join(imgDir, 'logo_traveloka.png');

    // 1. Traveloka Logo at top-right
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 445.28, 0.0, { width: 150.0, height: 39.0 });
    }

    // 2. Vertical blue accent bar on the left of header
    doc.rect(28.34, 22.49, 3.02, 37.52).fill(COLORS.travelokaBlue);

    // 3. Receipt metadata top-left
    doc.font('TravelokaFont-Bold').fontSize(8.78).fillColor(COLORS.textBlack);
    doc.text('BUKTI PEMBELIAN (RECEIPT)', 37.35, 23.82, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text(`Nomor : ${meta.receiptNo || '#1837161707445701177'}`, 37.35, 37.11, { lineBreak: false });

    const dateLines = Array.isArray(meta.transactionDateLines) && meta.transactionDateLines.length > 0 ?
                      meta.transactionDateLines :
                      (typeof meta.transactionDate === 'string' && meta.transactionDate.includes('\n') ?
                       meta.transactionDate.split('\n') :
                       [meta.transactionDate || '09 Jul 2025, 16:47 (Rabu)']);

    dateLines.forEach((line, idx) => {
        const prefix = idx === 0 ? 'Tanggal : ' : '';
        doc.text(`${prefix}${line.trim()}`, 37.35, 46.86 + (idx * 9.75), { lineBreak: false });
    });
}

/**
 * Draw Payment Details Bar (Gray background box + details)
 */
function drawPaymentBar(doc, payment = {}) {
    // Gray section strip
    doc.rect(28.35, 82.50, DIMENSIONS.contentWidth, 15.75).fill(COLORS.bgGray);

    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('DETAIL PEMBAYARAN', 34.35, 86.76, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text(`P.O. NUMBER: ${payment.poNumber || '1268028452'}`, 34.35, 103.11, { lineBreak: false });

    // Method display in payment bar
    let barMethod = payment.paymentBarMethod;
    if (!barMethod) {
        barMethod = payment.paymentMethod || 'GoPay/GoPay Tabungan';
        // Normalize space before slash if present
        barMethod = barMethod.replace(' /', '/');
    }
    doc.text(`PEMBELIAN MELALUI: ${barMethod}`, 169.01, 103.11, { lineBreak: false });
    doc.text(`DETAIL TRANSAKSI: ${payment.status || 'Lunas'}`, 411.38, 103.11, { lineBreak: false });
}

/**
 * Draw Two-Column Section: DATA PEMESAN (Left) and DETAIL PERUSAHAAN (Right)
 */
function drawTwoColumnInfo(doc, customer = {}, company = {}) {
    // Gray strips behind column headers
    doc.rect(28.35, 128.55, 269.29, 15.75).fill(COLORS.bgGray);
    doc.rect(297.64, 128.55, 269.28, 15.75).fill(COLORS.bgGray);

    // ── LEFT COLUMN: DATA PEMESAN ───────────────────────────────────────────
    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('DATA PEMESAN', 34.35, 132.81, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text('Nama', 34.35, 149.16, { lineBreak: false });
    doc.text(`: ${customer.nama || 'Dedi Salam Permana'}`, 94.35, 149.16, { lineBreak: false });

    doc.text('Email', 34.35, 158.91, { lineBreak: false });
    doc.text(`: ${customer.email || 'dedispermana20@gmail.com'}`, 94.35, 158.91, { lineBreak: false });

    doc.text('No. Kontak', 34.35, 168.66, { lineBreak: false });
    doc.text(`: ${customer.phone || '+6285856416338'}`, 94.35, 168.66, { lineBreak: false });

    // ── RIGHT COLUMN: DETAIL PERUSAHAAN ──────────────────────────────────────
    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('DETAIL PERUSAHAAN', 303.64, 132.81, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text('Nama', 303.64, 149.16, { lineBreak: false });
    doc.text(`: ${company.nama || 'Trinusa Travelindo'}`, 363.64, 149.16, { lineBreak: false });

    doc.text('NPWP', 303.64, 158.91, { lineBreak: false });
    doc.text(`: ${company.npwp || '0316163203031000'}`, 363.64, 158.91, { lineBreak: false });

    doc.text('Alamat', 303.64, 168.66, { lineBreak: false });
    const addressLines = company.alamatLines || [
        ': Traveloka Campus [d/h Green Office Park 1] South Tower',
        'Lantai 2 Zone 10, Jl. Grand Boulevard BSD Green Office',
        'Park, Sampora, Cisauk, Kab Tangerang, Banten 15845'
    ];
    addressLines.forEach((line, idx) => {
        const xPos = idx === 0 ? 363.64 : 367.39;
        doc.text(line, xPos, 168.66 + (idx * 9.75), { lineBreak: false });
    });
}

/**
 * Draw Table Header Strip, Column Titles, and Outer Table Grid Lines
 */
function drawTableHeader(doc, yStart, options = {}) {
    const isHotel = options.isHotel === true;
    const cols = options.cols || getTableColumns({}, isHotel);

    // Gray header box for "DETAIL PEMBELIAN"
    doc.rect(28.35, yStart, DIMENSIONS.contentWidth, 15.75).fill(COLORS.bgGray);

    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('DETAIL PEMBELIAN', 34.35, yStart + 4.26, { lineBreak: false });

    // Table Column Headers Text
    const colY = yStart + 33.39;
    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);

    const colJenisX = cols.jenis;
    const colDescX = cols.deskripsi;

    doc.text('No.', cols.no, colY, { lineBreak: false });
    doc.text('Jenis Barang', colJenisX, colY, { lineBreak: false });
    doc.text('Deskripsi', colDescX, colY, { lineBreak: false });
    doc.text('Jml.', 355.65, colY, { lineBreak: false });

    doc.text('Harga satuan Rp', 382.58, colY, { lineBreak: false });
    doc.text('Total Rp', 490.28, colY, { lineBreak: false });

    // Table header grid borders
    const topBorderY = yStart + 18.38;
    const bottomBorderY = yStart + 53.70;
    const hHeader = bottomBorderY - topBorderY;

    // Horizontal border lines
    doc.rect(28.35, topBorderY, DIMENSIONS.contentWidth, 0.75).fill(COLORS.borderGray);
    doc.rect(28.35, bottomBorderY, DIMENSIONS.contentWidth, 0.75).fill(COLORS.borderGray);

    // Vertical column divider lines for header
    const colDividers = cols.colDividers;
    colDividers.forEach((x, idx) => {
        const drawX = (idx === 0) ? 28.35 : (idx === colDividers.length - 1) ? 566.17 : x;
        doc.rect(drawX, topBorderY, 0.75, hHeader).fill(COLORS.borderGray);
    });

    return yStart + 58.50; // Exact Y coordinate for the first data row
}

/**
 * Draw Row Grid Lines
 */
function drawRowBorders(doc, yTop, yBottom, cols = null) {
    const height = yBottom - yTop;
    const colDividers = (cols && cols.colDividers) ? cols.colDividers : [28.35, 48.38, 129.15, 351.15, 378.08, 485.78, 566.17];

    // Bottom border of this row
    doc.rect(28.35, yBottom, DIMENSIONS.contentWidth, 0.75).fill(COLORS.borderGray);

    // Vertical dividers of this row
    colDividers.forEach(x => {
        doc.rect(x, yTop, 0.75, height).fill(COLORS.borderGray);
    });
}

/**
 * Draw Summary Section (TOTAL, Payment Method, JUMLAH PEMBAYARAN)
 */
function drawSummary(doc, yStart, totalFormatted, paymentMethod = 'GoPay', options = {}) {
    // 1. TOTAL row (height = 15.0 pt)
    const yTotalTop = yStart;
    const yTotalBottom = yTotalTop + 15.0;
    const yTotalText = yTotalTop + 4.86;

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text('TOTAL', TABLE_COLUMNS.summaryLabel, yTotalText, { lineBreak: false });
    const totalX = getAmountX(doc, totalFormatted, TABLE_COLUMNS.summaryVal);
    doc.text(totalFormatted, totalX, yTotalText, { lineBreak: false });

    // Borders for TOTAL row (from x=378.08 to 566.92)
    doc.rect(378.08, yTotalTop, 566.92 - 378.08, 0.75).fill(COLORS.borderGray);
    doc.rect(378.08, yTotalBottom, 566.92 - 378.08, 0.75).fill(COLORS.borderGray);
    doc.rect(378.08, yTotalTop, 0.75, 15.0).fill(COLORS.borderGray);
    doc.rect(485.78, yTotalTop, 0.75, 15.0).fill(COLORS.borderGray);
    doc.rect(566.17, yTotalTop, 0.75, 15.0).fill(COLORS.borderGray);

    // 2. Dibayar dengan ... row
    const payFullText = `Dibayar dengan ${paymentMethod}`;
    const payLines = wrapText(doc, payFullText, 100.0);
    const isMultiLine = payLines.length > 1;
    const paidRowHeight = isMultiLine ? 24.75 : 15.0;

    const yPaidTop = yTotalBottom;
    const yPaidBottom = yPaidTop + paidRowHeight;
    const yPaidText1 = yPaidTop + 4.86;

    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    if (!isMultiLine) {
        doc.text(payLines[0], TABLE_COLUMNS.summaryLabel, yPaidText1, { lineBreak: false });
        doc.text(totalFormatted, totalX, yPaidText1, { lineBreak: false });
    } else {
        doc.text(payLines[0], TABLE_COLUMNS.summaryLabel, yPaidText1, { lineBreak: false });
        doc.text(payLines[1], TABLE_COLUMNS.summaryLabel, yPaidText1 + 9.75, { lineBreak: false });
        // Amount is vertically centered between the two lines
        doc.text(totalFormatted, totalX, yPaidText1 + 4.87, { lineBreak: false });
    }

    // Borders for Dibayar row
    doc.rect(378.08, yPaidBottom, 566.92 - 378.08, 0.75).fill(COLORS.borderGray);
    doc.rect(378.08, yPaidTop, 0.75, paidRowHeight).fill(COLORS.borderGray);
    doc.rect(485.78, yPaidTop, 0.75, paidRowHeight).fill(COLORS.borderGray);
    doc.rect(566.17, yPaidTop, 0.75, paidRowHeight).fill(COLORS.borderGray);

    // 3. JUMLAH PEMBAYARAN row (height = 15.0 pt)
    const yFinalTop = yPaidBottom;
    const yFinalBottom = yFinalTop + 15.0;
    const yFinalText = yFinalTop + 4.86;

    const label = (options && options.summaryVatStar) ? 'JUMLAH PEMBAYARAN *' : 'JUMLAH PEMBAYARAN';
    doc.font('TravelokaFont-Bold').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text(label, TABLE_COLUMNS.summaryLabel, yFinalText, { lineBreak: false });
    doc.text(totalFormatted, totalX, yFinalText, { lineBreak: false });

    // Borders for JUMLAH PEMBAYARAN row
    doc.rect(378.08, yFinalBottom, 566.92 - 378.08, 0.75).fill(COLORS.borderGray);
    doc.rect(378.08, yFinalTop, 0.75, 15.0).fill(COLORS.borderGray);
    doc.rect(485.78, yFinalTop, 0.75, 15.0).fill(COLORS.borderGray);
    doc.rect(566.17, yFinalTop, 0.75, 15.0).fill(COLORS.borderGray);

    return yFinalBottom;
}

/**
 * Draw Bottom Blue Banner, Help Center, and Terms & Conditions
 */
function drawFooterBanner(doc, options = {}) {
    const imgDir = path.resolve(__dirname, '../../../img');
    const helpIconPath = path.join(imgDir, 'icon_traveloka_help.png');
    const qrPath = path.join(imgDir, 'qr_traveloka_sample.png');

    // 1. QR Code if requested or present
    if (options.showQr && fs.existsSync(qrPath)) {
        doc.image(qrPath, 28.35, 603.68, { width: 126.0, height: 126.0 });
    }

    // 2. Help Center Text & Link at y = 784.18
    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textBlack);
    doc.text('Untuk pertanyaan apa pun, kunjungi Traveloka Help Center:', 151.69, 784.18, { lineBreak: false });

    // Help Web Icon
    if (fs.existsSync(helpIconPath)) {
        doc.image(helpIconPath, 353.36, 781.91, { width: 12.0, height: 12.0 });
    }

    // Help Link
    doc.font('TravelokaFont').fontSize(6.75).fillColor(COLORS.linkBlue);
    doc.text('www.traveloka.com/help', 370.46, 784.77, { lineBreak: false });
    doc.link(370.46, 783.00, 73.0, 10.0, 'https://www.traveloka.com/help');

    // 3. Bottom Full Blue Banner (y = 802.87 to 827.70)
    doc.rect(0.0, 802.87, DIMENSIONS.width, 24.83).fill(COLORS.travelokaBlue);

    // Disclaimer text in white
    doc.font('TravelokaFont').fontSize(7.5).fillColor(COLORS.textWhite);
    const footerText = options.footerTerms || 'Syarat dan Ketentuan berlaku. Silakan lihat http://www.traveloka.com/termsandconditions';
    const footerX = options.footerX || (footerText.includes('paylater') ? 101.44 : 149.32);
    doc.text(footerText, footerX, 812.23, { lineBreak: false });
}

module.exports = {
    DIMENSIONS,
    COLORS,
    TABLE_COLUMNS,
    getTableColumns,
    setupFonts,
    getAmountX,
    wrapText,
    drawHeader,
    drawPaymentBar,
    drawTwoColumnInfo,
    drawTableHeader,
    drawRowBorders,
    drawSummary,
    drawFooterBanner
};
