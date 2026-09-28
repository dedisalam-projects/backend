/**
 * src/normalizers/indrive.js - Schema Sanitization & Defaults for inDrive Receipts
 *
 * Normalizes input JSON data for inDrive Mobil & Motor receipts,
 * enforcing empirical invariants derived from WeasyPrint original PDFs.
 */

/**
 * Check if the given payload belongs to inDrive receipt schema
 * @param {Object} data
 * @returns {boolean}
 */
function isIndrivePayload(data) {
    if (!data || typeof data !== 'object') return false;
    const s = (data.service || '').toLowerCase();
    if (s.includes('indrive') || s.includes('in-drive')) return true;
    if (typeof data.invoice_number === 'string' && /^ID\d{6}/i.test(data.invoice_number)) return true;
    if (data.vehicle_detail && data.order_type) return true;
    return false;
}

/**
 * Format currency amount to inDrive format (e.g. "Rp 30000.00")
 * @param {number|string} amount
 * @returns {string}
 */
function formatIndriveFare(amount) {
    if (typeof amount === 'string' && amount.startsWith('Rp')) {
        return amount;
    }
    const num = parseFloat(amount) || 0;
    return `Rp ${num.toFixed(2)}`;
}

/**
 * Sanitize and enrich raw JSON data for inDrive receipt renderer
 * @param {Object} rawData
 * @returns {Object} Normalized data with resolved defaults
 */
function normalizeIndriveData(rawData) {
    if (!rawData) return {};
    const data = { ...rawData };

    data.service = data.service || 'indrive-mobil';
    data.invoice_number = data.invoice_number || 'ID0000000000000000';
    data.recipient_name = data.recipient_name || data.customer_name || 'Dedi';
    data.order_type = data.order_type || 'Perjalanan dalam kota';
    data.driver_name = data.driver_name || '-';
    data.vehicle_detail = data.vehicle_detail || '-';

    data.invoice_date = data.invoice_date || data.date || 'September 21, 2026';
    data.trip_date = data.trip_date || data.invoice_date;

    const pickup = data.pickup || {};
    data.pickup = {
        location: pickup.location || '-',
        time: pickup.time || '-'
    };

    const dropoff = data.dropoff || {};
    data.dropoff = {
        location: dropoff.location || '-',
        time: dropoff.time || '-'
    };

    data.distance = data.distance || '0.0 km';
    data.description = data.description || 'Tarif perjalanan (termasuk pajak)';
    data.fare_formatted = formatIndriveFare(data.fare || data.amount || 0);
    data.payment_method = data.payment_method || 'Tunai';

    return data;
}

module.exports = {
    isIndrivePayload,
    normalizeIndriveData,
    formatIndriveFare
};
