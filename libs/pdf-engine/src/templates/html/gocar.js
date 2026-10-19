const fs = require('fs');
const path = require('path');
const { wrapLines } = require('./font_metrics');
const {
    getHtmlAssets,
    extractGojekTripDetails,
    calculateGojekRouteDeltaH,
    calculateGojekPositions,
    renderTripDetailBoxHtml,
    renderGojekSocialSection,
    renderGojekCompanyInfo,
    renderGojekDisclaimer
} = require('./shared');

function formatRupiah(val) {
    if (typeof val === 'string') return val;
    if (val < 0) return '-Rp' + Math.abs(val).toLocaleString('id-ID');
    return 'Rp' + val.toLocaleString('id-ID');
}

/**
 * Builds authentic HTML for GoCar receipt and invoice matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoCarHtml(jsonData) {
    const assets = getHtmlAssets();
    const {
        header,
        page2,
        nama,
        paymentRows,
        driver,
        plat,
        tipe,
        jarak,
        waktu,
        jemput,
        tujuan
    } = extractGojekTripDetails(jsonData);

    const isHemat = (jsonData.template === 'gocar_hemat' || jsonData.service === 'gocar_hemat');
    const logoImg = isHemat ? assets.logoGoCarHemat : assets.logoGoCar;
    const logoHeight = isHemat ? 36.0 : 57.1;
    const headerHeight = isHemat ? 74.4 : 95.5;
    const deltaHeaderY = isHemat ? -21.12 : 0;
    const headerMetaTop = isHemat ? 19.95 : 30.5;
    const greetingTop = isHemat ? 112.5 : 133.6;
    const greetingTitleText = isHemat ? 'Makasih udah pesan GoCar Hemat' : 'Makasih udah pesan GoCar';
    const totalDibayarBoxTop = isHemat ? 213.9 : 235.0;
    const boxTitlePaymentTop = isHemat ? 293.2 : 314.3;
    const boxContainerPaymentTop = isHemat ? 327.9 : 349.0;

    // Page 2 variables
    const fakturTitleTop = isHemat ? 92.8 : 113.9;
    const fakturSubtitleTop = isHemat ? 136.9 : 158.0;
    const fakturBoxContainerTop = isHemat ? 168.7 : 189.8;
    const cardHeightP2 = isHemat ? 301.1 : 322.2;
    const companyInfoTop = isHemat ? 332.9 : 354.0;

    const {
        detailTitleTop,
        tripContainerTop,
        tripContainerHeight,
        cardHeight,
        footerSectionTop: baseFooterSectionTop,
        margins
    } = calculateGojekPositions({ paymentRows, deltaHeaderY, wrapLines, jemput, tujuan });

    let footerSectionTop = baseFooterSectionTop;
    const defaultFooterHeight = 367.44;
    const maxPageBottom = 1380.0;
    const overflowY = (footerSectionTop + defaultFooterHeight) - maxPageBottom;

    if (overflowY > 0) {
        const compression = Math.min(overflowY, 115.0);
        const ratio = Math.max(0.25, 1.0 - (compression / 163.48));
        for (const k of Object.keys(margins)) {
            margins[k] *= ratio;
        }
        footerSectionTop = Math.min(footerSectionTop, maxPageBottom - (defaultFooterHeight - compression));
    }

    // Calculate total payment on page 1
    const totalPayment = paymentRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

    // Page 2 total box
    const totalBoxP2 = page2.total_box || [];
    const totalP2 = totalBoxP2.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

    // Split driver name across 2 lines if needed
    const driverParts = driver.split(' ');
    let driverLine1 = driver;
    let driverLine2 = '';
    if (driverParts.length > 2) {
        driverLine1 = driverParts.slice(0, 2).join(' ');
        driverLine2 = driverParts.slice(2).join(' ');
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@page {
    size: A4;
    margin: 0;
}
@font-face {
    font-family: 'DejaVuSans';
    src: url('data:font/truetype;charset=utf-8;base64,${assets.fontReg}') format('truetype');
}
@font-face {
    font-family: 'DejaVuSans';
    font-weight: bold;
    src: url('data:font/truetype;charset=utf-8;base64,${assets.fontBold}') format('truetype');
}

* {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
}

body {
    margin: 0;
    padding: 0;
    background-color: #fafafa;
    font-family: 'DejaVuSans', sans-serif;
    color: #000000;
    font-size: 14.72px;
    line-height: 1.15;
}

.page {
    width: 991.5px;
    position: relative;
    page-break-after: always;
}

.page:last-child {
    page-break-after: avoid;
}

/* 600px Card Container Centered */
.card {
    position: absolute;
    left: 195.7px;
    width: 600.0px;
    background: #ffffff;
}

