/**
 * src/core/canvas.js - Unified Canvas Specifications, Page Geometries, and Color Palettes
 *
 * Provides single source of truth for PDF canvas dimensions, margins, and design tokens
 * across Traveloka and Gojek document layouts.
 */

const TRAVELOKA_CANVAS = {
    width: 595.28,
    height: 827.70,
    marginLeft: 28.35,
    marginRight: 28.35,
    contentWidth: 538.58 // 595.28 - 28.35 * 2
};

const TRAVELOKA_COLORS = {
    travelokaBlue: '#0194f3',
    linkBlue: '#0770cd',
    bgGray: '#f2f3f3',
    bgBoxGray: '#f0f0f0',
    borderGray: '#cdcdcd',
    textBlack: '#000000',
    textWhite: '#ffffff'
};

const TRAVELOKA_TABLE_COLUMNS = {
    no: 32.48,
    jenis: 52.39,
    jenisHotel: 52.88,
    deskripsi: 133.16,
    deskripsiHotel: 133.65,
    jml: 370.13,          // center aligned
    hargaSatuan: 482.00,  // right aligned
    total: 562.80,        // right aligned
    summaryLabel: 382.58, // left aligned
    summaryVal: 562.80    // right aligned
};

const GOJEK_CANVAS = {
    width: 595.0,
    height: 842.0,
    cardX: 117.42,
    cardWidth: 360.03,
    centerAnchor: 297.5,
    margins: { top: 0, left: 0, right: 0, bottom: 0 }
};

const GOJEK_COLORS = {
    bgPage: '#fafafa',
    bgCard: '#ffffff',
    headerGreen: '#00880d',
    borderLight: '#e8e8e8',
    borderDark: '#9a9a9a',
    borderDivider: '#eeeeee',
    linkBlue: '#0000ee',
    textBlack: '#000000',
    textWhite: '#ffffff'
};

const GOJEK_URLS = {
    help: 'https://gojek.link/gocore/help',
    report: 'https://gojek.link/gocore/help/article/a8905486-95ef-4e98-9d18-efa8fa6a63ae',
    feeInfo: 'https://gojek.link/gocore/help/articlegroup/01e5c230-5861-459d-a71f-fd37fb56bf67',
    instagram: 'https://www.instagram.com/gojekindonesia/',
    twitter: 'https://twitter.com/gojekindonesia',
    facebook: 'https://www.facebook.com/gojekindonesia',
    youtube: 'https://www.youtube.com/channel/UCmlKSK0OKn_B3oPwElW4n5w',
    linkedin: 'https://www.linkedin.com/company/gojek/'
};

const INDRIVE_CANVAS = {
    width: 595.28,
    height: 841.89,
    marginLeft: 56.69,
    marginRight: 56.69,
    contentRight: 538.58,
    contentWidth: 481.89,
    tableDividerX: 350.02,
    logo: {
        x: 191.51,
        y: 35.85,
        width: 212.25,
        height: 61.50
    }
};

const INDRIVE_COLORS = {
    textBlack: '#000000',
    borderBlack: '#000000',
    bgWhite: '#ffffff'
};

const JACKAL_CANVAS = {
    width: 595.28,
    height: 841.89,
    marginLeft: 35.14,
    marginRight: 35.14,
    contentRight: 560.14,
    contentWidth: 525.00,
    logo: {
        x: 239.50,
        y: 41.52,
        width: 116.29,
        height: 60.00
    }
};

const JACKAL_COLORS = {
    headerBg: '#dddddd',
    borderGray: '#dddddd',
    textBlack: '#000000',
    linkBlue: '#0000cc',
    dividerDark: '#6c757d'
};

module.exports = {
    TRAVELOKA_CANVAS,
    TRAVELOKA_COLORS,
    TRAVELOKA_TABLE_COLUMNS,
    GOJEK_CANVAS,
    GOJEK_COLORS,
    GOJEK_URLS,
    INDRIVE_CANVAS,
    INDRIVE_COLORS,
    JACKAL_CANVAS,
    JACKAL_COLORS
};

