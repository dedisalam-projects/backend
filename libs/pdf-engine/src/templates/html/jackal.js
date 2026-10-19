const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { normalizeJackalData } = require('../../normalizers/jackal');

const ENGINE_DIR = path.resolve(__dirname, '../../../');

function getLogoBase64() {
    const logoPath = path.join(ENGINE_DIR, 'img/logo_jackal.png');
    if (fs.existsSync(logoPath)) {
        return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }
    return '';
}

/**
 * Render Jackal Holidays HTML for dompdf 2.0.3
 * @param {Object} rawData
 * @returns {Promise<string>} HTML string
 */
async function renderJackalHtml(rawData) {
    const data = normalizeJackalData(rawData);
    const logoSrc = getLogoBase64();

    const qrPayload = data.passengers[0]?.qr_code || data.booking_code;
    let qrSrc = '';
    try {
        qrSrc = await QRCode.toDataURL(qrPayload, {
            margin: 0,
            width: 150,
            errorCorrectionLevel: 'M'
        });
    } catch (e) {
        console.error('Error generating QR for Jackal HTML:', e.message);
    }

    const pay = data.payment || {};
    const pass0 = data.passengers[0] || {};
    const tick0 = data.tickets[0] || {};

    const termsP2 = data.terms_page2 || [];
    const termsP3 = data.terms_page3 || [];

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Jackal Holidays - Tiket Elektronik</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 35pt;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: Helvetica, Arial, sans-serif;
            font-size: 8.2pt;
            line-height: 1.35;
            color: #000000;
            background: #ffffff;
        }

        .page-break {
            page-break-after: always;
        }

        .header-logo {
            text-align: center;
            margin-bottom: 12pt;
        }

        .header-logo img {
            width: 116.29pt;
            height: auto;
        }

        .doc-title {
            text-align: center;
            font-size: 15.0pt;
            font-weight: bold;
            margin-bottom: 16pt;
        }

        .section-header {
            background-color: #ededed;
            font-weight: bold;
            font-size: 9.0pt;
            padding: 4.5pt 8pt;
            border: 0.75pt solid #cdcdcd;
            border-bottom: none;
        }

        .section-box {
            border: 0.75pt solid #cdcdcd;
            padding: 8pt;
            margin-bottom: 14pt;
        }

        table.info-table {
            width: 100%;
            border-collapse: collapse;
        }

        table.info-table td {
            vertical-align: top;
            padding: 2pt 4pt;
            font-size: 8.2pt;
        }

        .booking-code-box {
            width: 25%;
            vertical-align: middle;
            text-align: left;
            padding-left: 8pt;
        }

        .booking-code-title {
            font-size: 8.2pt;
            margin-bottom: 4pt;
        }

        .booking-code-val {
            font-size: 11.2pt;
            font-weight: bold;
        }

        table.grid-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4pt;
        }

        table.grid-table th {
            text-align: left;
            font-weight: bold;
            font-size: 8.2pt;
            padding: 4pt;
            border-bottom: 0.75pt solid #cdcdcd;
        }

        table.grid-table td {
            font-size: 8.2pt;
            padding: 6pt 4pt;
            vertical-align: middle;
        }

        .link-blue {
            color: #0770cd;
            text-decoration: underline;
        }

        .bold {
            font-weight: bold;
        }

        .terms-title {
            font-size: 9.7pt;
            font-weight: bold;
            margin-top: 10pt;
            margin-bottom: 6pt;
        }

        .terms-point {
            margin-bottom: 4pt;
            font-size: 8.2pt;
            display: flex;
        }

        .terms-num {
            width: 16pt;
            flex-shrink: 0;
            font-weight: normal;
        }

        .terms-text {
            flex-grow: 1;
        }

        .divider {
            border-top: 0.75pt solid #666666;
            margin: 12pt 0;
        }
    </style>
