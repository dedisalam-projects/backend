const gojek = require('./index');
const { plotImage, wrapText, formatRupiah: coreFormatRupiah } = require('../../core/helpers');

/**
 * templates/gojek/gocar.js - Dynamic Template Layout Engine for GoCar Receipts
 *
 * Computes all layout box heights, card dimensions, image positions, and link
 * coordinates dynamically based on the receipt transaction content.
 * ZERO layout coordinates or technical box dimensions needed in the JSON!
 */

const FONT_FAMILY = 'DejaVuSans';

const formatRupiah = (val) => coreFormatRupiah(val, true);

function formatAlamat(alamat, maxWidth = 140.0) {
    if (Array.isArray(alamat)) {
        return alamat;
    }
    if (typeof alamat !== 'string') return [];
    const inputLines = alamat.split(/\r?\n/);
    const result = [];
    for (const line of inputLines) {
        if (!line.trim()) continue;
        const wrapped = wrapText(line.trim(), maxWidth, 'DejaVuSans', 8.83);
        result.push(...wrapped);
    }
    return result;
}

function getLayoutMetrics(pageData, pageIndex = 0) {
    const sections = (pageData && pageData.sections) || {};
    const coords = {};

    if (pageIndex === 1) {
        // ── HALAMAN 2 (Faktur Pajak GoCar) ───────────────────────────────────
        coords['header:0'] = 18.30;
        coords['header:1'] = 28.67;
        coords['greeting:0'] = 68.35;
        coords['greeting:1'] = 94.82;
        coords['total_box:0'] = 124.96;
        coords['total_box:1'] = 124.96;
        coords['total_box:2'] = 137.64;
        coords['total_box:3'] = 137.64;
        coords['total_box:4'] = 162.41;
        coords['total_box:5'] = 162.41;
        coords['payment_rows:0'] = 212.72;
        coords['payment_rows:1'] = 212.72;
        coords['payment_rows:2'] = 223.08;
        coords['payment_rows:3'] = 233.45;

        return {
            cardH: 193.36,
            coords
        };
    }

    // ── HALAMAN 1 (GoCar Struk) ──────────────────────────────────────────
    // 1. Header, Greeting, Top Total Box
    coords['header:0'] = 18.30;
    coords['header:1'] = 28.67;
    coords['greeting:0'] = 80.18;
    coords['greeting:1'] = 104.88;
    coords['total_box:0'] = 149.17;
    coords['total_box:1'] = 149.17;

    // 2. Payment Rows Box Metrics (Sequential Vertical Flow)
    const payTexts = (sections.payment_rows && sections.payment_rows.texts) || [];
    let curPayY = 220.49;
    let totalBayarY = 283.28;

    payTexts.forEach((t, i) => {
        if (i === 0) {
            coords[`payment_rows:${i}`] = 188.58;
            return;
        }
        if (t.align === 'right' || (t.text && (t.text.startsWith('Rp') || t.text.startsWith('-Rp')))) {
            coords[`payment_rows:${i}`] = curPayY;
        } else if (t.text && t.text.includes('Total pembayaran')) {
            curPayY = +(curPayY + 24.77).toFixed(2);
            coords[`payment_rows:${i}`] = curPayY;
            totalBayarY = curPayY;
        } else if (i === 1) {
            curPayY = 220.49;
            coords[`payment_rows:${i}`] = curPayY;
        } else {
            curPayY = +(curPayY + 12.67).toFixed(2);
            coords[`payment_rows:${i}`] = curPayY;
        }
    });

    const payBoxTop = 209.39;
    const hrY = +(totalBayarY - 7.83).toFixed(2);
    const payBoxBottom = +(totalBayarY + 33.45).toFixed(2);
    const payBoxH = +(payBoxBottom - payBoxTop).toFixed(2);
    const tripBoxTop = +(payBoxBottom + 40.61).toFixed(2);

    // 3. Trip Detail Box Metrics
    const tripTexts = (sections.trip_detail && sections.trip_detail.texts) || [];
    const jemputY = +(tripBoxTop + 12.83).toFixed(2);
    coords['trip_detail:0'] = +(tripBoxTop - 20.82).toFixed(2); // "Detail perjalanan"

    // Count driver lines
    const driverItems = tripTexts.filter(t => t.type === 'driver');
    const isDriverTwoLines = driverItems.length >= 2;

    let curRightY = jemputY;
    let sampaiY = +(jemputY + 95.72).toFixed(2);

    // First assign Left Column Y
    let driverIdx = 0;
    tripTexts.forEach((t, i) => {
        if (t.type === 'driver') {
            if (driverIdx === 0) coords[`trip_detail:${i}`] = +(jemputY - 0.04).toFixed(2);
            else coords[`trip_detail:${i}`] = +(jemputY + 11.19).toFixed(2);
            driverIdx++;
        } else if (t.type === 'car') {
            coords[`trip_detail:${i}`] = isDriverTwoLines ? +(jemputY + 24.77).toFixed(2) : +(jemputY + 13.52).toFixed(2);
        } else if (t.type === 'jarak') {
            coords[`trip_detail:${i}`] = isDriverTwoLines ? +(jemputY + 47.33).toFixed(2) : +(jemputY + 36.14).toFixed(2);
        } else if (t.type === 'waktu') {
            coords[`trip_detail:${i}`] = isDriverTwoLines ? +(jemputY + 61.35).toFixed(2) : +(jemputY + 50.15).toFixed(2);
        }
    });

    // Then assign Right Column Y
    let jemputHeaderIdx = 0;
    let jemputPlaceIdx = 0;
    let jemputAddrIdx = 0;
    let sampaiHeaderIdx = 0;
    let sampaiPlaceIdx = 0;
    let sampaiAddrIdx = 0;

    tripTexts.forEach((t, i) => {
        if (t.type === 'jemput_header') {
            if (jemputHeaderIdx === 0) curRightY = jemputY;
            else curRightY = +(curRightY + 10.37).toFixed(2);
            coords[`trip_detail:${i}`] = curRightY;
            jemputHeaderIdx++;
        } else if (t.type === 'jemput_place') {
            if (jemputPlaceIdx === 0) curRightY = +(curRightY + 12.63).toFixed(2);
            else curRightY = +(curRightY + 11.23).toFixed(2);
            coords[`trip_detail:${i}`] = curRightY;
            jemputPlaceIdx++;
        } else if (t.type === 'jemput_addr') {
            if (jemputAddrIdx === 0) curRightY = +(curRightY + 20.87).toFixed(2);
            else curRightY = +(curRightY + 10.37).toFixed(2);
            coords[`trip_detail:${i}`] = curRightY;
            jemputAddrIdx++;
        } else if (t.type === 'sampai_header') {
            if (sampaiHeaderIdx === 0) {
                curRightY = +(curRightY + 20.74).toFixed(2);
                sampaiY = curRightY;
            } else {
                curRightY = +(curRightY + 10.37).toFixed(2);
            }
            coords[`trip_detail:${i}`] = curRightY;
            sampaiHeaderIdx++;
        } else if (t.type === 'sampai_place') {
            if (sampaiPlaceIdx === 0) curRightY = +(curRightY + 12.63).toFixed(2);
            else curRightY = +(curRightY + 11.23).toFixed(2);
            coords[`trip_detail:${i}`] = curRightY;
            sampaiPlaceIdx++;
        } else if (t.type === 'sampai_addr') {
            if (sampaiAddrIdx === 0) curRightY = +(curRightY + 20.87).toFixed(2);
            else curRightY = +(curRightY + 10.37).toFixed(2);
            coords[`trip_detail:${i}`] = curRightY;
            sampaiAddrIdx++;
        }
    });

    const tripBoxBottom = +(curRightY + 18.09).toFixed(2);
    const tripBoxH = +(tripBoxBottom - tripBoxTop).toFixed(2);
    const cardH = +(tripBoxBottom + 10.17).toFixed(2);

    const jarakY = isDriverTwoLines ? +(jemputY + 47.33).toFixed(2) : +(jemputY + 36.14).toFixed(2);
    const waktuY = isDriverTwoLines ? +(jemputY + 61.35).toFixed(2) : +(jemputY + 50.15).toFixed(2);

    // 4. Disclaimer & Social Coordinates
    const discTexts = (sections.disclaimer && sections.disclaimer.texts) || [];
    let curDiscY = +(cardH + 50.85).toFixed(2);
    discTexts.forEach((t, i) => {
        const txt = t.text || '';
        if (txt === 'Bantuan' || txt === 'Laporkan masalah' || txt === 'Tentang GoCar') {
            coords[`disclaimer:${i}`] = +(cardH + 28.29).toFixed(2);
        } else {
            coords[`disclaimer:${i}`] = curDiscY;
            curDiscY = +(curDiscY + 10.37).toFixed(2);
        }
    });

    const socialTexts = (sections.social && sections.social.texts) || [];
    socialTexts.forEach((t, i) => {
        const txt = t.text || '';
        if (txt.includes('Kontak Gojek')) coords[`social:${i}`] = +(cardH + 113.25).toFixed(2);
        else if (txt.includes('Pasaraya')) coords[`social:${i}`] = +(cardH + 203.41).toFixed(2);
        else if (txt.includes('Baru, DKI')) coords[`social:${i}`] = +(cardH + 213.78).toFixed(2);
    });

    return {
        cardH,
        payBoxTop,
        payBoxBottom,
        payBoxH,
        hrY,
        tripBoxTop,
        tripBoxBottom,
        tripBoxH,
        jemputY,
        sampaiY,
        jarakY,
        waktuY,
        coords
    };
}

