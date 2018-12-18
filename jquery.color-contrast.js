// Parse rgb(r, g, b) and rgba(r, g, b, a) strings into an array.
// Adapted from https://github.com/gka/chroma.js
var parseRgb = function (css) {
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
    return rgb;
};

// Based on http://www.w3.org/TR/WCAG20/#contrast-ratiodef
var contrastRatio = function (x, y) {
    var l1 = relativeLuminance(parseRgb(x));
    var l2 = relativeLuminance(parseRgb(y));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Based on http://www.w3.org/TR/WCAG20/#relativeluminancedef
var relativeLuminance = function (c) {
    var lum = [];
    for (var i = 0; i < 3; i++) {
        var v = c[i] / 255;
        lum.push(v < 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    }
    return 0.2126 * lum[0] + 0.7152 * lum[1] + 0.0722 * lum[2];
};

// Based on http://jsfiddle.net/Y4uDL/
var getBackground = function (el) {
    var bgColor = el.css('background-color');
    var bgImage = el.css('background-image');

    if (bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent' && bgImage === "none") {
        return bgColor;
    } else if (bgImage !== "none") {
        return "image";
    }

    if (el.is('html')) {
        return 'rgb(255, 255, 255)';
    } else {
        return getBackground(el.parent());
    }
};

// contrast checker
$('*:visible').each(function () {
    var $this = $(this),
        color = $this.css('color'),
        fill = $this.css('fill'),
        background = getBackground($this),
        htmlTag = $this[0].tagName,
        textCheck = $this.clone().children().remove().end().html(),
        ratingString,
        fontSizeString,
        failed;

    // Check if node has text (not children or whitespace) or is svg
    if ($.trim(textCheck).length) {

        // does element have a background image - needs to be manually reviewed
        if (background === "image") {
            ratingString = "Needs manual review";
            fontSizeString = "N/A"
            failed = true;
        } else {
            var ratio = Math.round(contrastRatio(color, background) * 100) / 100,
                ratioText = ratio + ':1',
                fontSize = parseInt($this.css('fontSize')) * 3 / 4, // http://www.w3.org/TR/CSS2/syndata.html#length-units
                fontWeight = $this.css('fontWeight');

            if (fontSize >= 18 || fontSize >= 14 && fontWeight >= 700) {
                fontSizeString = 'large scale text'
                if (ratio < 3) {
                    ratingString = 'fail';
                    failed = true;
                } else {
                    ratingString = 'pass';
                    failed = false;
                }
            } else {
                fontSizeString = 'normal body text'
                if (ratio < 4.5) {
                    ratingString = 'fail';
                    failed = true;
                } else {
                    ratingString = 'pass';
                    failed = false;
                }
            }


        }
    }

    // highlight the element in the DOM and log the element, contrast ratio and failure
    // for testing in console
    if (failed) {
        var tag = htmlTag;
        $this.css('box-shadow', '0px 0px 0px 3px rgba(250,13,5,1)');
        if ($this[0].id) {
            tag = tag + '#' + $this[0].id;
        }
        if ($this[0].className) {
            tag = tag + "." + $this[0].className;
        }

        console.log(tag + "\n" + ratioText + ", " + fontSizeString + ", " + ratingString);
    }
});
