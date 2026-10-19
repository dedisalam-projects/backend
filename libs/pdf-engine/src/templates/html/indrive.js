const fs = require('fs');
const path = require('path');
const { normalizeIndriveData, formatIndriveFare } = require('../../normalizers/indrive');

const ENGINE_DIR = path.resolve(__dirname, '../../../');

function getLogoBase64() {
    const logoPath = path.join(ENGINE_DIR, 'img/logo_indrive.png');
    if (fs.existsSync(logoPath)) {
        return `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
    }
    return '';
}

/**
 * Render inDrive HTML for WeasyPrint 68.1
 * @param {Object} rawData
 * @returns {string} HTML string
 */
function renderIndriveHtml(rawData) {
    const data = normalizeIndriveData(rawData);
    const logoSrc = getLogoBase64();
    const formattedFare = formatIndriveFare(data.fare);

    const isMotor = (data.service || '').toLowerCase().includes('motor');
    const vehicleLabel = isMotor ? 'Detail motor' : 'Detail mobil';

    return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Resi (Faktur pajak) untuk perjalanan Anda</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 20mm;
            @bottom-center {
                content: none;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 10.2pt;
            line-height: 1.5;
            color: #000000;
            background: #ffffff;
        }

        .header-logo {
            text-align: center;
            margin-bottom: 25pt;
        }

        .header-logo img {
            width: 212.25pt;
            height: auto;
        }

        .receipt-title {
            text-align: center;
            font-size: 10.2pt;
            font-weight: bold;
            margin-bottom: 3pt;
        }

        .invoice-number-wrap {
            text-align: center;
            font-size: 10.2pt;
            margin-bottom: 24pt;
        }

        .invoice-label {
            font-weight: bold;
        }

        .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 24pt;
        }

        .meta-left {
            font-size: 10.2pt;
        }

        .meta-right {
            font-size: 10.2pt;
            text-align: right;
        }

        .bold {
            font-weight: bold;
        }

        .driver-info {
            margin-bottom: 24pt;
            line-height: 1.5;
        }

        .trip-section {
            margin-bottom: 24pt;
            line-height: 1.4;
        }

        .trip-field {
            margin-bottom: 12pt;
        }

        .trip-field .label {
            font-weight: bold;
            display: block;
            margin-bottom: 2pt;
        }

        .trip-field .val {
            display: block;
        }

        table.fare-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15pt;
            margin-bottom: 35pt;
        }

        table.fare-table th {
            background-color: #f2f3f5;
            font-weight: bold;
            text-align: left;
            padding: 8pt 6pt;
            font-size: 10.2pt;
        }

        table.fare-table th.amount,
        table.fare-table td.amount {
            text-align: right;
        }

        table.fare-table td {
            padding: 10pt 6pt;
            font-size: 10.2pt;
            border-bottom: 1px solid #e2e4e8;
        }

        .footer-summary {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10.2pt;
        }

        .footer-summary .total-val {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header-logo">
        <img src="${logoSrc}" alt="inDrive" />
    </div>

    <div class="receipt-title">Resi untuk layanan Anda</div>
    <div class="invoice-number-wrap">
        <span class="invoice-label">Nomor faktur:</span> ${data.invoice_number}
    </div>

    <div class="meta-row">
        <div class="meta-left"><span class="bold">Ke:</span> ${data.recipient_name}</div>
        <div class="meta-right"><span class="bold">Tanggal:</span> ${data.invoice_date}</div>
    </div>

    <div class="driver-info">
        <div><span class="bold">Jenis order:</span> ${data.order_type}</div>
        <div><span class="bold">Nama Pengemudi:</span> ${data.driver_name}</div>
        <div><span class="bold">${vehicleLabel}:</span> ${data.vehicle_detail}</div>
    </div>

    <div class="trip-section">
        <div class="trip-field">
            <span class="label">Tanggal Perjalanan:</span>
            <span class="val">${data.trip_date}</span>
        </div>
        <div class="trip-field">
            <span class="label">Penjemputan:</span>
            <span class="val">${data.pickup.location}</span>
            <span class="val">${data.pickup.time}</span>
        </div>
        <div class="trip-field">
            <span class="label">Pengantaran:</span>
            <span class="val">${data.dropoff.location}</span>
            <span class="val">${data.dropoff.time}</span>
        </div>
        <div class="trip-field">
            <span class="label">Jarak:</span>
            <span class="val">${data.distance}</span>
        </div>
    </div>

    <table class="fare-table">
        <thead>
            <tr>
                <th>Deskripsi</th>
                <th class="amount">Jumlah</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>${data.description}</td>
                <td class="amount">${formattedFare}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-summary">
        <div><span class="bold">Metode pembayaran:</span> ${data.payment_method}</div>
        <div class="total-val"><span class="bold">Total Jumlah:</span> ${formattedFare}</div>
    </div>
</body>
</html>`;
}

module.exports = {
    renderIndriveHtml
};