function drawImages(doc, pageData, pageIndex) {
    if (pageIndex === 0) {
        const m = getLayoutMetrics(pageData);

        // Header Logo
        plotImage(doc, 'logo_gocar', 127.88, 10.46, 120.01, 34.27);

        // Trip Icons (dynamically positioned next to corresponding text)
        plotImage(doc, 'icon_jemput', 304.63, +(m.jemputY - 0.06).toFixed(2), 9.6, 9.6);
        plotImage(doc, 'icon_antar',  304.63, +(m.sampaiY - 0.06).toFixed(2), 9.6, 9.6);
        plotImage(doc, 'icon_jarak',  137.39, +(m.jarakY - 0.06).toFixed(2),  9.6, 9.6);
        plotImage(doc, 'icon_waktu',  137.39, +(m.waktuY - 0.06).toFixed(2),  9.6, 9.6);

        // Footer Icons (dynamically anchored relative to card height)
        const footerIconY = +(m.cardH + 28.13).toFixed(2);
        plotImage(doc, 'icon_bantuan',  164.27, footerIconY, 8.35, 8.35);
        plotImage(doc, 'icon_laporkan', 249.72, footerIconY, 8.35, 8.35);
        plotImage(doc, 'icon_tentang',  364.73, footerIconY, 8.35, 8.35);

        // Social Media Icons
        const socialIconY = +(m.cardH + 134.61).toFixed(2);
        plotImage(doc, 'icon_ig', 217.46, socialIconY, 16.8, 16.8);
        plotImage(doc, 'icon_tw', 253.27, socialIconY, 16.8, 16.8);
        plotImage(doc, 'icon_fb', 289.08, socialIconY, 16.8, 16.8);
        plotImage(doc, 'icon_yt', 324.89, socialIconY, 16.8, 16.8);
        plotImage(doc, 'icon_in', 360.61, socialIconY, 16.8, 16.8);

        // Gojek Footer Logo
        const logoGojekY = +(m.cardH + 174.55).toFixed(2);
        plotImage(doc, 'logo_gojek', 266.81, logoGojekY, 61.25, 17.95);
    } else {
        // ── IMAGES HALAMAN 2 (Faktur Pajak GoCar) ────────────────────────────
        plotImage(doc, 'logo_gocar', 127.88, 10.46, 120.01, 34.27);
    }
}

