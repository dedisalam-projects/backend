const { renderGoCarHtml } = require('./gocar');

/**
 * Builds authentic HTML for GoCar Hemat receipt and invoice matching wkhtmltopdf 0.12.6.1 WebKit output
 */
function renderGoCarHematHtml(jsonData) {
    const data = {
        ...jsonData,
        template: 'gocar_hemat'
    };
    return renderGoCarHtml(data);
}

module.exports = {
    renderGoCarHematHtml
};
