const fs = require('fs');
const path = require('path');
const { wrapLines } = require('./font_metrics');

// Cache base64 assets for lightning fast generation
let cachedAssets = null;

function getAssets() {
    if (cachedAssets) return cachedAssets;

    const readB64 = (filePath) => {
        try {
            return fs.readFileSync(filePath).toString('base64');
        } catch (e) {
            return '';
        }
    };

    cachedAssets = {
        fontReg: readB64(path.resolve(__dirname, '../../../fonts/DejaVuSans.ttf')),
        fontBold: readB64(path.resolve(__dirname, '../../../fonts/DejaVuSans-Bold.ttf')),
        logoGoCar: readB64(path.resolve(__dirname, '../../../img/logo_gocar.png')),
        logoGoCarHemat: readB64(path.resolve(__dirname, '../../../img/logo_gocar_hemat.png')),
        logoGojek: readB64(path.resolve(__dirname, '../../../img/logo_gojek.png')),
        iconJarak: readB64(path.resolve(__dirname, '../../../img/icon_jarak.png')),
        iconWaktu: readB64(path.resolve(__dirname, '../../../img/icon_waktu.png')),
        iconJemput: readB64(path.resolve(__dirname, '../../../img/icon_jemput.png')),
        iconAntar: readB64(path.resolve(__dirname, '../../../img/icon_antar.png')),
        iconBantuan: readB64(path.resolve(__dirname, '../../../img/icon_bantuan.png')),
        iconLaporkan: readB64(path.resolve(__dirname, '../../../img/icon_laporkan.png')),
        iconTentang: readB64(path.resolve(__dirname, '../../../img/icon_tentang.png')),
        iconFb: readB64(path.resolve(__dirname, '../../../img/icon_fb.png')),
        iconTw: readB64(path.resolve(__dirname, '../../../img/icon_tw.png')),
        iconIg: readB64(path.resolve(__dirname, '../../../img/icon_ig.png')),
        iconYt: readB64(path.resolve(__dirname, '../../../img/icon_yt.png')),
        iconIn: readB64(path.resolve(__dirname, '../../../img/icon_in.png')),
    };

    return cachedAssets;
}

function formatRupiah(val) {
    if (typeof val === 'string') return val;
    if (val < 0) return '-Rp' + Math.abs(val).toLocaleString('id-ID');
    return 'Rp' + val.toLocaleString('id-ID');
}

