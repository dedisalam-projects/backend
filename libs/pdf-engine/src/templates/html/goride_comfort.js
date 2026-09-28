const { renderGoRideHtml } = require('./goride');

/**
 * Builds authentic HTML for GoRide Comfort receipt and invoice matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoRideComfortHtml(jsonData) {
    const data = {
        ...jsonData,
        template: 'goride_comfort'
    };
    return renderGoRideHtml(data);
}

module.exports = {
    renderGoRideComfortHtml
};
