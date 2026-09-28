const { getTableColumns } = require('../core/helpers');

/**
 * src/normalizers/traveloka.js - Schema Sanitization & Pre-calculation for Traveloka PDFs
 *
 * Decouples layout geometry decisions (col1_width, footer terms, line wrapping)
 * from PDFKit rendering routines.
 */

/**
 * Identify document service type (bus vs hotel)
 * @param {Object} data
 * @returns {'bus'|'hotel'}
 */
function determineService(data) {
    if (!data) return 'bus';
    const cat = (data.category || data.service || data.type || '').toLowerCase();
    if (cat.includes('bus') || cat.includes('shuttle')) {
        return 'bus';
    }
    if (cat.includes('hotel') || cat.includes('akomodasi') || cat.includes('stay')) {
        return 'hotel';
    }
    if (data.hotel || (data.items && data.items.some(it => (it.jenis || '').toLowerCase().includes('akomodasi')))) {
        return 'hotel';
    }
    return 'bus';
}

/**
 * Sanitize and enrich raw JSON data for Traveloka rendering engines
 * @param {Object} rawData
 * @returns {Object} Normalized data with resolved geometries and text lines
 */
function normalizeTravelokaData(rawData) {
    if (!rawData) return {};
    const data = { ...rawData };
    const service = determineService(data);
    const isHotel = service === 'hotel';

    // 1. Standardize col1_width & dynamic table columns
    if (typeof data.col1_width !== 'number') {
        data.col1_width = isHotel ? 20.40 : 19.91;
    }
    data.cols = getTableColumns(data, isHotel);

    // 2. Normalize multiline transaction date
    if (!Array.isArray(data.transaction_date_lines)) {
        if (typeof data.transaction_date === 'string' && data.transaction_date.includes('\n')) {
            data.transaction_date_lines = data.transaction_date.split('\n');
        } else if (data.transaction_date) {
            data.transaction_date_lines = [data.transaction_date];
        }
    }

    // 3. Normalize footer terms URL & X coordinate based on payment method
    const payMethod = (data.payment_method || data.payment_bar_method || '').toLowerCase();
    const isPaylater = payMethod.includes('gopay') || payMethod.includes('paylater');
    if (!data.footer_terms) {
        data.footer_terms = isPaylater ?
            'Syarat dan Ketentuan berlaku. Silakan lihat https://www.traveloka.com/en-id/travelokapay/paylater/termsandconditions' :
            'Syarat dan Ketentuan berlaku. Silakan lihat http://www.traveloka.com/termsandconditions';
    }
    if (data.footer_x === undefined) {
        data.footer_x = data.footer_terms.includes('paylater') ? 101.44 : 149.32;
    }

    // 4. Normalize items list
    if (Array.isArray(data.items)) {
        data.items = data.items.map((item, idx) => {
            const itemNorm = { ...item };
            if (itemNorm.no === undefined || itemNorm.no === null) {
                itemNorm.no = idx + 1;
            }
            if (itemNorm.jml === undefined || itemNorm.jml === null) {
                itemNorm.jml = 1;
            }
            return itemNorm;
        });
    }

    return data;
}

module.exports = {
    determineService,
    normalizeTravelokaData
};
