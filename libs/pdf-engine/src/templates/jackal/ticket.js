const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const { JACKAL_CANVAS: DIMENSIONS, JACKAL_COLORS: COLORS } = require('../../core/canvas');

/**
 * templates/jackal/ticket.js - Pixel-Perfect Multi-Page Drawing Engine for Jackal Holidays
 *
 * Implements exact grid coordinates, typography, and line positions
 * empirically extracted from official dompdf Jackal Holidays E-Tickets.
 */

/**
 * Render complete Jackal Holidays E-Ticket (3 Pages)
 * @param {PDFDocument} doc
 * @param {Object} data - Normalized Jackal Holidays payload
 */
async function renderJackalTicket(doc, data) {
    // Generate QR Code buffer for passenger 0
    const qrPayload = data.passengers[0]?.qr_code || data.booking_code;
    let qrBuffer = null;
    try {
        qrBuffer = await QRCode.toBuffer(qrPayload, {
            margin: 0,
            width: 250,
            errorCorrectionLevel: 'M'
        });
    } catch (e) {
        console.error('Error generating QR code for Jackal ticket:', e.message);
    }

    // ── PAGE 1: E-TICKET ───────────────────────────────────────────────────
    renderPage1(doc, data, qrBuffer);

    // ── PAGE 2: TOTAL SUMMARY, PAYMENT & TERMS PART 1 ──────────────────────
    doc.addPage({
        size: [DIMENSIONS.width, DIMENSIONS.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    renderPage2(doc, data);

    // ── PAGE 3: TERMS PART 2 & CALL CENTER ─────────────────────────────────
    doc.addPage({
        size: [DIMENSIONS.width, DIMENSIONS.height],
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    renderPage3(doc, data);
}

/**
 * Page 1 Rendering Routine
 */
function renderPage1(doc, data, qrBuffer) {
    const fontReg = 'Helvetica';
    const fontBold = 'Helvetica-Bold';

    // 1. Logo (Centered at x=239.50, y=41.52, width=116.29, height=60.00)
    const logoPath = path.resolve(__dirname, '../../../img/logo_jackal.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, DIMENSIONS.logo.x, DIMENSIONS.logo.y, {
            width: DIMENSIONS.logo.width,
            height: DIMENSIONS.logo.height
        });
    }

    // 2. Title "TIKET ELEKTRONIK" (origin [225.14, 146.94], font size 15.0)
    doc.font(fontBold).fontSize(15.0).fillColor(COLORS.textBlack);
    doc.text('TIKET ELEKTRONIK', DIMENSIONS.marginLeft, 133.0, {
        width: DIMENSIONS.contentWidth,
        align: 'center',
        lineBreak: false
    });

    // 3. Section 1: Detail Pemesanan
    const ySec1 = 178.05;
    const hSec1Header = 18.75;
    doc.rect(DIMENSIONS.marginLeft, ySec1, DIMENSIONS.contentWidth, hSec1Header).fill(COLORS.headerBg);
    doc.font(fontBold).fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('Detail Pemesanan', 38.89, ySec1 + 4.5, { lineBreak: false });

    // Box stroke (y=196.80 to 311.55, height = 114.75)
    doc.rect(35.51, ySec1 + hSec1Header, 524.26, 114.75)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    // Left column: Kode Booking
    doc.font(fontReg).fontSize(8.2).fillColor(COLORS.textBlack);
    doc.text('Kode Booking:', 45.64, 269.09, { lineBreak: false });
    doc.font(fontBold).fontSize(11.2);
    doc.text(data.booking_code, 45.64, 285.50, { lineBreak: false });

    // Right column: Customer details
    const custRows = [
        { label: 'Tanggal Booking', val: `: ${data.booking_date}`, y: 208.84 },
        { label: 'Nama', val: `: ${data.customer.name}`, y: 221.91 },
        { label: 'Alamat', val: `: ${data.customer.address}`, y: 234.99 },
        { label: 'No. Telp', val: `: ${data.customer.phone}`, y: 248.06 },
        { label: 'Email', val: `: ${data.customer.email}`, y: 261.13 },
        { label: 'OTP', val: `: ${data.customer.otp}`, y: 274.21 }
    ];
    custRows.forEach(r => {
        doc.font(fontBold).fontSize(8.2).text(r.label, 163.39, r.y, { lineBreak: false });
        doc.font(fontReg).fontSize(8.2).text(r.val, 256.39, r.y, { lineBreak: false });
    });

    // 4. Section 2: Detail Keberangkatan
    const ySec2 = 326.92;
    const hSec2Header = 18.75;
    doc.rect(DIMENSIONS.marginLeft, ySec2, DIMENSIONS.contentWidth, hSec2Header).fill(COLORS.headerBg);
    doc.font(fontBold).fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('Detail Keberangkatan', 38.89, ySec2 + 4.5, { lineBreak: false });

    // Box stroke (y=345.67 to 526.82, height = 181.15)
    doc.rect(35.51, ySec2 + hSec2Header, 524.26, 181.15)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    // Left sub-column:
    // Point Keberangkatan
    doc.font(fontBold).fontSize(8.2).text('Point', 47.89, 357.71, { lineBreak: false });
    doc.font(fontBold).fontSize(8.2).text('Keberangkatan', 47.89, 367.78, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.departure.point}`, 119.28, 362.70, { lineBreak: false });

    // Alamat Outlet Keberangkatan
    doc.font(fontBold).fontSize(8.2).text('Alamat Outlet', 47.89, 380.85, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.departure.address}`, 119.28, 380.81, {
        width: 225.0,
        lineBreak: true,
        lineGap: 1.5
    });

    // Maps Point Keberangkatan
    doc.font(fontBold).fontSize(8.2).text('Maps Point', 47.89, 404.00, { lineBreak: false });
    doc.font(fontBold).fontSize(8.2).text('Keberangkatan', 47.89, 414.07, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(':', 119.28, 409.00, { lineBreak: false });
    doc.fillColor(COLORS.linkBlue).text('Lihat Maps', 123.87, 409.00, { lineBreak: false });
    doc.lineWidth(0.41).strokeColor(COLORS.linkBlue).moveTo(123.87, 419.60).lineTo(164.22, 419.60).stroke();
    doc.link(123.87, 407.0, 42.0, 14.0, data.departure.maps_url);

    // Point Tujuan
    doc.fillColor(COLORS.textBlack);
    doc.font(fontBold).fontSize(8.2).text('Point Tujuan', 47.89, 427.15, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.destination.point}`, 119.28, 427.11, { lineBreak: false });

    // Alamat Outlet Tujuan
    doc.font(fontBold).fontSize(8.2).text('Alamat Outlet', 47.89, 440.22, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.destination.address}`, 119.28, 440.18, {
        width: 225.0,
        lineBreak: true,
        lineGap: 1.5
    });

    // Maps Point Tujuan
    doc.font(fontBold).fontSize(8.2).text('Maps Point', 47.89, 493.59, { lineBreak: false });
    doc.font(fontBold).fontSize(8.2).text('Tujuan', 47.89, 503.66, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(':', 119.28, 498.58, { lineBreak: false });
    doc.fillColor(COLORS.linkBlue).text('Lihat Maps', 123.87, 498.58, { lineBreak: false });
    doc.lineWidth(0.41).strokeColor(COLORS.linkBlue).moveTo(123.87, 509.19).lineTo(164.22, 509.19).stroke();
    doc.link(123.87, 496.0, 42.0, 14.0, data.destination.maps_url);

    // Right sub-column:
    doc.fillColor(COLORS.textBlack);
    doc.font(fontBold).fontSize(8.2).text('Tanggal Berangkat', 352.09, 357.71, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.departure.date}`, 429.36, 357.67, { lineBreak: false });

    doc.font(fontBold).fontSize(8.2).text('Jam Berangkat', 352.09, 370.78, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(`: ${data.departure.time}`, 429.36, 370.74, { lineBreak: false });

    if (data.fleet) {
        doc.font(fontBold).fontSize(8.2).text('Armada', 352.09, 383.85, { lineBreak: false });
        doc.font(fontReg).fontSize(8.2).text(`: ${data.fleet}`, 429.36, 383.81, { lineBreak: false });
    }
    if (data.vehicle_code) {
        doc.font(fontBold).fontSize(8.2).text('Kode Kendaraan', 352.09, 396.92, { lineBreak: false });
        doc.font(fontReg).fontSize(8.2).text(`: ${data.vehicle_code}`, 429.36, 396.88, { lineBreak: false });
    }
    if (data.vehicle_plate) {
        doc.font(fontBold).fontSize(8.2).text('Plat Kendaraan', 352.09, 409.99, { lineBreak: false });
        doc.font(fontReg).fontSize(8.2).text(`: ${data.vehicle_plate}`, 429.36, 409.95, { lineBreak: false });
    }

    // 5. Section 3: Detail Penumpang
    const ySec3 = 542.20;
    const hSec3Header = 18.75;
    doc.rect(DIMENSIONS.marginLeft, ySec3, DIMENSIONS.contentWidth, hSec3Header).fill(COLORS.headerBg);
    doc.font(fontBold).fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('Detail Penumpang', 38.89, ySec3 + 4.5, { lineBreak: false });

    // Box stroke (y=560.95 to 672.97, height = 112.02)
    doc.rect(35.51, ySec3 + hSec3Header, 524.26, 112.02)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    // Table Header (y=570.73)
    doc.font(fontBold).fontSize(8.2).fillColor(COLORS.textBlack);
    doc.text('QR/Boarding', 45.64, 570.73, { lineBreak: false });
    doc.text('Nama', 147.01, 570.73, { lineBreak: false });
    doc.text('Kursi', 274.34, 570.73, { lineBreak: false });
    doc.text('Rute', 339.07, 570.73, { lineBreak: false });
    doc.text('Keberangkatan', 419.81, 570.73, { lineBreak: false });

    // Table Row 0
    const pass0 = data.passengers[0] || {};
    if (qrBuffer) {
        doc.image(qrBuffer, 45.64, 590.00, { width: 75.0, height: 75.0 });
    }
    doc.font(fontReg).fontSize(8.2);
    doc.text(pass0.name || '-', 147.01, 612.10, { lineBreak: false });
    doc.text(pass0.seat || '-', 282.59, 612.10, { lineBreak: false });
    doc.text(pass0.route || '-', 332.89, 612.10, { lineBreak: false });
    doc.text(pass0.schedule || '-', 400.99, 612.10, { lineBreak: false });

    // 6. Section 4: Detail Harga
    const ySec4 = 688.34;
    const hSec4Header = 18.75;
    doc.rect(DIMENSIONS.marginLeft, ySec4, DIMENSIONS.contentWidth, hSec4Header).fill(COLORS.headerBg);
    doc.font(fontBold).fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('Detail Harga', 38.89, ySec4 + 4.5, { lineBreak: false });

    // Box stroke (y=707.09 to 773.81, height = 66.72)
    doc.rect(35.51, ySec4 + hSec4Header, 524.26, 66.72)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    // Table Header (y=721.92)
    doc.font(fontBold).fontSize(8.2).fillColor(COLORS.textBlack);
    doc.text('Nomor Tiket', 45.64, 721.92, { lineBreak: false });
    doc.text('Nomor', 157.60, 716.88, { lineBreak: false });
    doc.text('Kursi', 160.35, 726.95, { lineBreak: false });
    doc.text('Rute', 263.12, 721.92, { lineBreak: false });
    doc.text('Keberangkatan', 369.24, 721.92, { lineBreak: false });
    doc.text('Harga Tiket', 504.71, 721.92, { lineBreak: false });

    // Table Row 0 (y=750.48)
    const tick0 = data.tickets[0] || {};
    doc.font(fontReg).fontSize(8.2);
    doc.text(tick0.ticket_no || '-', 45.64, 750.48, { lineBreak: false });
    doc.text(tick0.seat || '-', 168.60, 750.48, { lineBreak: false });
    doc.text(tick0.route || '-', 256.94, 750.48, { lineBreak: false });
    doc.text(tick0.schedule || '-', 350.43, 750.48, { lineBreak: false });
    doc.text(tick0.price_formatted || 'Rp 0', 506.99, 750.48, { lineBreak: false });
}

/**
 * Page 2 Rendering Routine (Prices, Payment, Terms 1-4)
 */
function renderPage2(doc, data) {
    const fontReg = 'Helvetica';
    const fontBold = 'Helvetica-Bold';

    // 1. Price Summary Box (y=34.02 to 96.06, height=62.04)
    doc.rect(35.51, 34.02, 524.26, 62.04)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    const pay = data.payment || {};
    const priceRows = [
        { label: 'Total Harga', val: pay.total_price_formatted, y: 44.32, valX: 506.99 },
        { label: 'Admin Fee', val: pay.admin_fee_formatted, y: 57.40, valX: 532.22 },
        { label: 'Diskon', val: pay.discount_formatted, y: 70.47, valX: 511.58 },
        { label: 'Total Bayar', val: pay.total_paid_formatted, y: 83.54, valX: 506.99 }
    ];

    priceRows.forEach(r => {
        doc.font(fontBold).fontSize(8.2).fillColor(COLORS.textBlack);
        doc.text(r.label, 402.86, r.y, { lineBreak: false });
        doc.font(fontReg).fontSize(8.2);
        doc.text(r.val, r.valX, r.y, { lineBreak: false });
    });

    // 2. Detail Pembayaran Box
    const ySecPay = 111.06;
    const hSecPayHeader = 18.75;
    doc.rect(DIMENSIONS.marginLeft, ySecPay, DIMENSIONS.contentWidth, hSecPayHeader).fill(COLORS.headerBg);
    doc.font(fontBold).fontSize(9.0).fillColor(COLORS.textBlack);
    doc.text('Detail Pembayaran', 38.89, ySecPay + 4.5, { lineBreak: false });

    // Box stroke (y=129.81 to 160.51, height=30.70)
    doc.rect(35.51, ySecPay + hSecPayHeader, 524.26, 30.70)
       .lineWidth(0.75).strokeColor(COLORS.borderGray).stroke();

    doc.font(fontBold).fontSize(8.2).text('Metode Pembayaran :', 45.64, 140.0, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(` ${pay.method}`, 135.0, 140.0, { lineBreak: false });

    doc.font(fontBold).fontSize(8.2).text('Waktu Pembayaran :', 401.07, 140.0, { lineBreak: false });
    doc.font(fontReg).fontSize(8.2).text(` ${pay.time}`, 482.22, 140.0, { lineBreak: false });

    // 3. Gray Section Divider Line (y=175.46)
    doc.lineWidth(0.75).strokeColor(COLORS.dividerDark)
       .moveTo(35.51, 175.46).lineTo(559.77, 175.46).stroke();

    // 4. Terms and Conditions (Page 2)
    let curY = 195.66;
    const terms = data.terms_page2 || [];

    terms.forEach(sec => {
        // Section Title
        doc.font(fontBold).fontSize(9.7).fillColor(COLORS.textBlack);
        doc.text(sec.title, 35.14, curY, { lineBreak: false });
        curY += 20.0;

        sec.points.forEach((pt, pIdx) => {
            const numStr = `${pIdx + 1}.`;
            doc.font(fontReg).fontSize(8.2).fillColor(COLORS.textBlack);
            doc.text(numStr, 35.97, curY, { lineBreak: false });

            doc.text(pt, 50.74, curY, {
                width: 509.0,
                lineBreak: true,
                lineGap: 2.0
            });

            // Calculate height of wrapped text
            const ptHeight = doc.heightOfString(pt, { width: 509.0, lineGap: 2.0 });
            curY += Math.max(ptHeight, 12.0) + 4.0;
        });

        curY += 10.0;
    });
}

/**
 * Page 3 Rendering Routine (Terms 5-7 & Call Center)
 */
function renderPage3(doc, data) {
    const fontReg = 'Helvetica';
    const fontBold = 'Helvetica-Bold';

    let curY = 43.44;
    const terms = data.terms_page3 || [];

    terms.forEach(sec => {
        // Section Title
        doc.font(fontBold).fontSize(9.7).fillColor(COLORS.textBlack);
        doc.text(sec.title, 35.14, curY, { lineBreak: false });
        curY += 22.0;

        sec.points.forEach((pt, pIdx) => {
            const numStr = `${pIdx + 1}.`;
            doc.font(fontReg).fontSize(8.2).fillColor(COLORS.textBlack);
            doc.text(numStr, 35.97, curY, { lineBreak: false });

            // Check if text has the website link
            if (pt.includes('https://shuttle.jackalholidays.com/syaratketentuan')) {
                const parts = pt.split('https://shuttle.jackalholidays.com/syaratketentuan');
                doc.text(parts[0], 50.74, curY, { width: 509.0, lineBreak: true });
                const h1 = doc.heightOfString(parts[0], { width: 509.0 });
                const linkY = curY + h1;

                doc.fillColor(COLORS.linkBlue);
                doc.text('https://shuttle.jackalholidays.com/syaratketentuan', 50.74, linkY, { lineBreak: false });
                doc.lineWidth(0.41).strokeColor(COLORS.linkBlue).moveTo(50.74, linkY + 9.5).lineTo(235.0, linkY + 9.5).stroke();
                doc.link(50.74, linkY, 185.0, 10.0, 'https://shuttle.jackalholidays.com/syaratketentuan');

                doc.fillColor(COLORS.textBlack).text('.', 236.0, linkY, { lineBreak: false });
                curY = linkY + 16.0;
            } else {
                doc.text(pt, 50.74, curY, {
                    width: 509.0,
                    lineBreak: true,
                    lineGap: 2.0
                });
                const ptHeight = doc.heightOfString(pt, { width: 509.0, lineGap: 2.0 });
                curY += Math.max(ptHeight, 12.0) + 4.0;
            }
        });

        curY += 12.0;
    });
}

module.exports = {
    renderJackalTicket
};
