const traveloka = require('./index');
const { formatRupiah } = require('../../core/helpers');

/**
 * templates/traveloka/bus.js - Layout Engine for Tiket Bus & Shuttle Receipts
 *
 * Implements exact grid coordinates and multiline text wrapping for
 * shuttle routes, departure times, operators, and ticket insurance.
 */

function renderBusReceipt(doc, data) {
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

    // 5. Draw Passenger Section (Handle optional DATA PENUMPANG header)
    const hasDataPenumpang = data.has_data_penumpang === true;
    let tableYStart = 235.35;

    if (hasDataPenumpang) {
        // Gray box for DATA PENUMPANG
        doc.rect(28.35, 205.20, traveloka.DIMENSIONS.contentWidth, 15.75).fill(traveloka.COLORS.bgGray);
        doc.font('TravelokaFont-Bold').fontSize(9.0).fillColor(traveloka.COLORS.textBlack);
        doc.text('DATA PENUMPANG', 34.35, 209.46, { lineBreak: false });

        doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
        if (Array.isArray(data.passenger_spans) && data.passenger_spans.length > 0) {
            data.passenger_spans.forEach(sp => {
                doc.text(sp.text, sp.x, 225.81, { lineBreak: false });
            });
        } else {
            const passengerText = data.passenger || 'MR Dedi Salam Permana (Dewasa)';
            doc.text(passengerText, 34.35, 225.81, { lineBreak: false });
        }

        tableYStart = 254.10;
    } else {
        doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
        if (Array.isArray(data.passenger_spans) && data.passenger_spans.length > 0) {
            data.passenger_spans.forEach(sp => {
                doc.text(sp.text, sp.x, 207.06, { lineBreak: false });
            });
        } else {
            const passengerName = data.passenger || (data.customer && data.customer.nama) || 'Dedi Salam Permana';
            const prefix = passengerName.startsWith('MR ') || passengerName.startsWith('Tn. ') ? '' : 'MR ';
            doc.text(`${prefix}${passengerName}`, 34.35, 207.06, { lineBreak: false });
        }

        tableYStart = 235.35;
    }

    // 6. Draw Table Header with dynamic columns
    const cols = data.cols || traveloka.getTableColumns(data, false);
    let currentY = traveloka.drawTableHeader(doc, tableYStart, { cols });
    let prevBottomY = tableYStart + 53.70;

    // 7. Draw Table Items
    const items = data.items || [];
    items.forEach((item, idx) => {
        const itemY = currentY;
        const noStr = item.no !== undefined && item.no !== null ? String(item.no) : String(idx + 1);
        const jmlStr = item.jml !== undefined && item.jml !== null ? String(item.jml) : '1';
        const hargaSatuanStr = formatRupiah(item.harga_satuan);
        const totalStr = formatRupiah(item.total);

        // Column 1: No.
        doc.font('TravelokaFont').fontSize(7.5).fillColor(traveloka.COLORS.textBlack);
        if (noStr) {
            doc.text(noStr, cols.no, itemY, { lineBreak: false });
        }

        // Column 2: Jenis Barang (can be multiline)
        const jenisLines = Array.isArray(item.jenis_lines) ? item.jenis_lines :
                           (typeof item.jenis === 'string' ? item.jenis.split('\n') : ['Tiket Bus']);
        jenisLines.forEach((jLine, jIdx) => {
            doc.text(jLine.trim(), cols.jenis, itemY + (jIdx * 9.75), { lineBreak: false });
        });

        // Column 3: Deskripsi (Multiline)
        let descLines = [];
        if (Array.isArray(item.deskripsi_lines)) {
            descLines = item.deskripsi_lines;
        } else if (typeof item.deskripsi === 'string') {
            descLines = item.deskripsi.split('\n');
        } else {
            // Build structured shuttle description
            if (item.operator) descLines.push(`${item.operator} (${item.tipe || 'Shuttle'})`);
            if (item.rute) {
                // If route exceeds 50 chars, split into two lines
                if (item.rute.length > 55) {
                    const splitPoint = item.rute.lastIndexOf(' ', 55);
                    descLines.push(item.rute.substring(0, splitPoint));
                    descLines.push(item.rute.substring(splitPoint + 1));
                } else {
                    descLines.push(item.rute);
                }
            }
            if (item.tgl_berangkat) {
                descLines.push(''); // blank separator line
                descLines.push(`Tanggal Keberangkatan: ${item.tgl_berangkat}`);
            }
            if (item.jam_berangkat) descLines.push(`Jam Keberangkatan: ${item.jam_berangkat}`);
            if (item.tgl_tiba) descLines.push(`Tanggal Kedatangan: ${item.tgl_tiba}`);
            if (item.jam_tiba) descLines.push(`Jam Kedatangan: ${item.jam_tiba}`);
        }

        descLines.forEach((line, lIdx) => {
            if (line.trim().length > 0) {
                doc.text(line.trim(), cols.deskripsi, itemY + (lIdx * 9.75), { lineBreak: false });
            }
        });

        // Column 4: Jml. (Center at 370.13)
        if (jmlStr) {
            doc.text(jmlStr, cols.jml, itemY, { lineBreak: false });
        }

        // Column 5: Harga Satuan (Right-aligned at 482.00)
        if (hargaSatuanStr) {
            const hargaX = traveloka.getAmountX(doc, hargaSatuanStr, cols.hargaSatuan);
            doc.text(hargaSatuanStr, hargaX, itemY, { lineBreak: false });
        }

        // Column 6: Total (Right-aligned at 562.80)
        if (totalStr) {
            const totalX = traveloka.getAmountX(doc, totalStr, cols.total);
            doc.text(totalStr, totalX, itemY, { lineBreak: false });
        }

        // Calculate row height
        const maxLines = Math.max(jenisLines.length, descLines.length, 1);
        const contentHeight = maxLines * 9.75;
        const rowHeight = item.row_height || (maxLines > 3 ? (contentHeight + 15.0) : 24.75);
        const rowBottom = prevBottomY + rowHeight;

        // Draw grid borders for this row
        traveloka.drawRowBorders(doc, prevBottomY, rowBottom, cols);

        prevBottomY = rowBottom;
        currentY = prevBottomY + 4.86;
    });

    // 8. Draw Table Summary
    const totalAmountStr = formatRupiah(data.total_amount);
    traveloka.drawSummary(doc, prevBottomY, totalAmountStr, data.payment_method || 'GoPay /GoPay Tabungan', {
        summaryVatStar: data.summary_vat_star === true
    });

    // 9. Draw Bottom Footer & Help Center & QR Code
    traveloka.drawFooterBanner(doc, {
        showQr: data.show_qr !== false,
        footerTerms: data.footer_terms,
        footerX: data.footer_x
    });
}

module.exports = {
    renderBusReceipt
};
