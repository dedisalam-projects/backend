const fs = require('node:fs');
const path = require('node:path');

let cachedAssets = null;

function getHtmlAssets() {
    if (cachedAssets) return cachedAssets;

    const baseDir = path.resolve(__dirname, '../../..');
    const imgDir = path.join(baseDir, 'img');
    const fontsDir = path.join(baseDir, 'fonts');

    const readB64 = (filePath) => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath).toString('base64');
            }
        } catch (e) {}
        return '';
    };

    cachedAssets = {
        fontReg: readB64(path.join(fontsDir, 'DejaVuSans.ttf')),
        fontBold: readB64(path.join(fontsDir, 'DejaVuSans-Bold.ttf')),
        logoGoCar: readB64(path.join(imgDir, 'logo_gocar.png')),
        logoGoCarHemat: readB64(path.join(imgDir, 'logo_gocar_hemat.png')),
        logoGoride: readB64(path.join(imgDir, 'logo_goride.png')),
        logoGorideComfort: readB64(path.join(imgDir, 'logo_goride_comfort.png')),
        logoGorideHemat: readB64(path.join(imgDir, 'logo_goride_hemat.png')),
        logoGojek: readB64(path.join(imgDir, 'logo_gojek.png')),
        iconJarak: readB64(path.join(imgDir, 'icon_jarak.png')),
        iconWaktu: readB64(path.join(imgDir, 'icon_waktu.png')),
        iconJemput: readB64(path.join(imgDir, 'icon_jemput.png')),
        iconAntar: readB64(path.join(imgDir, 'icon_antar.png')),
        iconBantuan: readB64(path.join(imgDir, 'icon_bantuan.png')),
        iconLaporkan: readB64(path.join(imgDir, 'icon_laporkan.png')),
        iconTentang: readB64(path.join(imgDir, 'icon_tentang.png')),
        iconFb: readB64(path.join(imgDir, 'icon_fb.png')),
        iconTw: readB64(path.join(imgDir, 'icon_tw.png')),
        iconIg: readB64(path.join(imgDir, 'icon_ig.png')),
        iconYt: readB64(path.join(imgDir, 'icon_yt.png')),
        iconIn: readB64(path.join(imgDir, 'icon_in.png')),
    };

    return cachedAssets;
}

function extractGojekTripDetails(jsonData) {
    const header = jsonData.header || {};
    const page1 = jsonData.page?.[0] ?? {};
    const page2 = jsonData.page?.[1] ?? null;
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
    return {
        header,
        page1,
        page2,
        greeting,
        nama,
        paymentRows,
        trip,
        driver,
        vehicle,
        plat,
        tipe,
        jarak,
        waktu,
        jemput,
        tujuan
    };
}

function calculateGojekRouteDeltaH(wrapLines, jemput, tujuan) {
    const h1 = wrapLines(`Dijemput ${jemput.tanggal || ''} jam ${jemput.jam || ''} dari`, 235.0, false);
    const p1 = wrapLines(jemput.tempat || '', 235.0, true);
    const a1 = wrapLines(jemput.alamat || '', 235.0, false);
    const h2 = wrapLines(`Sampai ${tujuan.tanggal || ''} jam ${tujuan.jam || ''} di`, 235.0, false);
    const p2 = wrapLines(tujuan.tempat || '', 235.0, true);
    const a2 = wrapLines(tujuan.alamat || '', 235.0, false);

    return ((h1.length + h2.length - 4) * 17.28) +
           ((p1.length + p2.length - 3) * 18.72) +
           ((a1.length + a2.length - 10) * 17.28);
}

function renderTripDetailBoxHtml({
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
}) {
    return `
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
        </div>`;
}

function renderGojekSocialSection(assets) {
    return `
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
        </div>`;
}

function renderGojekCompanyInfo(topPx) {
    const styleAttr = topPx != null ? ` style="top: ${topPx}px;"` : '';
    return `
    <div class="company-info"${styleAttr}>
        <div><b>PT GoTo Gojek Tokopedia Tbk</b> • NPWP: 0745704361064000</div>
        <div>Gedung Pasaraya Blok M Gd.B Lt.6&7, Jl. Iskandarsyah II, 2, Melawai,</div>
        <div>Kebayoran Baru, Kota Adm. Jakarta Selatan, DKI Jakarta, 12160</div>
    </div>`;
}

function renderGojekDisclaimer() {
    return `
        <div class="disclaimer">
            Perjalanan ini dijamin asuransi. Total yang tercantum adalah harga yang<br>
            dibayarkan ketika pesanan selesai. Biaya tambahan seperti tip yang<br>
            diberikan setelah pesanan selesai tidak dicantumkan di bukti pembayaran<br>
            ini.
        </div>`;
}

function calculateGojekPositions({ paymentRows, deltaHeaderY, wrapLines, jemput, tujuan }) {
    const deltaPaymentY = (paymentRows.length - 4) * 21.12;
    const detailTitleTop = 560.8 + deltaPaymentY + deltaHeaderY;
    const tripContainerTop = 595.1 + deltaPaymentY + deltaHeaderY;
    const deltaH = calculateGojekRouteDeltaH(wrapLines, jemput, tujuan);
    const tripContainerHeight = 389.31 + deltaH;
    const cardHeight = 1001.84 + deltaPaymentY + deltaH + deltaHeaderY;
    const footerSectionTop = 1002.64 + deltaPaymentY + deltaH + deltaHeaderY;

    const margins = {
        help: 46.15,
        disclaimer: 12.6,
        social: 35.5,
        icons: 18.7,
        logo: 35.6,
        office: 14.53
    };

    return {
        deltaPaymentY,
        detailTitleTop,
        tripContainerTop,
        deltaH,
        tripContainerHeight,
        cardHeight,
        footerSectionTop,
        margins
    };
}

module.exports = {
    getHtmlAssets,
    extractGojekTripDetails,
    calculateGojekRouteDeltaH,
    calculateGojekPositions,
    renderTripDetailBoxHtml,
    renderGojekSocialSection,
    renderGojekCompanyInfo,
    renderGojekDisclaimer
};