function drawLinks(doc, pageData, pageIndex) {
    if (pageIndex === 0) {
        const m = getLayoutMetrics(pageData);
        const helpLinkY = +(m.cardH + 28.18).toFixed(2);

        // Footer Help Links
        doc.link(178.08, helpLinkY, 37.20, 10.32, gojek.GOJEK_URLS.help);
        doc.link(263.52, helpLinkY, 81.36, 10.32, gojek.GOJEK_URLS.report);
        doc.link(378.48, helpLinkY, 66.72, 10.32, gojek.GOJEK_URLS.feeInfo);

        // Social Media Links
        const socialLinkY = +(m.cardH + 143.14).toFixed(2);
        gojek.drawSocialLinks(doc, socialLinkY, 10.32);
    }
}

function renderLayout(doc, pageData, pageIndex) {
    if (pageIndex === 0) {
        const m = getLayoutMetrics(pageData);

        // ── HALAMAN 1 (GoCar) ────────────────────────────────────────────────
        gojek.drawCanvasAndCard(doc, 842.08, m.cardH, 57.32);

        // Total Box (y=141.04, h=28.32)
        gojek.drawTotalBox(doc, 141.04, 28.32);

        // Payment Rows Box (y=209.39, dynamic h)
        doc.rect(124.62, m.payBoxTop, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, m.payBoxBottom, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, m.payBoxTop, 0.57, +(m.payBoxBottom + 0.58 - m.payBoxTop).toFixed(2)).fill('#e8e8e8');
        doc.rect(469.67, m.payBoxTop, 0.58, +(m.payBoxBottom + 0.58 - m.payBoxTop).toFixed(2)).fill('#e8e8e8');
        gojek.drawHR(doc, 135.66, m.hrY, 323.55);

        // Trip Detail Box (dynamic top, dynamic h)
        doc.rect(124.62, m.tripBoxTop, 345.63, 0.58).fill('#e8e8e8');
        doc.rect(124.62, m.tripBoxBottom, 345.63, 0.57).fill('#e8e8e8');
        doc.rect(124.62, m.tripBoxTop, 0.57, +(m.tripBoxBottom + 0.57 - m.tripBoxTop).toFixed(2)).fill('#e8e8e8');
        doc.rect(469.67, m.tripBoxTop, 0.58, +(m.tripBoxBottom + 0.57 - m.tripBoxTop).toFixed(2)).fill('#e8e8e8');

        // Link Underlines
        const underlineY = +(m.cardH + 36.63).toFixed(2);
        gojek.drawLinkUnderlines(doc, [
            [178.09, underlineY, 215.25, underlineY],
            [263.64, underlineY, 345.05, underlineY],
            [378.56, underlineY, 445.28, underlineY]
        ]);
    } else {
        // ── HALAMAN 2 (Faktur Pajak GoCar) ───────────────────────────────────
        gojek.drawCanvasAndCard(doc, 250.29, 193.36, 57.32);
        gojek.drawInvoiceBox(doc, 113.87, 69.89);
        gojek.drawInvoiceHR(doc, 135.47, 154.57, 323.54);
    }

    drawImages(doc, pageData, pageIndex);
    drawLinks(doc, pageData, pageIndex);
}

