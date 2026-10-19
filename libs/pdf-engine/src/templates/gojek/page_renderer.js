const { drawTextExact } = require('../../core/helpers');

/**
 * templates/gojek/page_renderer.js - Dedicated Visual Section & Element Renderer for Gojek Receipts
 *
 * Implements hierarchical style resolution (Element Override -> Section Default -> Universal Default),
 * text tracking calibration, shape drawing, and dynamic layout hook delegation for GoCar, GoRide, etc.
 */

const TEMPLATE_MODULES = {
    'gocar': require('./gocar'),
    'goride': require('./goride'),
    'goride_comfort': require('./goride')
};

const JS_DEFAULTS = {
    color: '#000000',
    align: 'left',
    bold: false,
    size: 8.83,
    centerAnchor: 297.5
};

const renderSection = (doc, sectionId, sectionDef, sectionData, pageFontFamily, pageIndex, templateModule, cardH, layoutMetrics) => {
    const defaults = sectionDef || {};

    // 1. Shapes
    (sectionData.shapes || []).forEach(s => {
        if (s.type === 'rect') {
            doc.rect(s.x, s.y, s.w, s.h).fill(s.color);
        } else if (s.type === 'line') {
            doc.lineWidth(s.width).strokeColor(s.color);
            doc.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2).stroke();
        }
    });

    // Resolve font family for this page
    const family = pageFontFamily || 'DejaVuSans';
    const isNimbus = family.includes('Nimbus');
    const defaultReg = isNimbus ? 'NimbusSanL-Reg' : 'DejaVuSans';
    const defaultBol = isNimbus ? 'NimbusSanL-Bol' : 'DejaVuSans-Bold';

    // 2. Texts
    (sectionData.texts || []).forEach((t, index) => {
        if (!t.text || !t.text.trim()) return;

        let align = t.align;
        if (!align && templateModule && templateModule.resolveAlign) {
            align = templateModule.resolveAlign(sectionId, t, index, pageIndex);
        }
        if (!align) align = defaults.align || JS_DEFAULTS.align;

        let anchor = t.anchor;
        if (anchor === undefined && templateModule && templateModule.resolveAnchor) {
            anchor = templateModule.resolveAnchor(sectionId, t, index, pageIndex);
        }
        if (anchor === undefined) {
            if (align === 'right') {
                anchor = defaults.right_anchor !== undefined ? defaults.right_anchor : (defaults.anchor !== undefined ? defaults.anchor : 459.16);
            } else if (align === 'center') {
                anchor = defaults.center_anchor !== undefined ? defaults.center_anchor : (defaults.anchor !== undefined ? defaults.anchor : JS_DEFAULTS.centerAnchor);
            } else {
                anchor = defaults.left_anchor !== undefined ? defaults.left_anchor : (defaults.anchor !== undefined ? defaults.anchor : 0);
            }
        }

        let color = t.color;
        if (!color && templateModule && templateModule.resolveColor) {
            color = templateModule.resolveColor(sectionId, t, index, pageIndex);
        }
        if (!color) color = defaults.color || JS_DEFAULTS.color;

        let isBold = t.bold;
        if (isBold === undefined && templateModule && templateModule.resolveBold) {
            isBold = templateModule.resolveBold(sectionId, t, index, pageIndex, sectionData.texts);
        }
        if (isBold === undefined) isBold = defaults.bold || false;

        const font = t.font || (isBold ? (defaults.font_bold || defaultBol) : (defaults.font || defaultReg));

        let size = t.size;
        if (!size && templateModule && templateModule.resolveSize) {
            size = templateModule.resolveSize(sectionId, t, index, pageIndex, isBold, sectionData.texts);
        }
        if (!size) {
            size = defaults.size || JS_DEFAULTS.size;
        }

        let w = t.w;
        if (w === undefined && templateModule && templateModule.resolveW) {
            w = templateModule.resolveW(sectionId, t, index, pageIndex);
        }
        if (w === undefined) {
            w = +(doc.font(font).fontSize(size).widthOfString(t.text)).toFixed(2);
        }

        let renderX;
        if (align === 'right')       renderX = anchor - w;
        else if (align === 'center') renderX = anchor - (w / 2);
        else                         renderX = anchor;

        let renderY = t.y;
        if (templateModule && templateModule.resolveY) {
            renderY = templateModule.resolveY(sectionId, t, index, pageIndex, cardH, renderY, layoutMetrics);
        }

        drawTextExact(doc, t.text, renderX, renderY, w, size, color, font);
    });
};

const renderPage = (doc, rawPageData, pageIndex = 0) => {
    let raw = rawPageData;
    if (raw && !Array.isArray(raw) && (raw.page || raw.pages) && !raw.sections) {
        const pagesList = raw.page || raw.pages || [];
        const pageItem = pagesList[pageIndex] || {};
        raw = Object.assign({
            template: raw.template,
            header: raw.header,
            font_family: raw.font_family
        }, pageItem);
    }
    const templateName = raw.template || 'gocar';
    const templateModule = TEMPLATE_MODULES[templateName] || TEMPLATE_MODULES['gocar'];
    const pageData = (templateModule && templateModule.enrichPageData)
        ? templateModule.enrichPageData(raw, pageIndex)
        : raw;
    const pageFontFamily = pageData.font_family || (templateModule && templateModule.FONT_FAMILY) || 'DejaVuSans';

    const m = (templateModule && templateModule.getLayoutMetrics) ? templateModule.getLayoutMetrics(pageData, pageIndex) : {};
    const cardH = m.cardH || 579.5;

    // 1. Delegate visual layout shapes to dedicated template module
    if (templateModule && templateModule.renderLayout) {
        templateModule.renderLayout(doc, pageData, pageIndex);
    }

    const sectionDefaults = (templateModule && templateModule.SECTION_DEFAULTS) || {};

    // 2. Render sections (texts, images, links)
    if (pageData.sections) {
        Object.entries(pageData.sections).forEach(([sectionId, sectionData]) => {
            const defaults = Object.assign({}, sectionDefaults[sectionId] || {}, sectionData.default || {});
            renderSection(doc, sectionId, defaults, sectionData, pageFontFamily, pageIndex, templateModule, cardH, m);
        });
    } else {
        // Legacy flat format
        renderSection(doc, 'default', {}, pageData, pageFontFamily, pageIndex, templateModule, cardH, m);
    }

    // Unclassified elements (no section match)
    if (pageData.unclassified) {
        renderSection(doc, 'unclassified', {}, pageData.unclassified, pageFontFamily, pageIndex, templateModule, cardH);
    }
};

module.exports = renderPage;