/**
 * Builds authentic HTML for GoCar receipt and invoice matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoCarHtml(jsonData) {
    const assets = getAssets();
    const header = jsonData.header || {};
    const page1 = (jsonData.page && jsonData.page[0]) || {};
    const page2 = (jsonData.page && jsonData.page[1]) || {};

    const greeting = page1.greeting || {};
    const nama = greeting.nama || '';
    const paymentRows = page1.payment_rows || [];
    const trip = page1.trip_detail || {};
    const driver = trip.pengemudi || '';
    const vehicle = trip.kendaraan || {};
    const plat = vehicle.plat || '';
    const tipe = vehicle.tipe || '';
    const jarak = trip.jarak || '';
    const waktu = trip.waktu || '';
    const jemput = trip.penjemputan || {};
    const tujuan = trip.tujuan || {};

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
    const companyInfoTop = isHemat ? 333.4 : 354.5;

    // Dynamic vertical positioning based on payment rows count
    const deltaPaymentY = (paymentRows.length - 4) * 21.12;
    const detailTitleTop = 560.8 + deltaPaymentY + deltaHeaderY;
    const tripContainerTop = 595.1 + deltaPaymentY + deltaHeaderY;

    // Calculate right column lines using DejaVu font metrics
    const h1 = wrapLines(`Dijemput ${jemput.tanggal || ''} jam ${jemput.jam || ''} dari`, 235.0, false);
    const p1 = wrapLines(jemput.tempat || '', 235.0, true);
    const a1 = wrapLines(jemput.alamat || '', 235.0, false);
    const h2 = wrapLines(`Sampai ${tujuan.tanggal || ''} jam ${tujuan.jam || ''} di`, 235.0, false);
    const p2 = wrapLines(tujuan.tempat || '', 235.0, true);
    const a2 = wrapLines(tujuan.alamat || '', 235.0, false);

    const deltaH = ((h1.length + h2.length - 4) * 17.28) +
                   ((p1.length + p2.length - 3) * 18.72) +
                   ((a1.length + a2.length - 10) * 17.28);

    const tripContainerHeight = 389.31 + deltaH;
    const cardHeight = 1001.84 + deltaPaymentY + deltaH + deltaHeaderY;
    let footerSectionTop = 1002.64 + deltaPaymentY + deltaH + deltaHeaderY;

    // Default margins in footer section
    let marginTopHelp = 46.55;
    let marginTopDisclaimer = 12.6;
    let marginTopSocial = 35.1;
    let marginTopIcons = 18.7;
    let marginTopLogo = 35.6;
    let marginTopOffice = 14.93;

    // Total default footer height is ~367.44px. Page height is 1403.4px.
    // If footer would exceed page boundary (e.g. edge cases with 7 payment rows + long addresses),
    // compress the large whitespace margins smoothly so Page 1 never bleeds onto Page 2.
    const defaultFooterHeight = 367.44;
    const maxPageBottom = 1380.0;
    const overflowY = (footerSectionTop + defaultFooterHeight) - maxPageBottom;

    if (overflowY > 0) {
        const compression = Math.min(overflowY, 115.0);
        const ratio = Math.max(0.25, 1.0 - (compression / 163.48));
        marginTopHelp *= ratio;
        marginTopDisclaimer *= ratio;
        marginTopSocial *= ratio;
        marginTopIcons *= ratio;
        marginTopLogo *= ratio;
        marginTopOffice *= ratio;
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
    margin-top: 23.0px;
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
    margin-bottom: 17.35px;
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
    margin-top: ${marginTopHelp.toFixed(2)}px;
    font-size: 14.72px;
    ${isHemat ? 'line-height: normal;' : ''}
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
    margin: ${marginTopDisclaimer.toFixed(2)}px auto 0 auto;
    text-align: center;
    font-size: 14.72px;
    line-height: 17.28px;
    color: #000000;
}

.social-section {
    margin-top: ${marginTopSocial.toFixed(2)}px;
    text-align: center;
    font-size: 14.72px;
}

.social-icons {
    margin-top: ${marginTopIcons.toFixed(2)}px;
    text-align: center;
}

.social-icons a {
    margin: 0 15.84px;
}

.logo-gojek-footer {
    margin-top: ${marginTopLogo.toFixed(2)}px;
}

.office-address {
    width: 533.0px;
    margin: ${marginTopOffice.toFixed(2)}px auto 0 auto;
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
    <div class="card" style="top: 0; height: ${cardHeight.toFixed(1)}px;">
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

        <!-- Detail Perjalanan Box -->
        <div class="box-title" style="left: 16.0px; top: ${detailTitleTop.toFixed(1)}px;">Detail perjalanan</div>
        <div class="trip-container" style="top: ${tripContainerTop.toFixed(1)}px; height: ${tripContainerHeight.toFixed(1)}px;">
            <div class="trip-left">
                <div class="driver-name">${driverLine1}${driverLine2 ? '<br>' + driverLine2 : ''}</div>
                <div class="car-info">${plat} • ${tipe}</div>
                <div class="icon-text-row"><img src="data:image/png;base64,${assets.iconJarak}" width="16" height="16" alt=""> Jarak ${jarak}</div>
                <div class="icon-text-row"><img src="data:image/png;base64,${assets.iconWaktu}" width="16" height="16" alt=""> Waktu perjalanan ${waktu}</div>
            </div>
            <div class="trip-right">
                <div class="route-section">
                    <img class="route-icon" src="data:image/png;base64,${assets.iconJemput}" width="16" height="16" alt="">
                    <div class="route-header">Dijemput ${jemput.tanggal || ''} jam ${jemput.jam || ''} dari</div>
                    <div class="route-place">${jemput.tempat || ''}</div>
                    <div class="route-address">${jemput.alamat || ''}</div>
                </div>
                <div class="route-section">
                    <img class="route-icon" src="data:image/png;base64,${assets.iconAntar}" width="16" height="16" alt="">
                    <div class="route-header">Sampai ${tujuan.tanggal || ''} jam ${tujuan.jam || ''} di</div>
                    <div class="route-place">${tujuan.tempat || ''}</div>
                    <div class="route-address">${tujuan.alamat || ''}</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer Area (below card) -->
    <div class="footer-section" style="top: ${footerSectionTop.toFixed(1)}px;">
        <div class="help-links">
            <span class="help-link-item help-link-1"><img src="data:image/png;base64,${assets.iconBantuan}" width="14" height="14" alt=""><a href="https://gojek.link/gocore/help">Bantuan</a></span>
            <span class="help-link-item help-link-2"><img src="data:image/png;base64,${assets.iconLaporkan}" width="14" height="14" alt=""><a href="https://gojek.link/gocore/help/article/a8905486-95ef-4e98-9d18-efa8fa6a63ae">Laporkan masalah</a></span>
            <span class="help-link-item help-link-3"><img src="data:image/png;base64,${assets.iconTentang}" width="14" height="14" alt=""${isHemat ? ' style="vertical-align: top;"' : ''}><a href="https://gojek.link/gocore/help/articlegroup/01e5c230-5861-459d-a71f-fd37fb56bf67"${isHemat ? ' style="display: inline-block; vertical-align: top;"' : ''}>${isHemat ? 'Tentang GoCar<br><span style="margin-left: 19.75px;">Hemat</span>' : 'Tentang GoCar'}</a></span>
        </div>

        <div class="disclaimer">
            Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang<br>
            dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang<br>
            diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran<br>
            ini.
        </div>

        <div class="social-section">
            <div>Kontak Gojek lewat</div>
            <div class="social-icons"><a href="https://www.instagram.com/gojekindonesia/"><img src="data:image/png;base64,${assets.iconIg}" width="28" height="28" alt="IG"></a><a href="https://twitter.com/gojekindonesia"><img src="data:image/png;base64,${assets.iconTw}" width="28" height="28" alt="TW"></a><a href="https://www.facebook.com/gojekindonesia"><img src="data:image/png;base64,${assets.iconFb}" width="28" height="28" alt="FB"></a><a href="https://www.youtube.com/channel/UCmlKSK0OKn_B3oPwElW4n5w"><img src="data:image/png;base64,${assets.iconYt}" width="28" height="28" alt="YT"></a><a href="https://www.linkedin.com/company/gojek/"><img src="data:image/png;base64,${assets.iconIn}" width="28" height="28" alt="IN"></a></div>
            <div class="logo-gojek-footer">
                <img src="data:image/png;base64,${assets.logoGojek}" width="102" height="30" alt="Gojek">
            </div>
            <div class="office-address">
                Pasaraya Blok M GD B, 7th Floor, Kebayoran<br>
                Baru, DKI Jakarta Indonesia 12160
            </div>
        </div>
    </div>
</div>

<!-- HALAMAN 2: FAKTUR PAJAK -->
<div class="page" style="height: 1403.4px;">
    <div class="card" style="top: 0; height: ${cardHeightP2}px;">
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
    <div class="company-info" style="top: ${companyInfoTop}px;">
        <div><b>PT GoTo Gojek Tokopedia Tbk</b> • NPWP: 0745704361064000</div>
        <div>Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai,</div>
        <div>Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160</div>
    </div>
</div>

</body>
</html>`;
}

module.exports = {
    renderGoCarHtml
};
