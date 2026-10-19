const { renderIndriveReceipt } = require('./receipt');
const { render, generateIndrivePdf, isIndrivePayload } = require('./renderer');

module.exports = {
    renderIndriveReceipt,
    render,
    generateIndrivePdf,
    isIndrivePayload
};
