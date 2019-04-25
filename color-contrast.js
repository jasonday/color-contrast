var contrastErrors = {
    errors: [],
    warnings: []
};
var contrast = {
    // Parse rgb(r, g, b) and rgba(r, g, b, a) strings into an array.
    // Adapted from https://github.com/gka/chroma.js
    parseRgb: function (css) {
        var i, m, rgb, _i, _j;
        if (m = css.match(/rgb\(\s*(\-?\d+),\s*(\-?\d+)\s*,\s*(\-?\d+)\s*\)/)) {
            rgb = m.slice(1, 4);
            for (i = _i = 0; _i <= 2; i = ++_i) {
                rgb[i] = +rgb[i];
            }
            rgb[3] = 1;
        } else if (m = css.match(/rgba\(\s*(\-?\d+),\s*(\-?\d+)\s*,\s*(\-?\d+)\s*,\s*([01]|[01]?\.\d+)\)/)) {
            rgb = m.slice(1, 5);
            for (i = _j = 0; _j <= 3; i = ++_j) {
                rgb[i] = +rgb[i];
            }
        }
        //console.log(rgb);
        return rgb;
        
    },
    // Based on http://www.w3.org/TR/WCAG20/#relativeluminancedef
    relativeLuminance: function (c) {
        var lum = [];
        for (var i = 0; i < 3; i++) {
            var v = c[i] / 255;
            lum.push(v < 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        }
        return (0.2126 * lum[0]) + (0.7152 * lum[1]) + (0.0722 * lum[2]);
    },
    // Based on http://www.w3.org/TR/WCAG20/#contrast-ratiodef
    contrastRatio: function (x, y) {
        var l1 = contrast.relativeLuminance(contrast.parseRgb(x));
        var l2 = contrast.relativeLuminance(contrast.parseRgb(y));
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },
    
    getBackground: function (el) {

        var styles = getComputedStyle(el),
            bgColor = styles.backgroundColor,
            bgImage = styles.backgroundImage;
            rgb = contrast.parseRgb(bgColor) + '',
            alpha = rgb.split(',');
        
        // if background has alpha transparency, flag manual check
        if(alpha[3] < 1 && alpha[3] > 0) {
            return "alpha";
        }
        
        // if element has no background image, or transparent background (alpha == 0) return bgColor
        if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgImage === "none" && alpha[3] !== '0') {
            return bgColor;
        } else if (bgImage !== "none") {
            return "image";
        }
        
        // retest if not returned above
        if (el.tagName === 'HTML') {
            return 'rgb(255, 255, 255)';
        } else {
            return contrast.getBackground(el.parentNode);
        }
    },
    // check visibility - based on jQuery method
    isVisible: function (el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    },
    check: function () {
        var elements = document.querySelectorAll('*');
        for (var i = 0; i < elements.length; i++) {
            (function (n) {
                var elem = elements[n];
                // test if visible
                if (contrast.isVisible(elem)) {
                    var style = getComputedStyle(elem),
                        color = style.color,
                        fill = style.fill,
                        fontSize = parseInt(style.fontSize),
                        pointSize = fontSize * 3/4,
                        fontWeight = style.fontWeight,
                        htmlTag = elem.tagName,
                        background = contrast.getBackground(elem),
                        textString = [].reduce.call(elem.childNodes, function (a, b) {
                            return a + (b.nodeType === 3 ? b.textContent : '');
                        }, ''),
                        text = textString.trim(),
                        ratio,
                        error,
                        warning;

                    if (htmlTag === "SVG") {
                        ratio = Math.round(contrast.contrastRatio(fill, background) * 100) / 100;
                        if(ratio < 3) {
                            error = {
                                elem: elem,
                                ratio: ratio + ':1',
                                detail: "",
                                info: "SVG elements must have a minimum contrast ratio of 3:1"
                            }
                            contrastErrors.errors.push(error);
                        }
                    } else if (text.length || htmlTag === "INPUT" || htmlTag === "SELECT" || htmlTag === "TEXTAREA") {
                        // does element have a background image - needs to be manually reviewed
                        if (background === "image") {
                            warning = {
                                elem: elem,
                                ratio: 'unknown',
                                detail: "",
                                info: "Contrast of text against background images must be checked manually"
                            }
                            contrastErrors.warnings.push(warning)
                        } else if(background === "alpha"){
                            warning = {
                                elem: elem,
                                ratio: 'unknown',
                                detail: "",
                                info: "Contrast of text against an alpha transparency background must be checked manually"
                            }
                            contrastErrors.warnings.push(warning)
                        } else {
                            ratio = Math.round(contrast.contrastRatio(color, background) * 100) / 100;
                            if (pointSize >= 18 || (pointSize >= 14 && fontWeight >= 700)) {
                                if (ratio < 3) {
                                    error = {
                                        elem: elem,
                                        ratio: ratio + ':1',
                                        detail: fontSize + "px " + fontWeight,
                                        info: "Large scale text (greater than 18pt/24px or 14pt/18.667px bold) must have a minimum contrast ratio of 3:1"
                                    }
                                    contrastErrors.errors.push(error);
                                }
                            } else {
                                if (ratio < 4.5) {
                                    error = {
                                        elem: elem,
                                        ratio: ratio + ':1',
                                        detail: fontSize + "px " + fontWeight,
                                        info: "Normal body text (less than 18pt/24px or 14pt/18.667px bold) must have a minimum contrast ratio of 4.5:1"
                                    }
                                    contrastErrors.errors.push(error);
                                }
                            }
                        }
                    }
                }
            })(i);
        }        
        return contrastErrors;
    }
}
