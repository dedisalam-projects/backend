const path = require('path');
const fs = require('fs');
const { INDRIVE_CANVAS: DIMENSIONS, INDRIVE_COLORS: COLORS } = require('../../core/canvas');
const { registerIndriveFonts } = require('../../core/fonts');

/**
 * templates/indrive/receipt.js - Pixel-Perfect Drawing Engine for inDrive Receipts
 *
 * Implements exact grid coordinates, typography, and line positions
 * empirically extracted from official WeasyPrint inDrive PDFs.
 */

/**
 * Render the inDrive receipt onto a PDFDocument instance
 * @param {PDFDocument} doc
 * @param {Object} data - Normalized inDrive receipt payload
 */
function renderIndriveReceipt(doc, data) {
    registerIndriveFonts(doc);

    const fontReg = 'IndriveFont';
    const fontBold = 'IndriveFont-Bold';

    // 1. inDrive Logo (Centered at x=191.51, y=35.85, width=212.25, height=61.50)
    const logoPath = path.resolve(__dirname, '../../../img/logo_indrive.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, DIMENSIONS.logo.x, DIMENSIONS.logo.y, {
            width: DIMENSIONS.logo.width,
            height: DIMENSIONS.logo.height
        });
    }

    // 2. Sub-header (Resi untuk layanan Anda & Nomor faktur)
    doc.fillColor(COLORS.textBlack);

    // "Resi untuk layanan Anda"
    doc.font(fontBold).fontSize(10.2);
    doc.text('Resi untuk layanan Anda', DIMENSIONS.marginLeft, 117.04, {
        width: DIMENSIONS.contentWidth,
        align: 'center',
        lineBreak: false
    });

    // "Nomor faktur : <invoice_number>"
    const invPrefix = 'Nomor faktur';
    const invValue = `: ${data.invoice_number} `;
    const wPrefix = doc.font(fontBold).fontSize(10.2).widthOfString(invPrefix);
    const wValue = doc.font(fontReg).fontSize(10.2).widthOfString(invValue);
    const totalInvW = wPrefix + wValue;
    const invStartX = (DIMENSIONS.width - totalInvW) / 2;

    doc.font(fontBold).fontSize(10.2).text(invPrefix, invStartX, 132.34, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(invValue, invStartX + wPrefix, 132.34, { lineBreak: false });

    // 3. Recipient ("Ke: ...") & Date ("Tanggal: ...")
    const yRecipient = 162.94;
    // Left: "Ke : <recipient_name>"
    doc.font(fontBold).fontSize(10.2).text('Ke', DIMENSIONS.marginLeft, yRecipient, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(`: ${data.recipient_name}`, 69.49, yRecipient, { lineBreak: false });

    // Right: "Tanggal : <invoice_date>"
    const dateText = `: ${data.invoice_date}`;
    const dateLabel = 'Tanggal';
    const wDateLabel = doc.font(fontBold).fontSize(10.2).widthOfString(dateLabel);
    const wDateVal = doc.font(fontReg).fontSize(10.2).widthOfString(dateText);
    const rightDateX = DIMENSIONS.contentRight - (wDateLabel + wDateVal);

    doc.font(fontBold).fontSize(10.2).text(dateLabel, rightDateX, yRecipient, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(dateText, rightDateX + wDateLabel, yRecipient, { lineBreak: false });

    // 4. Order Details (Jenis order, Nama Pengemudi, Detail mobil)
    // Baseline y=204.45 -> box y=193.54
    doc.font(fontBold).fontSize(10.2).text('Jenis order', DIMENSIONS.marginLeft, 193.54, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(`: ${data.order_type} `, 111.48, 193.54, { lineBreak: false });

    // Baseline y=219.75 -> box y=208.84
    doc.font(fontBold).fontSize(10.2).text('Nama Pengemudi', DIMENSIONS.marginLeft, 208.84, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(`: ${data.driver_name} `, 147.88, 208.84, { lineBreak: false });

    // Baseline y=235.05 -> box y=224.14 (Official template uses "Detail mobil" even for motor)
    doc.font(fontBold).fontSize(10.2).text('Detail mobil', DIMENSIONS.marginLeft, 224.14, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(`: ${data.vehicle_detail} `, 118.74, 224.14, { lineBreak: false });

    // 5. Trip Timeline (Tanggal Perjalanan, Penjemputan, Pengantaran, Jarak)
    // Tanggal Perjalanan
    doc.font(fontBold).fontSize(9.0).text('Tanggal Perjalanan', DIMENSIONS.marginLeft, 256.03, { lineBreak: false });
    doc.font(fontReg).fontSize(9.0).text(':', 143.13, 256.03, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.trip_date, DIMENSIONS.marginLeft, 270.04, { lineBreak: false });

    // Penjemputan
    doc.font(fontBold).fontSize(9.0).text('Penjemputan', DIMENSIONS.marginLeft, 286.63, { lineBreak: false });
    doc.font(fontReg).fontSize(9.0).text(':', 117.34, 286.63, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.pickup.location, DIMENSIONS.marginLeft, 300.64, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.pickup.time, DIMENSIONS.marginLeft, 315.94, { lineBreak: false });

    // Pengantaran
    doc.font(fontBold).fontSize(9.0).text('Pengantaran', DIMENSIONS.marginLeft, 332.53, { lineBreak: false });
    doc.font(fontReg).fontSize(9.0).text(':', 115.22, 332.53, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.dropoff.location, DIMENSIONS.marginLeft, 346.54, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.dropoff.time, DIMENSIONS.marginLeft, 361.84, { lineBreak: false });

    // Jarak
    doc.font(fontBold).fontSize(9.0).text('Jarak', DIMENSIONS.marginLeft, 378.43, { lineBreak: false });
    doc.font(fontReg).fontSize(9.0).text(':', 80.03, 378.43, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(data.distance, DIMENSIONS.marginLeft, 392.44, { lineBreak: false });

    // 6. Table Lines & Content
    // Table Line 1 (Top): y = 431.71
    doc.lineWidth(0.75).strokeColor(COLORS.borderBlack)
       .moveTo(DIMENSIONS.marginLeft, 431.71)
       .lineTo(DIMENSIONS.contentRight, 431.71)
       .stroke();

    // Table Header Text (Baseline y=446.53 -> y=435.63)
    doc.font(fontReg).fontSize(10.2).text('Deskripsi', 62.36, 435.63, { lineBreak: false });
    const wHeaderAmount = doc.font(fontReg).fontSize(10.2).widthOfString('Jumlah');
    doc.text('Jumlah', 532.91 - wHeaderAmount, 435.63, { lineBreak: false });

    // Table Line 2 (Header bottom): y = 464.77
    doc.moveTo(DIMENSIONS.marginLeft, 464.77)
       .lineTo(DIMENSIONS.contentRight, 464.77)
       .stroke();

    // Table Row 1 Text (Baseline y=479.59 -> y=468.69)
    doc.font(fontBold).fontSize(10.2).text(data.description, 62.36, 468.69, { lineBreak: false });
    const wFare = doc.font(fontReg).fontSize(10.2).widthOfString(data.fare_formatted);
    doc.font(fontReg).fontSize(10.2).text(data.fare_formatted, 532.91 - wFare, 468.69, { lineBreak: false });

    // Table Line 3 (Row bottom): y = 486.49
    doc.moveTo(DIMENSIONS.marginLeft, 486.49)
       .lineTo(DIMENSIONS.contentRight, 486.49)
       .stroke();

    // 7. Footer / Total (Baseline y=544.37 -> y=533.47)
    // Left: "Metode pembayaran : Tunai"
    doc.font(fontBold).fontSize(10.2).text('Metode pembayaran', DIMENSIONS.marginLeft, 533.47, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(`: ${data.payment_method}`, 162.58, 533.47, { lineBreak: false });

    // Right: "Total Jumlah : Rp 30000.00"
    const totalLabel = 'Total Jumlah';
    const totalVal = `: ${data.fare_formatted}`;
    const wTotalLabel = doc.font(fontBold).fontSize(10.2).widthOfString(totalLabel);
    const wTotalVal = doc.font(fontReg).fontSize(10.2).widthOfString(totalVal);
    const totalBlockW = wTotalLabel + wTotalVal;
    const rightTotalX = DIMENSIONS.contentRight - totalBlockW;

    doc.font(fontBold).fontSize(10.2).text(totalLabel, rightTotalX, 533.47, { lineBreak: false });
    doc.font(fontReg).fontSize(10.2).text(totalVal, rightTotalX + wTotalLabel, 533.47, { lineBreak: false });
}

module.exports = {
    renderIndriveReceipt
};