/* Green Header Bar */
.header-bar {
    width: 600.0px;
    height: 95.5px;
    background-color: #00880d;
    position: relative;
}

.logo-gocar {
    position: absolute;
    left: 17.4px;
    top: 17.4px;
    width: 200.0px;
    height: 57.1px;
}

.header-meta {
    position: absolute;
    right: 17.2px;
    top: 30.5px;
    text-align: right;
    color: #ffffff;
    font-size: 14.72px;
    line-height: 17.3px;
    letter-spacing: -0.04px;
}

/* Page 1 Body Content */
.greeting-section {
    position: absolute;
    left: 17.4px;
    top: 133.6px;
}

.greeting-name {
    font-size: 16.00px;
    color: #000000;
}

.greeting-title {
    font-size: 20.96px;
    font-weight: bold;
    color: #000000;
    margin-top: 22.6px;
}

/* Total Dibayar Badge Box */
.total-dibayar-box {
    position: absolute;
    left: 90.0px;
    top: 235.0px;
    width: 420.0px;
    height: 47.2px;
    background-color: #fafafa;
    border: 1px solid #e8e8e8;
    display: table;
}

.total-dibayar-inner {
    display: table-row;
}

.total-dibayar-label {
    display: table-cell;
    vertical-align: middle;
    padding-left: 26.5px;
    font-size: 17.28px;
    font-weight: bold;
    color: #000000;
}

.total-dibayar-value {
    display: table-cell;
    vertical-align: middle;
    text-align: right;
    padding-right: 26.5px;
    font-size: 17.28px;
    font-weight: bold;
    color: #008000;
}

/* Box Section */
.box-title {
    position: absolute;
    font-size: 16.00px;
    font-weight: bold;
    color: #000000;
}

.box-container {
    position: absolute;
    left: 12.0px;
    width: 576.0px;
    border: 1px solid #e8e8e8;
    background: #ffffff;
    padding: 15.6px 17.4px 21.0px 17.4px;
}

.payment-table {
    width: 100%;
    border-collapse: collapse;
}

.payment-table td {
    padding: 0;
    height: 21.12px;
    line-height: 21.12px;
    font-size: 14.72px;
}

.payment-table .row-val {
    text-align: right;
}

.hr-shadow {
    border: none;
    border-top: 1px solid #9a9a9a;
    border-bottom: 1px solid #eeeeee;
    height: 2px;
    margin: 0;
}

/* Trip Details Container */
.trip-container {
    position: absolute;
    left: 12.0px;
    width: 576.0px;
    border: 1px solid #e8e8e8;
    background: #ffffff;
}

.trip-left {
    position: absolute;
    left: 20.35px;
    top: 20.9px;
    width: 280.0px;
}

.trip-right {
    position: absolute;
    left: 318.9px;
    top: 20.9px;
    width: 236.0px;
}

.driver-name {
    font-size: 16.00px;
    font-weight: bold;
    line-height: 18.7px;
    color: #000000;
    margin-left: 14.66px;
}

.car-info {
    font-size: 14.72px;
    color: #000000;
    margin-top: 4.0px;
    margin-bottom: 21.05px;
    margin-left: 14.66px;
}

.icon-text-row {
    position: relative;
    margin-bottom: 5.96px;
    font-size: 14.72px;
    line-height: 17.5px;
    white-space: nowrap;
}

.icon-text-row img {
    vertical-align: -2.5px;
}

.route-section {
    position: relative;
    padding-left: 0;
    margin-bottom: 17.07px;
}

.route-icon {
    position: absolute;
    left: -19.85px;
    top: -0.2px;
}