function resolveBold(sectionId, item, index, pageIndex, allTexts) {
    if (item && item.bold !== undefined) return item.bold;

    if (pageIndex === 0) {
        if (sectionId === 'greeting') return index === 1;
        if (sectionId === 'total_box') return true;
        if (sectionId === 'payment_rows') {
            if (index === 0) return true;
            const txt = (item && item.text) || '';
            if (txt.includes('Total pembayaran')) return true;
            if (allTexts && index > 0) {
                const prev = allTexts[index - 1];
                if (prev && prev.text && prev.text.includes('Total pembayaran')) return true;
            }
            return false;
        }
        if (sectionId === 'trip_detail') {
            if (index === 0) return true;
            return false;
        }
    } else if (pageIndex === 1) {
        if (sectionId === 'greeting') return index === 0;
        if (sectionId === 'total_box') {
            const txt = (item && item.text) || '';
            if (txt.includes('Total biaya')) return true;
            if (allTexts && index > 0) {
                const prev = allTexts[index - 1];
                if (prev && prev.text && prev.text.includes('Total biaya')) return true;
            }
            return false;
        }
        if (sectionId === 'payment_rows') return index === 0;
    }
    return false;
}

function resolveSize(sectionId, item, index, pageIndex, isBold, allTexts) {
    if (item && item.size !== undefined) return item.size;
    if (pageIndex === 1) {
        if (item.text === 'Faktur') return 13.25;
        return 8.83;
    }
    if (sectionId === 'greeting') {
        if (index === 0) return 9.6;
        if (index === 1) return 12.58;
    }
    if (sectionId === 'total_box') return 10.37;
    if (sectionId === 'payment_rows') {
        if (item.text === 'Rincian pembayaran') return 9.6;
        return 8.83;
    }
    if (sectionId === 'trip_detail') {
        const bold = isBold !== undefined ? isBold : resolveBold(sectionId, item, index, pageIndex, allTexts);
        if (bold) return 9.6;
        return 8.83;
    }
    return 8.83;
}

