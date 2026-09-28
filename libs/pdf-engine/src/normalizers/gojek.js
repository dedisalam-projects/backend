/**
 * src/normalizers/gojek.js - Schema Sanitization for Gojek PDF Data
 *
 * Normalizes multi-page structures, default typography settings, and
 * page metadata for GoCar, GoRide, and other Gojek receipts.
 */

/**
 * Check if the given payload belongs to Gojek receipt schema
 * @param {Object|Array} data
 * @returns {boolean}
 */
function isGojekPayload(data) {
    if (!data) return false;
    if (Array.isArray(data)) {
        return data.some(p => p && (p.template || p.sections || p.booking_code));
    }
    if (data.template && (data.template.includes('go') || data.template.includes('ride') || data.template.includes('car'))) {
        return true;
    }
    if (data.pages || data.page || data.sections) {
        return true;
    }
    return false;
}

/**
 * Normalize Gojek template payload into a clean array of page objects
 * @param {Object|Array} templateData
 * @returns {Array<Object>} List of page configurations ready for renderer
 */
function normalizeGojekData(templateData) {
    if (!templateData) return [];

    if (Array.isArray(templateData)) {
        return templateData;
    }

    const pages = templateData.page || templateData.pages || [];
    if (Array.isArray(pages) && pages.length > 0) {
        return pages.map(p => Object.assign({
            template: templateData.template,
            header: templateData.header,
            font_family: templateData.font_family
        }, p));
    }

    // Single page root structure
    if (templateData.sections) {
        return [templateData];
    }

    return [];
}

module.exports = {
    isGojekPayload,
    normalizeGojekData
};