.route-header {
    font-size: 14.72px;
    line-height: 17.3px;
    color: #000000;
}

.route-place {
    font-size: 16.00px;
    font-weight: bold;
    line-height: 18.72px;
    color: #000000;
    margin-top: 4.0px;
    margin-bottom: 15.85px;
}

.route-address {
    width: 235.0px;
    font-size: 14.72px;
    line-height: 17.28px;
    color: #000000;
    white-space: pre-line;
}

/* Footer Links & Info */
.footer-section {
    position: absolute;
    left: 195.7px;
    width: 600.0px;
}

.help-links {
    position: relative;
    height: ${isHemat ? 42.28 : 25.0}px;
    margin-top: ${margins.help.toFixed(2)}px;
    font-size: 14.72px;
    line-height: normal;
}

.help-link-item {
    position: absolute;
}

.help-link-item a {
    color: #0000ee;
    text-decoration: underline;
}

.help-link-1 {
    left: 78.1px;
}

.help-link-2 {
    left: 220.5px;
}

.help-link-3 {
    left: 412.1px;
}

.help-links img {
    vertical-align: -0.3px;
    margin-right: 9.2px;
}

.disclaimer {
    width: 576.0px;
    margin: ${margins.disclaimer.toFixed(2)}px auto 0 auto;
    text-align: center;
    font-size: 14.72px;
    line-height: 17.28px;
    color: #000000;
}

.social-section {
    margin-top: ${margins.social.toFixed(2)}px;
    text-align: center;
    font-size: 14.72px;
}

.social-icons {
    margin-top: ${margins.icons.toFixed(2)}px;
    text-align: center;
}

.social-icons a {
    margin: 0 15.84px;
}

.logo-gojek-footer {
    margin-top: ${margins.logo.toFixed(2)}px;
}

.office-address {
    width: 533.0px;
    margin: ${margins.office.toFixed(2)}px auto 0 auto;
    text-align: center;
    font-size: 14.72px;
    line-height: 17.28px;
    color: #000000;
}

/* Page 2 Faktur Pajak */
.faktur-title {
    position: absolute;
    left: 14.5px;
    top: 113.9px;
    font-size: 22.08px;
    font-weight: bold;
    color: #000000;
}

.faktur-subtitle {
    position: absolute;
    left: 14.5px;
    top: 158.0px;
    font-size: 14.72px;
    color: #000000;
    white-space: nowrap;
}

.company-info {
    position: absolute;
    top: 354.5px;
    left: 195.7px;
    width: 600.0px;
    text-align: center;
    font-size: 14.72px;
    line-height: 17.3px;
    color: #000000;
}
</style>
</head>
<body>

<!-- HALAMAN 1: STRUK PERJALANAN -->
<div class="page" style="height: 1403.4px;">
    <div class="card" style="top: -0.5px; height: ${cardHeight.toFixed(1)}px;">
        <div class="header-bar" style="height: ${headerHeight}px;">
            <img class="logo-gocar" style="width: 200.0px; height: ${logoHeight}px;" src="data:image/png;base64,${logoImg}" alt="GoCar">
            <div class="header-meta" style="top: ${headerMetaTop}px;">
                <div>${header.tanggal || ''}</div>
                <div>ID pesanan: ${header.id_pesanan || ''}</div>
            </div>
        </div>

        <div class="greeting-section" style="top: ${greetingTop}px;">
            <div class="greeting-name">Hai ${nama},</div>
            <div class="greeting-title">${greetingTitleText}</div>
        </div>

        <!-- Total Dibayar Badge -->
        <div class="total-dibayar-box" style="top: ${totalDibayarBoxTop}px;">
            <div class="total-dibayar-inner">
                <span class="total-dibayar-label">Total dibayar</span>
                <span class="total-dibayar-value">${formatRupiah(totalPayment)}</span>
            </div>
        </div>

        <!-- Rincian Pembayaran Box -->
        <div class="box-title" style="left: 16.0px; top: ${boxTitlePaymentTop}px;">Rincian pembayaran</div>
        <div class="box-container" style="top: ${boxContainerPaymentTop}px;">
            <table class="payment-table">
                ${paymentRows.map(r => `
                <tr>
                    <td>${r.item}</td>
                    <td class="row-val">${formatRupiah(r.nominal)}</td>
                </tr>
                `).join('')}
                <tr>
                    <td colspan="2" style="padding: 9.2px 0 8.96px 0; line-height: 0; height: 2px;"><div class="hr-shadow"></div></td>
                </tr>
                <tr style="font-weight: bold;">
                    <td>Total pembayaran</td>
                    <td class="row-val">${formatRupiah(totalPayment)}</td>
                </tr>
                <tr>
                    <td>Bayar pakai GoPay Tabungan</td>
                    <td class="row-val">${formatRupiah(totalPayment)}</td>
                </tr>
            </table>
        </div>