function resolveAnchor(sectionId, item, index, pageIndex) {
    if (item && item.anchor !== undefined) return item.anchor;
    if (pageIndex === 1) {
        if (sectionId === 'greeting') return 126.15;
        if (sectionId === 'total_box') {
            return (item.align === 'right' || (item.text && (item.text.startsWith('Rp') || item.text.startsWith('-Rp')))) ? 458.94 : 135.47;
        }
        if (sectionId === 'payment_rows') {
            if (item.text && item.text.includes('PT GoTo')) return 156.97;
            if (item.text && item.text.includes('NPWP')) return 305.30;
            return 297.5;
        }
        return undefined;
    }
    // Page 0
    if (sectionId === 'greeting') return 127.88;
    if (sectionId === 'total_box') {
        if (item.text === 'Total dibayar') return 187.79;
        if (item.text && item.text.startsWith('Rp')) return 408.00;
    }
    if (sectionId === 'payment_rows') {
        if (item.text === 'Rincian pembayaran') return 127.02;
    }
    if (sectionId === 'disclaimer') {
        if (item.text === 'Bantuan') return 178.14;
        if (item.text === 'Laporkan masalah') return 263.64;
        if (item.text === 'Tentang GoCar') return 378.61;
        return 297.41;
    }
    if (sectionId === 'trip_detail') {
        if (item.text === 'Detail perjalanan') return 127.02;
        if (item.text && (item.text.includes('Jarak') || item.text.includes('Waktu'))) return 146.99;
        if (item.type === 'driver' || item.type === 'car') return 146.12;
        return 316.54;
    }
    return undefined;
}

function resolveAlign(sectionId, item, index, pageIndex) {
    if (item && item.align !== undefined) return item.align;
    if (sectionId === 'header') return 'right';
    if (pageIndex === 1) {
        if (sectionId === 'total_box') {
            if (item.text && (item.text.startsWith('Rp') || item.text.startsWith('-Rp'))) return 'right';
            return 'left';
        }
        if (sectionId === 'payment_rows') {
            if (item.text && (item.text.includes('PT GoTo') || item.text.includes('NPWP'))) return 'left';
            return 'center';
        }
    }
    if (sectionId === 'total_box' && item.text && item.text.startsWith('Rp')) {
        return 'right';
    }
    if (sectionId === 'disclaimer') {
        if (item.text === 'Bantuan' || item.text === 'Laporkan masalah' || item.text === 'Tentang GoCar') {
            return 'left';
        }
        return 'center';
    }
    if (sectionId === 'social') return 'center';
    return item.align || 'left';
}

function resolveColor(sectionId, item, index, pageIndex) {
    if (item && item.color !== undefined) return item.color;
    if (sectionId === 'header') return '#ffffff';
    if (item.text === 'Bantuan' || item.text === 'Laporkan masalah' || item.text === 'Tentang GoCar') {
        return '#0000ee';
    }
    if (pageIndex === 0 && sectionId === 'total_box' && item.text && item.text.startsWith('Rp')) {
        return '#008000';
    }
    return '#000000';
}

