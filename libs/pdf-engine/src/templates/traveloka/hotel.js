const traveloka = require('./index');
const { formatRupiah } = require('../../core/helpers');

/**
 * templates/traveloka/hotel.js - Layout Engine for Hotel / Akomodasi Receipts
 *
 * Implements exact grid coordinates and multiline text wrapping for
 * hotel stay, room type, check-in date, duration, and accommodation breakdown.
 */

function renderHotelReceipt(doc, data) {
    // 1. Setup fonts
    traveloka.setupFonts(doc);

    // 2. Draw Top Header (Title, Number, Date, Accent Bar, Logo)
    traveloka.drawHeader(doc, {
        receiptNo: data.receipt_no,
        transactionDate: data.transaction_date,
        transactionDateLines: data.transaction_date_lines
    });

    // 3. Draw Payment Details Bar
    traveloka.drawPaymentBar(doc, {
        poNumber: data.po_number,
        paymentMethod: data.payment_method,
        paymentBarMethod: data.payment_bar_method,
        status: data.status || 'Lunas'
    });

    // 4. Draw Two-Column Customer & Company Info
    traveloka.drawTwoColumnInfo(doc, data.customer, data.company);

    // Calculate vertical offset from company address line count (standard is 3 lines)
    const addrCount = Array.isArray(data.company && data.company.alamatLines) ? data.company.alamatLines.length : 3;
    const addrOffset = (addrCount - 3) * 9.75;

    // 5. Draw Guest Info Section ("TAMU")
    const tamuBoxY = 205.20 + addrOffset;
    doc.rect(28.35, tamuBoxY, traveloka.DIMENSIONS.contentWidth, 15.75).fill(traveloka.COLORS.bgGray);

    const guestName = data.guest_name || (data.customer && data.customer.nama) || 'Dedi Salam Permana';
    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(traveloka.COLORS.textBlack);
    doc.text('TAMU', 34.35, tamuBoxY + 4.26, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
    doc.text(guestName, 34.35, tamuBoxY + 20.61, { lineBreak: false });

    // 6. Draw Hotel Detail Section ("DETAIL HOTEL")
    const hotelBoxY = 251.85 + addrOffset;
    doc.rect(28.35, hotelBoxY, traveloka.DIMENSIONS.contentWidth, 15.75).fill(traveloka.COLORS.bgGray);

    const hotel = data.hotel || {};
    doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(traveloka.COLORS.textBlack);
    doc.text('DETAIL HOTEL', 34.35, hotelBoxY + 4.26, { lineBreak: false });

    doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
    doc.text(hotel.nama || 'Sans Hotel Roxy Jakarta', 34.35, hotelBoxY + 20.61, { lineBreak: false });
    doc.text(`Alamat: ${hotel.alamat || 'Jalan Biak No.40, RT.2/RW.6, Cideng, Kota Jakarta Pusat, Jakarta, Indonesia, Jakarta Pusat, Indonesia, 10150'}`, 34.35, hotelBoxY + 30.36, { lineBreak: false });
    doc.text(`Check-in: ${hotel.check_in || '28-07-2025'}`, 34.35, hotelBoxY + 40.11, { lineBreak: false });
    doc.text(`Durasi: ${hotel.durasi || '1 malam'}`, 34.35, hotelBoxY + 49.86, { lineBreak: false });

    // 7. Draw Table Header with dynamic columns
    const cols = data.cols || traveloka.getTableColumns(data, true);
    const tableYStart = 321.60 + addrOffset;
    let currentY = traveloka.drawTableHeader(doc, tableYStart, { isHotel: true, cols });
    let prevBottomY = tableYStart + 53.62;

    // 8. Draw Table Items
    const items = data.items || [];
    items.forEach((item, idx) => {
        const itemY = currentY;
        const noStr = item.no !== undefined && item.no !== null ? String(item.no) : String(idx + 1);
        const jenisStr = item.jenis || 'Akomodasi';
        const jmlStr = item.jml !== undefined && item.jml !== null ? String(item.jml) : '1';
        const hargaSatuanStr = formatRupiah(item.harga_satuan);
        const totalStr = formatRupiah(item.total);

        // Column 1: No.
        doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
        doc.text(noStr, cols.no, itemY, { lineBreak: false });

        // Column 2: Jenis Barang
        doc.text(jenisStr, cols.jenis, itemY, { lineBreak: false });

        // Column 3: Deskripsi (Support multiline deskripsi_lines)
        const descLines = Array.isArray(item.deskripsi_lines) && item.deskripsi_lines.length > 0 ?
                          item.deskripsi_lines :
                          (typeof item.deskripsi === 'string' && item.deskripsi.includes('\n') ?
                           item.deskripsi.split('\n') :
                           [item.deskripsi || `${hotel.nama || 'Hotel'}, ${item.room_type || 'Single Room with Breakfast'} - ${item.tamu_count || 1} tamu`]);

        descLines.forEach((dLine, dIdx) => {
            doc.text(dLine.trim(), cols.deskripsi, itemY + (dIdx * 9.75), { lineBreak: false });
        });

        // Column 4: Jml. (Center at 370.13)
        doc.text(jmlStr, cols.jml, itemY, { lineBreak: false });

        // Column 5: Harga Satuan (Right-aligned at 482.00)
        const hargaX = traveloka.getAmountX(doc, hargaSatuanStr, cols.hargaSatuan);
        doc.text(hargaSatuanStr, hargaX, itemY, { lineBreak: false });

        // Column 6: Total (Right-aligned at 562.80)
        const totalX = traveloka.getAmountX(doc, totalStr, cols.total);
        doc.text(totalStr, totalX, itemY, { lineBreak: false });

        const maxLines = Math.max(1, descLines.length);
        const rowHeight = item.row_height || (maxLines > 1 ? (maxLines * 9.75 + 15.0) : 24.75);
        const rowBottom = prevBottomY + rowHeight;

        // Draw grid borders for this row
        traveloka.drawRowBorders(doc, prevBottomY, rowBottom, cols);

        prevBottomY = rowBottom;
        currentY = prevBottomY + 4.86;
    });

    // 9. Draw Table Summary
    const totalAmountStr = formatRupiah(data.total_amount);
    traveloka.drawSummary(doc, prevBottomY, totalAmountStr, data.payment_method || 'BCA Virtual Account', {
        summaryVatStar: data.summary_vat_star || data.show_vat_footnote
    });

    // Footnote for VAT if present
    if (data.show_vat_footnote) {
        doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
        doc.text('*Sudah termasuk PPN, kecuali untuk pembayaran dengan Voucher Hadiah dan/atau Poin.', 28.35, 605.50 + addrOffset, { lineBreak: false });
    }

    // 10. Draw Bottom Footer & Help Center & QR Code
    traveloka.drawFooterBanner(doc, {
        showQr: data.show_qr !== false,
        footerTerms: data.footer_terms,
        footerX: data.footer_x
    });
}

module.exports = {
    renderHotelReceipt
};