${renderTripDetailBoxHtml({
    detailTitleTop,
    tripContainerTop,
    tripContainerHeight,
    driverLine1,
    driverLine2,
    plat,
    tipe,
    jarak,
    waktu,
    jemput,
    tujuan,
    assets
})}
    </div>

    <!-- Footer Area (below card) -->
    <div class="footer-section" style="top: ${footerSectionTop.toFixed(1)}px;">
        <div class="help-links">
            <span class="help-link-item help-link-1"><img src="data:image/png;base64,${assets.iconBantuan}" width="14" height="14" alt=""><a href="https://gojek.link/gocore/help">Bantuan</a></span>
            <span class="help-link-item help-link-2"><img src="data:image/png;base64,${assets.iconLaporkan}" width="14" height="14" alt=""><a href="https://gojek.link/gocore/help/article/a8905486-95ef-4e98-9d18-efa8fa6a63ae">Laporkan masalah</a></span>
            <span class="help-link-item help-link-3"><img src="data:image/png;base64,${assets.iconTentang}" width="14" height="14" alt=""${isHemat ? ' style="vertical-align: top;"' : ''}><a href="https://gojek.link/gocore/help/articlegroup/01e5c230-5861-459d-a71f-fd37fb56bf67"${isHemat ? ' style="display: inline-block; vertical-align: top;"' : ''}>${isHemat ? 'Tentang GoCar<br><span style="margin-left: 19.75px;">Hemat</span>' : 'Tentang GoCar'}</a></span>
        </div>

${renderGojekDisclaimer()}

${renderGojekSocialSection(assets)}
    </div>
</div>

<!-- HALAMAN 2: FAKTUR PAJAK -->
<div class="page" style="height: 1403.4px;">
    <div class="card" style="top: -0.5px; height: ${cardHeightP2}px;">
        <div class="header-bar" style="height: ${headerHeight}px;">
            <img class="logo-gocar" style="width: 200.0px; height: ${logoHeight}px;" src="data:image/png;base64,${logoImg}" alt="GoCar">
            <div class="header-meta" style="top: ${headerMetaTop}px;">
                <div>${header.tanggal || ''}</div>
                <div>ID pesanan: ${header.id_pesanan || ''}</div>
            </div>
        </div>

        <div class="faktur-title" style="top: ${fakturTitleTop}px;">Faktur</div>
        <div class="faktur-subtitle" style="top: ${fakturSubtitleTop}px;">Semua jumlah sudah termasuk PPN</div>

        <div class="box-container" style="top: ${fakturBoxContainerTop}px; padding-right: 17.9px;">
            <table class="payment-table">
                ${totalBoxP2.map(r => {
                    const label = (r.item === 'Diskon') ? 'Diskon biaya jasa aplikasi' : r.item;
                    return `
                    <tr>
                        <td>${label}</td>
                        <td class="row-val">${formatRupiah(r.nominal)}</td>
                    </tr>
                    `;
                }).join('')}
                <tr>
                    <td colspan="2" style="padding: 9.2px 0 8.96px 0; line-height: 0; height: 2px;"><div class="hr-shadow"></div></td>
                </tr>
                <tr style="font-weight: bold;">
                    <td>Total biaya jasa aplikasi</td>
                    <td class="row-val">${formatRupiah(totalP2)}</td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Company Details -->
${renderGojekCompanyInfo(companyInfoTop)}
</div>

</body>
</html>`;
}

module.exports = {
    renderGoCarHtml
};