function resolveY(sectionId, item, index, pageIndex, cardH, currentY, metrics) {
    if (currentY !== undefined) return currentY;
    if (metrics && metrics.coords) {
        const key = `${sectionId}:${index}`;
        if (metrics.coords[key] !== undefined) {
            return metrics.coords[key];
        }
    }
    if (pageIndex === 0) {
        if (item.text === 'Bantuan' || item.text === 'Laporkan masalah' || item.text === 'Tentang GoCar') {
            return +(cardH + 28.29).toFixed(2);
        }
        if (item.text && item.text.startsWith('Perjalanan ini')) return +(cardH + 50.85).toFixed(2);
        if (item.text && item.text.startsWith('dibayarkan ketika')) return +(cardH + 61.22).toFixed(2);
        if (item.text && item.text.startsWith('diberikan setelah')) return +(cardH + 71.59).toFixed(2);
        if (item.text === 'ini.') return +(cardH + 81.96).toFixed(2);
        if (item.text && item.text.startsWith('Kontak Gojek')) return +(cardH + 113.25).toFixed(2);
        if (item.text && item.text.startsWith('Pasaraya Blok M')) return +(cardH + 203.41).toFixed(2);
        if (item.text && item.text.startsWith('Baru, DKI Jakarta')) return +(cardH + 213.78).toFixed(2);
    }
    return currentY;
}

function resolveW(sectionId, item, index, pageIndex) {
    return undefined; // Always compute dynamically
}

