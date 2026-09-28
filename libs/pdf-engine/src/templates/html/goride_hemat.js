const { renderGoRideHtml } = require('./goride');

/**
 * Builds authentic HTML for GoRide Hemat receipt and invoice matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoRideHematHtml(jsonData) {
    const data = {
        ...jsonData,
        template: 'goride_hemat'
    };
    return renderGoRideHtml(data);
}

module.exports = {
    renderGoRideHematHtml
};
