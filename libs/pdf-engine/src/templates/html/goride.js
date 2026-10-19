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

function formatRupiah(num) {
    if (num === null || num === undefined) return 'Rp0';
    if (num < 0) {
        return '-Rp' + Math.abs(num).toLocaleString('id-ID');
    }
    return 'Rp' + num.toLocaleString('id-ID');
}

/**
 * Builds authentic HTML for GoRide and GoRide Hemat receipts and invoices matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoRideHtml(jsonData) {
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
    const hasPage2 = !!(page2 && ((page2.total_box && page2.total_box.length > 0) || page2.faktur));

    const isHemat = (jsonData.template === 'goride_hemat' || jsonData.service === 'goride_hemat');
    const isComfort = (jsonData.template === 'goride_comfort' || jsonData.service === 'goride_comfort');

    let logoImg = assets.logoGoride;
    let logoHeight = 52.65;
    let headerHeight = 91.02;
    let deltaHeaderY = -4.48;
    let headerMetaTop = 28.27;
    let greetingTitleText = 'Makasih udah pesan GoRide';

    if (isComfort) {
        logoImg = assets.logoGorideComfort;
        logoHeight = 34.88;
        headerHeight = 73.29;
        deltaHeaderY = -22.21;
        headerMetaTop = 19.45;
        greetingTitleText = 'Makasih udah pesan GoRide Comfort';
    } else if (isHemat) {
        logoImg = assets.logoGorideHemat;
        logoHeight = 39.68;
        headerHeight = 78.06;
        deltaHeaderY = -17.44;
        headerMetaTop = 21.85;
        greetingTitleText = 'Makasih udah pesan GoRide Hemat';
    }

    const greetingTop = 133.6 + deltaHeaderY;
    const totalDibayarBoxTop = 235.0 + deltaHeaderY;
    const boxTitlePaymentTop = 314.3 + deltaHeaderY;
    const boxContainerPaymentTop = 349.0 + deltaHeaderY;

    // Page 2 variables
    const fakturTitleTop = 113.9 + deltaHeaderY;
    const fakturSubtitleTop = 158.0 + deltaHeaderY;
    const fakturBoxContainerTop = 189.8 + deltaHeaderY;
    const cardHeightP2 = 322.2 + deltaHeaderY;
    const companyInfoTop = 354.0 + deltaHeaderY;

    const {
        detailTitleTop,
        tripContainerTop,
        tripContainerHeight,
        cardHeight,
        footerSectionTop,
        margins
    } = calculateGojekPositions({ paymentRows, deltaHeaderY, wrapLines, jemput, tujuan });

    // Check footer bounds to ensure single or double page safety
    const isTwoLineHelp = isHemat || isComfort;
    const totalEstPage1 = footerSectionTop + (isTwoLineHelp ? 42.28 : 25.0) + 12.6 + 69.12 + 35.1 + 17.28 + 18.7 + 28.0 + 35.6 + 30.0 + 14.93 + 34.56;
    if (totalEstPage1 > 1380.0) {
        const excess = totalEstPage1 - 1380.0;
        const compressRatio = Math.max(0.4, 1.0 - (excess / 120.0));
        for (const k of Object.keys(margins)) {
            margins[k] *= compressRatio;
        }
    }

    // Totals calculation
    const totalPayment = paymentRows.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);
    const totalBoxP2 = (page2 && page2.total_box) || [];
    const totalP2 = totalBoxP2.reduce((sum, r) => sum + (Number(r.nominal) || 0), 0);

    // Multi-line driver name support based on actual DejaVu font metrics
    const driverLines = wrapLines(driver, 225.0, true);
    const driverLine1 = driverLines[0] || '';
    const driverLine2 = driverLines.slice(1).join(' ');

    // Help link 3 custom styling for multi-line brand text
    let link3Content = 'Tentang GoRide';
    let link3Style = '';
    let link3ImgStyle = '';

    if (isComfort) {
        link3Content = 'Tentang GoRide<br><span style="margin-left: 17.83px;">Comfort</span>';
        link3Style = ' style="display: inline-block; vertical-align: top;"';
        link3ImgStyle = ' style="vertical-align: top;"';
    } else if (isHemat) {
        link3Content = 'Tentang GoRide<br><span style="margin-left: 23.0px;">Hemat</span>';
        link3Style = ' style="display: inline-block; vertical-align: top;"';
        link3ImgStyle = ' style="vertical-align: top;"';
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
    ${hasPage2 ? 'page-break-after: always;' : 'page-break-after: avoid;'}
}

${hasPage2 ? `
.page:last-child {
    page-break-after: avoid;
}
` : ''}

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
    height: ${headerHeight}px;
    background-color: #00880d;
    position: relative;
}

.logo-goride {
    position: absolute;
    left: 17.4px;
    top: 17.4px;
    width: 200.0px;
    height: ${logoHeight}px;
}

.header-meta {
    position: absolute;
    right: 17.2px;
    top: ${headerMetaTop}px;
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
    top: ${greetingTop}px;
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
    top: ${totalDibayarBoxTop}px;
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
    width: 238.0px;
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
    line-height: 17.28px;
    color: #000000;
    margin-top: 4.0px;
    margin-bottom: 20.57px;
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
    height: ${isTwoLineHelp ? 42.28 : 25.0}px;
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
    left: 408.5px;
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
    top: ${fakturTitleTop}px;
    font-size: 22.08px;
    font-weight: bold;
    color: #000000;
}

.faktur-subtitle {
    position: absolute;
    left: 14.5px;
    top: ${fakturSubtitleTop}px;
    font-size: 14.72px;
    color: #000000;
    white-space: nowrap;
}

.company-info {
    position: absolute;
    top: ${companyInfoTop}px;
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

<!-- HALAMAN 1: STRUK PERJALANAN GORIDE -->
<div class="page" style="height: 1403.4px;">
    <div class="card" style="top: -0.5px; height: ${cardHeight.toFixed(1)}px;">
        <div class="header-bar">
            <img class="logo-goride" src="data:image/png;base64,${logoImg}" alt="GoRide">
            <div class="header-meta">
                <div>${header.tanggal || ''}</div>
                <div>ID pesanan: ${header.id_pesanan || ''}</div>
            </div>
        </div>

        <div class="greeting-section">
            <div class="greeting-name">Hai ${nama},</div>
            <div class="greeting-title">${greetingTitleText}</div>
        </div>

        <!-- Total Dibayar Badge -->
        <div class="total-dibayar-box">
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
            <span class="help-link-item help-link-3"><img src="data:image/png;base64,${assets.iconTentang}" width="14" height="14" alt=""${link3ImgStyle}><a href="https://gojek.link/gocore/help/articlegroup/01e5c230-5861-459d-a71f-fd37fb56bf67"${link3Style}>${link3Content}</a></span>
        </div>

${renderGojekDisclaimer()}

${renderGojekSocialSection(assets)}
    </div>
</div>

${hasPage2 ? `
<!-- HALAMAN 2: FAKTUR PAJAK -->
<div class="page" style="height: 1403.4px;">
    <div class="card" style="top: -0.5px; height: ${cardHeightP2}px;">
        <div class="header-bar">
            <img class="logo-goride" src="data:image/png;base64,${logoImg}" alt="GoRide">
            <div class="header-meta">
                <div>${header.tanggal || ''}</div>
                <div>ID pesanan: ${header.id_pesanan || ''}</div>
            </div>
        </div>

        <div class="faktur-title">Faktur</div>
        <div class="faktur-subtitle">Semua jumlah sudah termasuk PPN</div>

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
${renderGojekCompanyInfo()}
</div>
` : ''}

</body>
</html>`;
}

module.exports = {
    renderGoRideHtml
};