function enrichPageData(pageData, pageIndex) {
    let p = pageData;
    const sections = {};

    // Universal header (Page 1 and Page 2)
    const headerData = p.header || {};
    sections.header = {
        texts: [
            { text: headerData.tanggal || '', align: 'right', anchor: 467.0 },
            { text: headerData.id_pesanan ? (headerData.id_pesanan.startsWith('ID pesanan:') ? headerData.id_pesanan : `ID pesanan: ${headerData.id_pesanan}`) : '', align: 'right', anchor: 467.0 }
        ]
    };

    if (pageIndex === 0) {
        // ── HALAMAN 1 (GoCar Struk) ──────────────────────────────────────────
        // 1. greeting
        const greetingData = p.greeting || {};
        const nama = greetingData.nama || greetingData.text || '';
        sections.greeting = {
            texts: [
                { text: `Hai ${nama},`, size: 9.6, anchor: 127.88 },
                { text: 'Makasih udah pesan GoCar', bold: true, size: 12.58, anchor: 127.88 }
            ]
        };

        // 2. payment_rows & calculation
        let calculatedTotal = 0;
        let paymentMethod = p.metode_pembayaran || 'Bayar pakai GoPay Tabungan';
        const payTexts = [
            { text: 'Rincian pembayaran', bold: true, size: 9.6, anchor: 127.02 }
        ];

        if (p.payment_rows && Array.isArray(p.payment_rows)) {
            p.payment_rows.forEach(r => {
                if (r.item) {
                    if (r.item.toLowerCase().includes('total pembayaran')) return;
                    payTexts.push({ text: r.item, anchor: 135.66 });
                    if (r.nominal !== undefined) {
                        if (typeof r.nominal === 'number') calculatedTotal += r.nominal;
                        payTexts.push({ text: formatRupiah(r.nominal), align: 'right', anchor: 459.16 });
                    }
                } else if (r.metode) {
                    paymentMethod = r.metode.startsWith('Bayar pakai') ? r.metode : `Bayar pakai ${r.metode}`;
                }
            });
        }

        // 2. top total_box
        const finalTotal = p.total_bayar !== undefined ? p.total_bayar : (p.total !== undefined ? p.total : calculatedTotal);
        const finalTotalStr = formatRupiah(finalTotal);

        sections.total_box = {
            texts: [
                { text: 'Total dibayar', bold: true, size: 10.37, anchor: 187.79 },
                { text: finalTotalStr, bold: true, size: 10.37, color: '#008000', align: 'right', anchor: 408.00 }
            ]
        };

        // 3. payment_rows
        payTexts.push({ text: 'Total pembayaran', bold: true, anchor: 135.66 });
        payTexts.push({ text: finalTotalStr, bold: true, align: 'right', anchor: 459.16 });
        payTexts.push({ text: paymentMethod, anchor: 135.66 });
        payTexts.push({ text: finalTotalStr, align: 'right', anchor: 459.16 });

        sections.payment_rows = { texts: payTexts };

        // 4. trip_detail
        const td = p.trip_detail || {};
        const tripTexts = [
            { text: 'Detail perjalanan', bold: true, size: 9.6, anchor: 127.02 }
        ];

        // Left column
        if (td.pengemudi) {
            const driverLines = wrapText(td.pengemudi, 135.0, 'DejaVuSans-Bold', 9.6);
            driverLines.forEach(l => tripTexts.push({ text: l, type: 'driver', bold: true, size: 9.6, anchor: 146.12 }));
        }

        if (td.kendaraan) {
            let vehStr = '';
            if (typeof td.kendaraan === 'object' && td.kendaraan !== null) {
                const plat = td.kendaraan.plat ? td.kendaraan.plat.trim() : '';
                const tipe = td.kendaraan.tipe ? td.kendaraan.tipe.trim() : '';
                vehStr = plat && tipe ? `${plat} • ${tipe}` : (plat || tipe);
            } else {
                vehStr = td.kendaraan;
            }
            if (vehStr) tripTexts.push({ text: vehStr, type: 'car', anchor: 146.12 });
        }

        if (td.jarak) {
            const jStr = td.jarak.trim();
            tripTexts.push({ text: jStr.includes('Jarak') ? ` ${jStr}` : ` Jarak ${jStr}`, type: 'jarak', anchor: 146.99 });
        }

        if (td.waktu) {
            const wStr = td.waktu.trim();
            tripTexts.push({ text: wStr.includes('Waktu') ? ` ${wStr}` : ` Waktu perjalanan ${wStr}`, type: 'waktu', anchor: 146.99 });
        }

        // Right column
        if (td.penjemputan) {
            const jemput = td.penjemputan;
            const headerStr = `Dijemput ${jemput.tanggal} jam ${jemput.jam} dari`;
            const headerLines = wrapText(headerStr, 140.0, 'DejaVuSans', 8.83);
            headerLines.forEach(l => tripTexts.push({ text: l, type: 'jemput_header', anchor: 316.54 }));

            if (jemput.tempat) {
                const placeLines = wrapText(jemput.tempat, 135.0, 'DejaVuSans-Bold', 9.6);
                placeLines.forEach(l => tripTexts.push({ text: l, type: 'jemput_place', bold: true, size: 9.6, anchor: 316.54 }));
            }

            if (jemput.alamat) {
                const addrLines = formatAlamat(jemput.alamat, 140.0);
                addrLines.forEach(l => tripTexts.push({ text: l, type: 'jemput_addr', anchor: 316.54 }));
            }
        }

        if (td.tujuan) {
            const sampai = td.tujuan;
            const headerStr = `Sampai ${sampai.tanggal} jam ${sampai.jam} di`;
            const headerLines = wrapText(headerStr, 140.0, 'DejaVuSans', 8.83);
            headerLines.forEach(l => tripTexts.push({ text: l, type: 'sampai_header', anchor: 316.54 }));

            if (sampai.tempat) {
                const placeLines = wrapText(sampai.tempat, 135.0, 'DejaVuSans-Bold', 9.6);
                placeLines.forEach(l => tripTexts.push({ text: l, type: 'sampai_place', bold: true, size: 9.6, anchor: 316.54 }));
            }

            if (sampai.alamat) {
                const addrLines = formatAlamat(sampai.alamat, 140.0);
                addrLines.forEach(l => tripTexts.push({ text: l, type: 'sampai_addr', anchor: 316.54 }));
            }
        }

        sections.trip_detail = { texts: tripTexts };

        // 5. disclaimer
        sections.disclaimer = {
            texts: [
                { text: 'Bantuan' },
                { text: 'Laporkan masalah' },
                { text: 'Tentang GoCar' },
                { text: 'Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang' },
                { text: 'dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang' },
                { text: 'diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran' },
                { text: 'ini.' }
            ]
        };

        // 6. social
        sections.social = {
            texts: [
                { text: 'Kontak Gojek lewat' },
                { text: 'Pasaraya Blok M GD B, 7th Floor, Kebayoran' },
                { text: 'Baru, DKI Jakarta Indonesia 12160' }
            ]
        };

    } else if (pageIndex === 1) {
        // ── HALAMAN 2 (Faktur Pajak GoCar) ───────────────────────────────────
        // 1. greeting (MUST BE BEFORE total_box!)
        sections.greeting = {
            texts: [
                { text: 'Faktur', bold: true, size: 13.25, anchor: 126.15 },
                { text: 'Semua jumlah sudah termasuk PPN', size: 8.83, anchor: 126.15 }
            ]
        };

        // 2. total_box (Faktur rows)
        const tbTexts = [];
        let calculatedFeeTotal = 0;
        let hasTotalRow = false;

        if (Array.isArray(p.total_box)) {
            p.total_box.forEach(r => {
                let label = r.item || '';
                if (label === 'Diskon') label = 'Diskon biaya jasa aplikasi';
                if (label.toLowerCase().includes('total')) hasTotalRow = true;

                tbTexts.push({ text: label, anchor: 135.47 });
                if (r.nominal !== undefined) {
                    if (typeof r.nominal === 'number') calculatedFeeTotal += r.nominal;
                    tbTexts.push({ text: formatRupiah(r.nominal), align: 'right', anchor: 458.94 });
                }
            });

            if (!hasTotalRow) {
                tbTexts.push({ text: 'Total biaya jasa aplikasi', bold: true, anchor: 135.47 });
                tbTexts.push({ text: formatRupiah(calculatedFeeTotal), bold: true, align: 'right', anchor: 458.94 });
            }
        } else if (typeof p.total_box === 'object') {
            const tb = p.total_box;
            const fee = tb.biaya_jasa_aplikasi !== undefined ? tb.biaya_jasa_aplikasi : 0;
            const diskon = tb.diskon !== undefined ? tb.diskon : 0;
            const total = tb.total !== undefined ? tb.total : (fee + diskon);

            tbTexts.push({ text: 'Biaya jasa aplikasi', anchor: 135.47 });
            tbTexts.push({ text: formatRupiah(fee), align: 'right', anchor: 458.94 });
            tbTexts.push({ text: 'Diskon biaya jasa aplikasi', anchor: 135.47 });
            tbTexts.push({ text: formatRupiah(diskon), align: 'right', anchor: 458.94 });
            tbTexts.push({ text: 'Total biaya jasa aplikasi', bold: true, anchor: 135.47 });
            tbTexts.push({ text: formatRupiah(total), bold: true, align: 'right', anchor: 458.94 });
        }

        sections.total_box = { texts: tbTexts };

        // 3. payment_rows (Company info)
        sections.payment_rows = {
            texts: [
                { text: 'PT GoTo Gojek Tokopedia Tbk', bold: true, anchor: 156.97 },
                { text: ' • NPWP: 0745704361064000', anchor: 305.30 },
                { text: 'Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai,', align: 'center', anchor: 297.5 },
                { text: 'Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160', align: 'center', anchor: 297.5 }
            ]
        };
    }

    return Object.assign({}, pageData, { sections });
}

module.exports = {
    FONT_FAMILY,
    SECTION_DEFAULTS: gojek.SECTION_DEFAULTS,
    getLayoutMetrics,
    renderLayout,
    enrichPageData,
    resolveBold,
    resolveSize,
    resolveAnchor,
    resolveAlign,
    resolveColor,
    resolveY,
    resolveW
};