</head>
<body>

    <!-- PAGE 1: E-TICKET -->
    <div>
        <div class="header-logo">
            <img src="${logoSrc}" alt="Jackal Holidays" />
        </div>
        <div class="doc-title">TIKET ELEKTRONIK</div>

        <!-- Section 1: Detail Pemesanan -->
        <div class="section-header">Detail Pemesanan</div>
        <div class="section-box">
            <table class="info-table">
                <tr>
                    <td class="booking-code-box">
                        <div class="booking-code-title">Kode Booking:</div>
                        <div class="booking-code-val">${data.booking_code}</div>
                    </td>
                    <td>
                        <table class="info-table">
                            <tr><td class="bold" style="width: 35%;">Tanggal Booking</td><td>: ${data.booking_date}</td></tr>
                            <tr><td class="bold">Nama</td><td>: ${data.customer.name}</td></tr>
                            <tr><td class="bold">Alamat</td><td>: ${data.customer.address}</td></tr>
                            <tr><td class="bold">No. Telp</td><td>: ${data.customer.phone}</td></tr>
                            <tr><td class="bold">Email</td><td>: ${data.customer.email}</td></tr>
                            <tr><td class="bold">OTP</td><td>: ${data.customer.otp}</td></tr>
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Section 2: Detail Keberangkatan -->
        <div class="section-header">Detail Keberangkatan</div>
        <div class="section-box">
            <table class="info-table">
                <tr>
                    <td style="width: 55%;">
                        <table class="info-table">
                            <tr><td class="bold" style="width: 32%;">Point Keberangkatan</td><td>: ${data.departure.point}</td></tr>
                            <tr><td class="bold">Alamat Outlet</td><td>: ${data.departure.address}</td></tr>
                            <tr><td class="bold">Maps Point Keberangkatan</td><td>: <a class="link-blue" href="${data.departure.maps_url}">Lihat Maps</a></td></tr>
                            <tr><td class="bold">Point Tujuan</td><td>: ${data.destination.point}</td></tr>
                            <tr><td class="bold">Alamat Outlet</td><td>: ${data.destination.address}</td></tr>
                            <tr><td class="bold">Maps Point Tujuan</td><td>: <a class="link-blue" href="${data.destination.maps_url}">Lihat Maps</a></td></tr>
                        </table>
                    </td>
                    <td style="width: 45%;">
                        <table class="info-table">
                            <tr><td class="bold" style="width: 45%;">Tanggal Berangkat</td><td>: ${data.departure.date}</td></tr>
                            <tr><td class="bold">Jam Berangkat</td><td>: ${data.departure.time}</td></tr>
                            ${data.fleet ? `<tr><td class="bold">Armada</td><td>: ${data.fleet}</td></tr>` : ''}
                            ${data.vehicle_code ? `<tr><td class="bold">Kode Kendaraan</td><td>: ${data.vehicle_code}</td></tr>` : ''}
                            ${data.vehicle_plate ? `<tr><td class="bold">Plat Kendaraan</td><td>: ${data.vehicle_plate}</td></tr>` : ''}
                        </table>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Section 3: Detail Penumpang -->
        <div class="section-header">Detail Penumpang</div>
        <div class="section-box">
            <table class="grid-table">
                <thead>
                    <tr>
                        <th style="width: 20%;">QR/Boarding</th>
                        <th style="width: 30%;">Nama</th>
                        <th style="width: 15%;">Kursi</th>
                        <th style="width: 15%;">Rute</th>
                        <th style="width: 20%;">Keberangkatan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${qrSrc ? `<img src="${qrSrc}" style="width: 60pt; height: 60pt;" alt="QR" />` : ''}</td>
                        <td>${pass0.name || '-'}</td>
                        <td>${pass0.seat || '-'}</td>
                        <td>${pass0.route || '-'}</td>
                        <td>${pass0.schedule || '-'}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Section 4: Detail Harga -->
        <div class="section-header">Detail Harga</div>
        <div class="section-box">
            <table class="grid-table">
                <thead>
                    <tr>
                        <th style="width: 25%;">Nomor Tiket</th>
                        <th style="width: 15%;">Nomor Kursi</th>
                        <th style="width: 20%;">Rute</th>
                        <th style="width: 25%;">Keberangkatan</th>
                        <th style="width: 15%; text-align: right;">Harga Tiket</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${tick0.ticket_no || '-'}</td>
                        <td>${tick0.seat || '-'}</td>
                        <td>${tick0.route || '-'}</td>
                        <td>${tick0.schedule || '-'}</td>
                        <td style="text-align: right;">${tick0.price_formatted || 'Rp 0'}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="page-break"></div>

    <!-- PAGE 2: TOTAL SUMMARY, PAYMENT & TERMS PART 1 -->
    <div>
        <!-- Price Summary Box -->
        <div class="section-box" style="margin-top: 10pt;">
            <table class="info-table" style="width: 45%; margin-left: auto;">
                <tr><td class="bold">Total Harga</td><td style="text-align: right;">${pay.total_price_formatted || 'Rp 0'}</td></tr>
                <tr><td class="bold">Admin Fee</td><td style="text-align: right;">${pay.admin_fee_formatted || 'Rp 0'}</td></tr>
                <tr><td class="bold">Diskon</td><td style="text-align: right;">${pay.discount_formatted || 'Rp 0'}</td></tr>
                <tr><td class="bold">Total Bayar</td><td style="text-align: right; font-weight: bold;">${pay.total_paid_formatted || 'Rp 0'}</td></tr>
            </table>
        </div>

        <!-- Detail Pembayaran -->
        <div class="section-header">Detail Pembayaran</div>
        <div class="section-box">
            <table class="info-table">
                <tr>
                    <td class="bold" style="width: 25%;">Metode Pembayaran :</td>
                    <td>${pay.method || '-'}</td>
                    <td class="bold" style="width: 25%;">Waktu Pembayaran :</td>
                    <td>${pay.time || '-'}</td>
                </tr>
            </table>
        </div>

        <div class="divider"></div>

        <!-- Terms Page 2 -->
        ${termsP2.map(sec => `
            <div class="terms-title">${sec.title}</div>
            ${sec.points.map((pt, idx) => `
                <div class="terms-point">
                    <span class="terms-num">${idx + 1}.</span>
                    <span class="terms-text">${pt}</span>
                </div>
            `).join('')}
        `).join('')}
    </div>

    <div class="page-break"></div>

    <!-- PAGE 3: TERMS PART 2 & CALL CENTER -->
    <div style="margin-top: 10pt;">
        ${termsP3.map(sec => `
            <div class="terms-title">${sec.title}</div>
            ${sec.points.map((pt, idx) => `
                <div class="terms-point">
                    <span class="terms-num">${idx + 1}.</span>
                    <span class="terms-text">${pt}</span>
                </div>
            `).join('')}
        `).join('')}
    </div>

</body>
</html>`;
}

module.exports = {
    renderJackalHtml
};
