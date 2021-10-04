// "use strict"; // can be commented on production version
// AK 5.04.2020: Let's prefer Vanilla JS instead of jQuery where it's possible.

// REQUIRED CONFIG VARS (maybe from outside)
//var svgIconPath       = "/i/icon/",
//    defLang           = "en";

var commonSvgIcons = {
      // hostUnreachable: "trexl", // not used since 18.12.2019. We're using 🦖-emoji instead. Picture not available when connection lost with our own server.
      navError: "search-bug",
    },
    // TOUCH DEVICE DETECTION
    // Warning! We never know for sure wether it's touch-enabled device before the first tap! So it's not 100% certain constant.
    isTouchDevice = "ontouchstart" in window; // it's not 100% reliable way. So false is unknown. 0 or 1 when either "mousemove" or "touchstart" detected.

(function($, document, window) {
    // AK 19.07.2021: we setting up 2 classes, together with standard Bootstrap's "is-valid/is-invalid",
    // to be able to recognize the reason of error (or validity method). There is possible other reasons why the input "is-invalid".
    // For example, see "emailautocomplete", where is-invalid may be cleared if email just have valid syntax.
    var classIsValidInput = "is-valid-input",
        classIsInvalidInput = "is-invalid-input",
        classIsValidEntry = "is-valid " + classIsValidInput,
        classIsInvalidEntry = "is-invalid " + classIsInvalidInput;


    // OBJECT HELPERS
    window.valOf = function(obj, key, def) { // unfortunately object.valueOf() doesn't returns false if object has no property. So we need custom func.
        // even if object property exists but it's false -- return default.
        return ((("object" === typeof obj) && obj.hasOwnProperty(key)) ? obj[key] : false) || def;
    }

    // returns result of function, if object is function, or value of an object itself.
    window.fVal = function(obj) {
        return "function" === typeof obj ? obj() : obj;
    }

    // just dispatchEvent compatible with IE. If you don't need IE -- no need to use it.
    window.ieEvent = function(targetObj, // window, document, etc
                            eventName, // string
                            params) {  // any type
        var event;

        if ("function" === typeof Event) { // modern browsers
            event = new CustomEvent(eventName, params ? { detail: params } : null);
        }else { // IE
            event = document.createEvent("CustomEvent");
            event.initEvent(eventName, true, true, targetObj);
            if (params) event.detail = params;
        }
        targetObj.dispatchEvent(event);
    }


    // STRING UTILITIES
    if (!String.prototype.trim) { // trim() is part of JavaScript v1.8.1: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
        String.prototype.trim = function() {
            return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, ""); // AK 29.04.2019: tested, both Unicode and non-Unicode safe.
        };
    }

    if (!String.prototype.trimStart) { // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trimStart
        //https://github.com/FabioVergani/js-Polyfill_String-trimStart
        (function(w) {
            var String = w.String,
                Proto = String.prototype;

            (function(o, p) {
                if (p in o?o[p]?false:true:true) { // AK: wow!
                    var r = /^\s+/;
                    o[p] = o.trimLeft || function() {
                        return this.replace(r, "");
                    }
                }
            })(Proto, "trimStart");

        })(window);
    }

    String.prototype.trimEllip = function(maxLength, trimToWord) { // playground: https://jsfiddle.net/utilmind/48fmv2z5/
        var tryStr, me = this;
        if (me.length > maxLength) {
            me = me.substring(0, maxLength).trim();

            if (trimToWord) {
                var i = me.lastIndexOf(" "),
                    j = me.lastIndexOf("\n");
                if (i < j) i = j;
                if ((i > 0) && (tryStr = me.substring(0, i).trim()))
                    me = tryStr; // only if tryStr is not empty
            }

            me+= "…"; // 1 symbol. Originally was "&hellip;";, but sometimes we need console output.
        }

        return me;
    }

    String.prototype.stripTags = function() { // https://stackoverflow.com/questions/822452/strip-html-from-text-javascript
        var tmp = document.createElement("DIV");
        tmp.innerHTML = this;
        return tmp.textContent /* visible text */ || tmp.innerText /* all text */ || "";

        /* An alternative, if you're trying to avoid DOM usage:
        return this.replace("&nbsp;", " ")
            .replace(/<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi, "")
            .replace(/<\/?([a-z][a-z\d]*)\b[^>]*>/gi, "")
            .trim();
        */
    }

    String.prototype.htmlquotes = function() {
        return this.replace("'", "&apos;") // DO NOT set "&rsquo;" here! It’s apostroph, not right-single quote yet! We don't want to break the passwords!
                    .replace('"', "&quot;")
                    .replace("<", "&lt;") // for canonical html, to avoid errors in "hidden" input fields
                    .replace(">", "&gt;");

        /* The following code is longer, but a way more cool.
        var r = this,
            c = [["'", "&apos;"],
                ['"', "&quot;"],
                ["<", "&lt;"],
                [">", "&gt;"],
                ];
        $.each(c, function(key, val) {
                r = r.replace(val[0], val[1]);
                });
        return r;
        */
    }

    String.prototype.nl2br = function() {
        return this.replace(/\r/g, "") // we surely don't need them.
                    .replace(/\n/g, "<br />");
    }

    String.prototype.br2nl = function(keepExistingNls) {
        return (keepExistingNls ? this : this.replace(/[\r\n]/g, "")) // strip all previous \r and \n.
                    .replace(/\<br([^>]*?)\>/gi, "\n"); // turn <br />'s into "\n".
    }

    // new RegExp(str) cannot accept chars like "\" etc. This function escapes the string for safe use in regular expression.
    String.prototype.escRegExp = function() { // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
        return this.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    },

    String.prototype.finAnd = function(strAnd,  // default is commonLang["and"]
                                    separator) { // defailt is comma (",") with possible some spaces after comma.

        if (!strAnd) strAnd = " "+commonLang["and"]+" "; // defauls
        if (!separator) separator = ",";

        var regexLast = new RegExp(separator + "\\s*?$"),
            regexPrev = new RegExp(separator + "\\s*?(\\S+)$");

        return this.replace(regexLast, ""). // removing the last comma
                    replace(regexPrev, " "+strAnd+" $1") // replacing pre-last comma to " and ".
    }

    String.prototype.basename = function() {
        return this.replace(/.*(\\|\/)/, "");
    }

    // Usage example: "2000-01-01T00:00:00".formatDate("YYYY-MM-DD").
    // (AK: Introduced for Overstory.)
    String.prototype.formatDate = function(dateTimeFormat) {
        var t = new Date(this),
            day = t.getDate(),
            month = t.getMonth()+1,
            hour = t.getHours(),
            i, rplc = [
                // Windows styles, except only MMM (3-letter month name), that require translations.
                ["YYYY", "Y"],
                ["YY", "y"],
                ["MM", "m"],
                ["M", "n"],
                ["DD", "d"],
                ["D", "j"],

                // Unix styles
                ["Y", t.getFullYear()],
                ["y", t.getFullYear().toString().substr(-2)],
                ["m", month > 9 ? month : "0" + month],
                ["n", month],
                ["d", day > 9 ? day : "0" + day],
                ["j", day],
                ["G", hour > 9 ? hour : "0" + hour],
                ["H", hour],
                ["i", t.getMinutes()],
                ["s", t.getSeconds()]
            ];

        // there is 2 possible styles of formatting.... MM/DD/YYYY (Windows style) and j/n/Y (Unix style). We can support them both.
        for (i in rplc)
            dateTimeFormat = dateTimeFormat.replace(rplc[i][0], rplc[i][1]);

        return dateTimeFormat;
    }

    // Ideal https://stackoverflow.com/questions/149055/how-to-format-numbers-as-currency-strings + few improvements (particularly currencyPrefix).
    Number.prototype.formatMoney = function(decPlaces, thouSeparator, decSeparator, currencyPrefix) {
        var n = this,
            decPlaces = isNaN(decPlaces = Math.abs(decPlaces)) ? 2 : decPlaces,
            decSeparator = undefined === decSeparator ? "." : decSeparator,
            thouSeparator = undefined === thouSeparator ? "," : thouSeparator,
            sign = 0 > n ? "-" : "",
            i = parseInt(n = Math.abs(+n || 0).toFixed(decPlaces)) + "",
            j = 3 < (j = i.length) ? j % 3 : 0;

        return sign + (currencyPrefix || window.currencyPrefixSign || "") + // ATTN! Attempt to use global variable currencySign!
            (j ? i.substr(0, j) + thouSeparator : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thouSeparator) + (decPlaces ? decSeparator + Math.abs(n - i).toFixed(decPlaces).slice(2) : "");
    }

    // see also is_valid_email() in "strings.php".
    String.prototype.isValidEmail = function() {
       // This all are valid accordingly to RFC: !#$%&'*+-/=?^_`{|}~
       // Gmail use + for subadressing. Usage of other special chars in unknown, but they are still valid anyway.
       // Double-dot, however (..) is not allowed.
       return 0 <= this.indexOf("..")
           ? false // email can't have 2 dots at row
           : /^([\w!#$%&'*+\-/=?^_`{|}~]+(?:\.[\w!#$%&'*+\-/=?^_`{|}~]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,30}(?:\.[a-z]{2})?)$/i.test(this.trim()); // the longest domain extension in 2015 was ".cancerresearch", and looks like it's not the limit. UPD. how about .travelersinsurance? I set up it the longest domain extension to 30 chars.
    }

    // USA phones should contain at least 10 digits. For Ukrainian phones it’s OK to have only 9 digits, without leading 0 and country code prefix: [+380] 88 888-88-88.
    // UPD. India: +91(+10 digits), China: +86(+10 or 11 digits), etc.
    String.prototype.isValidPhone = function(minDigitsCount, maxDigitsCount) { // please customize minDigitsCount!
        var str = this.trim();
        if (str) {
            var len,
                isPlus = ("+" === str.charAt(0)),
                defMin = isPlus ? 11 : 10, // 10 digits is standard w/o country code for the US, Canada and many other countries. (...and 10-digits number is DEFAULT! AK: DON'T CHANGE IT HERE!)
                                        // however, for countries like Ukraine all numbers without country code have only 9 digits length, or even 7, without regional code.
                                        // So please customize minDigitsCount accordingly to the length of numbers in your default country!

                defMax = isPlus ? 14 : 11; // 11 digits maximum w/o country code (China) or 14 with country code (Austria).

            if ((str = str.match(/\d/g)) && (str = str.join(""))) { // all digits only!
                len = str.length;

                return len >= (minDigitsCount || defMin) &&
                    len <= (maxDigitsCount || defMax);
            }
        }
    }

    // Strongly recommended to remove all characters except " ", "-" and "()". "+" allowed as prefix. All other non-digit characters should be replaced with spaces. Double spaces should be removed.
    String.prototype.clearPhone = function() {
        var phone = this.trimStart();
        if (phone) {
            var isPlusPrefix = "+" === phone.charAt(0);
            phone = phone.replace(/(–|—)/g, "-") // convert medium and long dashes to minus (-)
                        .replace(/\s*-\s*?/g, "-") // remove ugly spaces between minuses (-)
                        .replace(/[^\d-() ]/g, "").trim()
                        .replace(/([^\d])\1+/g, "$1"); // strip duplicates
            if (isPlusPrefix) phone = "+" + phone;
        }
        return phone;
    }

    String.prototype.toClipboard = function() {
        var body = document.body,
            inputEl = document.createElement("INPUT");

        body.appendChild(inputEl);
        inputEl.value = this;
        inputEl.select();
        document.execCommand("copy");
        body.removeChild(inputEl);
    }

    Number.prototype.percents = function(percents, zero) { // "percents" is 100 by default
        return 0 != this // AK: not !==, because number can be either "integer" or "float"
            ? this / 100 * (undefined !== percents ? percents : 100) // no percents = 100%
            : (zero || 0);
    }

    Number.prototype.percentsOf = function(part, zero) {
        return 0 != this // AK: not !==, because number can be either "integer" or "float"
            ? part * 100 / this
            : (zero || 0);
    }


    // Of course we can use style="text-transform: capitalize" (or Bootstrap's class "text-capitalize").
    // However:
    //   1. The text changes only visually. In reality it remains the same. (Yes, we still can process it on backend, but why not do it immediately on the fly?)
    //   2. "text-transform: capitalize" does not process CAPSLOCKED text. The whole uppercased text is the same shit as the only lowercased.
    // USAGE (best if used together with "text-transform: capitalize"): <input onBlur="this.value = this.value.ucwords()" style="text-transform: capitalize" />
    //
    // UPD 22.08.2019. Try to avoid this function. Better use mb_convert_case($_POST['fName'], MB_CASE_TITLE, 'utf-8'), if possible. This will work with all alphabets of UTF-8.
    String.prototype.ucwords = function() {
        return this.toLowerCase()
            .replace(/(^|\s|\-|\()[^\s($]/g, function(m) { // AK 14.06.2020: added uppercase after "(".
                return m.toUpperCase();
            })
            // French, Arabic and some noble names...
            .replace(/\s(Of|De|Van|Von|Ibn|Из|Ван|Фон|Ибн)\s/g, function(m) { // Honoré de Balzac, Vincent van Gogh, Otto von Bismarck, Sulaymān ibn Dāwūd etc.
                return m.toLowerCase();
            })
            .replace(/(^|\s)(D|Д)(['’][^\s$])/g, function(m, p1, p2, p3) { // D'Artagnan or d'Artagnan / Д’Артаньян или д’Артаньян
                return p1 + ("" === p1 ? p2/*.toUpperCase()*/ : p2.toLowerCase()) + p3.toUpperCase();
            });
    }

    /* // 2 very simple 1-line function. So simple so we can use them each time as is. No need to bring the prototypes to each app we make.
    String.prototype.firstName = function(separator) {
        separator = separator || " ";
        return this.split(separator).slice(0, -1).join(separator); // "Oleksii Vasyliovych Kuznietsov" => "Oleksii Vasyliovych"
    }

    // Returns the last word from string. For example, the lastname of the full name.
    String.prototype.lastName = function(separator) {
        return this.split(separator || " ").slice(-1).toString(); // "Oleksii Vasyliovych Kuznietsov" => "Kuznietsov"
    }*/

    // Splits the string only ONCE (into 2 parts) and INCLUDES everythig after the separator into 2nd item.
    // Returns an array if both values found, or FALSE if any part not found AND useEmpty is FALSE.
    //   However, if useEmpty specified, it ALWAYS returns an array. Set useEmpty to 0, to get the whole content (except separator) to the left side (item #0), or to 1 to get the content to the right side (item #1).
    String.prototype.gap = function(
            separator,  // default separator (if not specified) is \t (TAB).
            useEmpty) { // "useEmpty" is an optional parameter. Determines whether we should use result if either part between separator is empty.
                        //   Possible values are:
                        //     0 -- get the whole string to the left side (item #0)
                        //     1 -- get the whole string to the right side (item #1)
        if (!separator) separator = "\t";
        var me = this,
            pos = me.indexOf(separator);

        if (0 < pos) // if separator found and first item is not empty
            return {
                0: me.substr(0, pos),
                1: me.substr(pos + separator.length, me.length)
            };

        if (undefined === useEmpty)
            return false;

        pos = pos < 0 /*separator not found?*/ ? me : me.substr(separator.length);

        return useEmpty ?
            { 0: "", 1: pos } : // all goes to right side (item #1)
            { 0: pos, 1: "" };  // all goes to left side (item #0)
    }

    // Legacy. Don't use. Remove in the future.
    window.printf = function() {
        var i,
            n = arguments.length - 1,
            s = arguments[0];

        for (i = 0; i < n; ++i)
            if (s.indexOf("{"+i+"}") >= 0)
                s = s.replace(new RegExp("\\{"+i+"\\}", "g"), arguments[i+1]);

        return s;
    }


    // NUMBERS
    window.fl0at = function(v, def) { // same as parseFloat, but returns 0 if parseFloat returns non-numerical value
        return isNaN(v = parseFloat(v))
                ? (undefined !== def ? def : 0) // "" is good value too. Don't replace with 0 if "" set.
                : v;
    }

    // Rounds a number to some precision after floating point. Precision can be fixed, if "precise" parameter is negative.
    // It uses GLOBAL "roundDigits" variable as global value, if "precise" not specified.
    // If precise parameter is any non-numerical value, the fixed number of digits will be used and count of numbers after floating point specified in "rund_digits" GLOBAL variable.
    //
    // Usage 1: floatRound(123.321, 2);   Result: 123.32
    // Usage 2: floatRound(123, -2);      Result: 123.00
    window.floatRound = function(v, precise) { // if precise is NEGATIVE (or any non-numeric value for default precision) will be used an exact fixed number of digits after floating point.
        var isFixed = false;

        if ((2 > arguments.length) || (isFixed = isNaN(precise))) {
            precise = roundDigits; // GLOBAL var (first used in "Calculium" project.)
            if (!precise && 0 !== precise) precise = 2; // default
        }else {
            isFixed = precise < 0;
            precise = -precise; // Math.abs(precise);
        }

        if (isFixed)
            return parseFloat(v).toFixed(precise);

        precise = Math.pow(10, precise);
        return Math.round(v * precise) / precise;
    }

    window.uniqId = function() { // generator of unique Ids. (Can't use uniqueId() because of naming conflict with jQuery UI.)
        var token = "_uniqId_",
            u = window[token]; // using global is bad practice :(( Think of something better. Maybe jQuery's .data()?

        return window[token] = u ? ++u : 1;
    }


    // COOKIES (avoid them when it's possible. Use sessionStorage and localStorage instead.)
    window.getCookie = function(name, def) {
        var i, c, ca = document.cookie.split(";"),
            nameEQ = name + "=";

        for (i = 0; i < ca.length; ++i) {
            c = ca[i].replace(/^\s+/, "");
            if (0 === c.indexOf(nameEQ))
                return unescape(c.substr(nameEQ.length));
        }
        return def;
    }

    window.setCookie = function(name, value, expireSecs) { // to clear cookie set value to "". No value = no cookie.
        var expireStr = "";
        if ("" != value) { // value can be boolean false, so don't do exact type comparison
            var t = new Date();
            t.setTime(t.getTime() + (expireSecs ? expireSecs * 1000 : 31536000000)); // 1 year if expiration time not specified
            expireStr = t.toGMTString();
        }

        if ("boolean" === typeof value)
            value = value ? "1" : "";
        else
            value = escape(value);

        document.cookie = name+"="+value +
            // cookie without expiration is session cookie
            (expireStr ? ";expires=" + expireStr : "") +
            ";path=/;samesite=strict" + // Since 14.12.2019 we serving only secure cookies and only on the same site. If you need something different -- write alternative implementation.
            (location.protocol === "https:" ? ";secure" : "");
    }


    /*/ STORAGE. Expirable session records. Original idea: https://stackoverflow.com/questions/15171711/expiry-of-sessionstorage
    window.sessionGet = function(key) {
        // var val = ("undefined" === typeof sStorage ? sessionStorage : sStorage).getItem(key);
        var val = sStorage.getItem(key);
        if (("string" === typeof val) && (val = parseJSON(val))) {
            if (new Date(val.e) < new Date()) {
                sStorage.removeItem();
                val = null;
            }else {
                val = val.v;
            }
        }
        return val;
    }

    window.sessionSet = function(key, val, expireMin) {
        // ("undefined" === typeof sStorage ? sessionStorage : sStorage)
        sStorage.setItem(key, JSON.stringify({
                v: val,
                e: new Date(new Date().getTime() + (60000 * expireMin)).toISOString(),
            }));
    }*/


    // SELECTION
    window.unselectme = function() {
        if (window.getSelection)
            getSelection().removeAllRanges();

        else if (document.selection)
            document.selection.empty();

        return false;
    }

    window.selectme = function(e) {
        if (("string" === typeof e) && e)
            e = document.getElementById(e);

        if (e) {
            if (document.body.createTextRange) {
                var range = document.body.createTextRange();
                range.moveToElementText(e);
                range.select();

            }else if (window.getSelection) {
                var range = document.createRange(),
                    selection = window.getSelection();

                range.selectNodeContents(e);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }


    // ALERT BOXES (TODO: Make this with pure Bootstrap, instead of Alertify!) UPD 12.08.2019: I doubt that pure Bootstrap will be better than Alertify, which is totaly awesome!
    // Wrap text message into table with icon
    window.umboxPrep = function(t, options) { // isBold, icon, iconWidth
        var icon;

        if (options) {
            switch (typeof options) {
                case "string": { // just icon
                        options = { "icon": icon = options};
                        break;
                    }
                case "object": {
                        icon = valOf(options, "icon");
                        break;
                    }
                default: {
                    icon = false; // we don't care about "number"'s and other types. Only strings and objects are OK.
                    options = false;
                }
            }
        }

        // try to retrieve an icon from text
        if (("string" === typeof t) && ("{" === t.charAt(0))) { // {icon:xxx}text. UPD 5.09.2019. This
            var e = t.indexOf("}"),
                d = t.indexOf(":");

            if (e && d && (d < e)) {
                if ("icon" === t.substr(1, d-1).trim()) {
                    icon = t.substr(d+1, e-d-1).trim();
                    if ("object" === typeof options)
                    options.icon = icon;
                    else
                    options = {"icon": icon};

                    t = t.substr(e+1).trimStart(); // we don't fix the string if first item is not an "icon". Maybe it's stringified JSON output. Display it as is.
                }
            }
        }

        if ("object" === typeof options) {
            var isEmoji,
                isBold = valOf(options, "isBold"),
                iconWidth = valOf(options, "iconWidth");

            if (icon) {
                iconWidth = iconWidth ? ' style="width: '+iconWidth+'"' : "";
                // icon is emoji?
                if (isEmoji = (127 < icon.charCodeAt(0))) { // not a legal ascii/filename character. Let's consider it as emoji.
                    icon = '<span class="ajs-emoji">'+icon+'</span>';
                }else {
                    icon = '<img src="'+svgIconPath+icon+'.svg"'+iconWidth+' alt="'+icon+'" />';
                }

                if (400 < t.length) { // long texts looking ugly in table. TODO: rewrite it without table.
                    t = '<div class="ajs-text ajs-umbox' + (isBold ? " ajs-bold" : "") +
                        '">' + icon + t + '</div>';
                }else
                    t = '<table class="ajs-table"><tr><td class="ajs-text'+
                        (isBold ? " ajs-bold" : "") + '">' + t +
                        '</td><td class="ajs-icon'+(isEmoji ? '-emoji' : '')+'"'+iconWidth+'>'+icon+'</td></tr></table>';

            }else if (isBold)
                t = '<div class="ajs-bold">'+t+'</div>';
        }
        return t;
    }

    window.umbox = function(t, options /*or icon when (string)*/) { // icon, iconWidth, isBold, title, onOk, effect
        var title, onOk = valOf(options, "onOk");

        t = umboxPrep(t, options); // prepare even if options doesn't specified

        if (window.alertify) {
            alertify.alert().set({transition: valOf(options, "effect", "zoom")});
            if (("object" === typeof options) && (onOk || (title = valOf(options, "title"))))
                alertify.alert(title, t, onOk);
            else
                alertify.alert(t);
        }else {
            alert(t.br2nl().stripTags());  // Important! br2nl() before striptags()!
            if (onOk) onOk();
        }
    }

    // we always specifying onOk, so I want it as separate parameter. However, if onOk is object, it can be considered as an "options".
    // UPD: onOk and options parameters can be swapped. It can be (t, options, onOk).
    window.umconfirm = function(t, onOk, options) { // onOk, onCancel, icon, is_bold, icon_width
        if (onOk && ("function" !== typeof onOk)) { // onOk can be used to set up "options".
            if (options && ("function" === typeof options)) { // swap
                var swap = options;
                options = onOk;
                onOk = swap; // the function!
            }else
                onOk = valOf(options, "onOk");
        }

        var r, onCancel = valOf(options, "onCancel");

        t = umboxPrep(t, options); // prepare even if options doesn't specified

        if (window.alertify) {
            alertify.confirm(
                    options && options.title ? options.title : alertify.defaults.glossary.title, // always return to default title if not specified
                    t, onOk, onCancel);
            r = false;
        }else {
            if (r = confirm(t.br2nl().stripTags())) { // Important! br2nl() before striptags()!
                if (onOk) onOk(); // if onOk === "function"
            }else {
                if (onCancel) onCancel(); // if onCancel === "function"
            }
        }
        return r;
    }

    window.umnotify = function(t) {
        if (window.alertify) alertify.warning(t);
        else alert(t);
    }


    // FORMS
    // trigger inline form validation supported by ancient browsers. Works on IE11. See https://jsfiddle.net/utilmind/krbun2fw/ to test + see how to make custom validation messages.
    window.validateForm = function(form) { // this is FORCED VALIDATION.
        if (form) {
            // Check fields marked as invalid, which passed required/pattern validation.
            $(form).find("."+ classIsInvalidInput +":not(.ignore-invalid)").each(function() { // Bootstrap's ".is-invalid".
                this.setCustomValidity($(this).data("custom-validity") || commonLang.pleaseFixInput);

            }).one("input change paste", function() { // once
                this.setCustomValidity("");
            });


            if (form.checkValidity()) return 1; // valid as is

            if (form.reportValidity) // modern browsers
                form.reportValidity();
            else { // Internet Explorer
                // Create the temporary button, click and remove it
                var btn = document.createElement("button");
                form.appendChild(btn);
                btn.click(); // Important! This is native .click()! Don't replace with jQuery's .trigger("click")!
                form.removeChild(btn);
            }
        }
        return 0; // false
    }

    // Usage example:
    //   $field.one("input", resetFieldValidity);
    window.resetFieldValidity = function() {
        if ("" != this.value || !this.hasAttribute("required"))
            this.setCustomValidity(""); // "" is presumably valid input
    }

    // Focus being lost after closing "alertify". We must try to focus the control again after short delay. (require jQuery.)
    // el must be initialized DOM element
    window.delayedFocus = function(el, selectAll, delay) {
        if (!el) return;

        var doFocus = function() {
                // if (el instanceof jQuery)
                if (null !== el.offsetParent) { // is visible. Idea: https://stackoverflow.com/questions/19669786/check-if-element-is-visible-in-dom
                    try {
                        if ($) $(el).trigger("focus"); // do it with jQuery if possible. It should fix issues with mobile Safari etc.
                        el.focus(); // native focus
                        if (selectAll) el.select(); // native select
                    }catch(er){}
                }
            };

        // let's try immediately, then repeat in N ms.
        doFocus();
        setTimeout(doFocus, delay || 0);
    }

    // submitForm requires jQuery. formId passed in jQuery format, as #id.
    // works both with <input>- & <button>-based buttons.
    window.disableSubmit = function($form,
                                    submittingText) { // if submitting text is FALSE (or 0), but not undefined, it's RE-ENABLE of submit button(s).
                                                      // if submitting text is non-string TRUE, we DISABLING the submit button(s), but leaving the text intact.
        var isDisable = undefined === submittingText || !!submittingText;
        if (isDisable && !submittingText && window.commonLang)
            submittingText = commonLang.pleaseWait + "...";

        // we looking for both, <input>s and <button>s
        $($form).find(':submit:not([name="cancel"]):' + (isDisable ? "enabled" : "disabled")).each(function() {
            var $btn = $(this),
                isInput = "INPUT" === $btn.prop("tagName").toUpperCase(); // it's <input> element

            $btn.prop("disabled", isDisable);
            if (isDisable) {
                if (submittingText) {
                    if (isInput)
                        $btn.data("title", $btn.val()) // save original title
                            .val(submittingText);
                    else
                        $btn.data("title", $btn.html()) // save original content
                            .html('<span class="spinner-grow spinner-grow-sm"></span>&nbsp; ' + submittingText); // Bootstrap-based spinner

                }else { // leave the text as is, but try to show FontAwesome-based spinner...
                    $btn.find("i").removeClass("d-none").show(); // show FontAwesome-based spinner
                }
            }else {
                var originalTitle = $btn.data("title");
                if (originalTitle) {
                    if (isInput)
                        $btn.val(originalTitle);
                    else
                        $btn.html(originalTitle);
                }else {
                    $btn.find("i").hide(); // hide FontAwesome-based spinner
                }
            }
        });

        if (!submittingText)
            resetRecaptcha3($form); // recaptcha key will be re-requested
    }


    // SHARING
    window.shareUrl = function(serviceUrl/* anchor object allowed */, data /* parameters should be plain, data must be encoded. Allowed #id to some meta property. */, socNetwork) {
        var e, curUrl = "";

        if ("string" !== typeof serviceUrl) {
            serviceUrl = serviceUrl.href;
            // replace URL with the current one (URL in the address line may be different already upon AJAX surf).
            var i = serviceUrl.lastIndexOf("=");
            if (i > 0) {
                // try to get og_url. If not present -- giving current location as it seen in the address line.
                curUrl = (e = el("h-og_url")) ? e.content : location.href;
                serviceUrl = serviceUrl.substr(0, i+1) + curUrl;
            }
        }

        if (data) {
            var hash;
            while (hash = /#(.*?)($|&)/g.exec(data)) { // find all #hash...
                if (e = el(hash[1]))
                    data = data.replace("#"+hash[1], encodeURIComponent(e.content));
            }

            serviceUrl+= "&" + data;
        }

        // trigger Google Analytics event
        // Google Analytics reference:
        //   1. https://developers.google.com/analytics/devguides/collection/analyticsjs/tracker-object-reference#send
        //   2. https://stackoverflow.com/questions/15744042/events-not-being-tracked-in-new-google-analytics-analytics-js-setup
        if ("function" === typeof ga) {
            try {
                ga.getAll()[0].send("event", {
                        eventCategory: socNetwork,
                        eventAction: "share",
                        eventLabel: curUrl ? curUrl : location.href,
                    });

                /* // AK: this didn't worked for me 17.04.2019. Don't know where to check out stats. So let's use "event"/"share".
                ga.getAll()[0].send("social", {
                        socialNetwork: socNetwork,
                        socialAction: "like",
                        socialTarget: curUrl ? curUrl : location.href,
                    });
                */
            }catch(er){}
        }

        window.open(serviceUrl, "", "toolbar=0,status=0,width=626,height=456"); // height was 436, but telegram wants more.
        return false;
    }


    // DOM HELPERS && visualization
    window.el = function(id) {
        return /*("object" === typeof e) ? e :*/ document.getElementById(id);
    }
    /*
    window.del = function(e) {
        e.parentNode.removeChild(e); // $(url).remove();
    }*/

    /* Allows to execute some action with object (or scope of objects) only once.
    // Returns true if token initialized (and some action can be completed), or false otherwise.
    // It does not check if element itself exists.
    function once(el, token) {
        return isNaN(el[token || "_umOnce"])
            ? el[token] = true
            : false;
    }*/

    // get Bootstrap mode by page width
    // Returns the mode name if modeId NOT specified.
    // OR returns boolean (true|false) if current mode is equals OR *higher* than specified. It may be considered as "is the BS mode is at least [xx]?"
    // (If you need to check whether value are less than [xx] -- just check with logical NOT: if (!getBSMode("sm")), means xs and smaller.
    window.getBSMode = function(modeId) { // if modeId not specified, just returns the mode name.
        var width = innerWidth, // $(document).width(),
            modes = {
                //"xxs": 420,
                "xs": 576, // and less...
                "sm": 768, // and less...
                "md": 992, // ...
                "lg": 1200,
            },
            i, curMode = "xl"; // xl is default mode, for widths more than 1200px

        // deteminate current mode
        for (i in modes)
            if (width <= modes[i]) {
                curMode = i; // returns mode name
                break;
            }

        // modeId is case sensitive, but I don't care.
        return modeId ? (modeId === curMode) || (width > modes[modeId]) : curMode;
    }

    // public (AK: it was used in more than 2 of my projects, so let's make it canonical)
    window.isBSSmall = function(mode) {
        if (!mode) mode = getBSMode(mode);
        return "sm" === mode || "xs" === mode;
    }

    window.hideBSTooltips = function() {
        $(".tooltip:visible").tooltip("hide");
    }

    window.initBSTooltips = function($scope, customSelector) { // correct $scope required here. We don't check its availability
        // tooltips
        // NOTE: Bootstrap4 respects prefers-reduced-motion @media feature. So it don't displays animation when system doesn't want display in-window animation accordingly to Performance settings of OS.

        if (!customSelector) // if element already has some "data-toggle", eg data-toggle="dropdown", use '[data-toggle-second="tooltip"]' or 'some_other_attribute=something' to bound the tooltips.
            customSelector = '[data-toggle="tooltip"]';

        var $selectors = $scope.find(customSelector),
            $acronyms = $scope.find("acronym, abbr");

        if (isTouchDevice) {
            $selectors = $selectors.not(".tooltip-no-tap");
            $acronyms = $acronyms.not(".tooltip-no-tap");
        }

        $selectors.tooltip({ trigger: "hover", html: true });
        $acronyms.tooltip({ trigger: "focus hover", html: true });

        // hide all tooltips on click. We don't want frozen tooltips
        $scope.on("click", hideBSTooltips);
    }

    // first used on GoldHorn Records. <body> has class either touch or mouse, depending on available input device.
    // UPD. 1 year passed but never used in any other project. Maybe move out?
    window.initDeviceTypeClass = function($scope) {
        $($scope || document.body).find(".device-type").each(function() {
            $(this).removeClass(".device-type")
                .addClass("device-type-" + (isTouchDevice ? "touch" : "mouse")); // either: device-type-touch OR device-type-mouse.
        });
    }

    window.initCommonBehaviors = function($scope) {
        // -- HOOK CONTROLS within scope --
        $scope = $($scope || document.body); // jQuery it for sure

        // ... input boxes only. For static text -- use "user-select" CSS (in commons)
        var focusTimer;
        $scope.find("input.click-select").on("focus", function() {
            var me = this;
            try { // try..catch because of possible error with me.select() in IE
                me.select();

                // AK 24.05.2021: Several controls may receive "focus" event simultaneously and will try to grab focus from each other.
                // That's why we using 1 timer for all.
                if (focusTimer) {
                    clearTimeout(focusTimer);
                    focusTimer = false;
                }

                focusTimer = setTimeout(function() { // Edge hiding selection. Let's select it again after short timeout.
                    try { // IE still raise an error (SCRIPT606: Could not complete the operation due to error 800a025e.), so it's in try...catch.
                        me.select();
                    }catch(er){}
                }, 5); // Several controls may receive "focus" event simultaneously and will try to grab focus from each other.

            }catch(er){};
        });

        $scope.find("input.text-capitalize").on("blur", function() {
            this.value = this.value.ucwords();
        });

        $scope.find("input.custom-validity").on("invalid", function() {
            var $el = $(this);

            this.setCustomValidity($el.data("custom-validity")); // don't worry if it's not speciied. Default value will be used.

            $el.one("change input", function() {
                // reset custom validity for all radio-buttons with the same name on the same form
                if ("radio" === $el.prop("type")) {
                    // find the closest form and reset custom validity on all items
                    $el.closest("form").field($el.prop("name")).each(function() {
                        this.setCustomValidity("");
                    });
                }else
                    this.setCustomValidity("");
            });
        });

        // email autocomplete (now it's performed by "emailautocomplete" itself).
        if ($.fn.emailautocomplete)
            $scope.find('input[type="email"], input.email-autocomplete').emailautocomplete(); // .email-autocomplete class should be specified in type="text" fields. Eg in sign-in forms, for fields to provide either username or email.
        if ($.fn.phonePattern)
            $scope.find('input[type="tel"][data-pattern]').phonePattern();

        /* Decanonized due to very rare use.
        $scope.find(".esc-clear").on("keydown", function(e) { // don't let to press Escape if input box filled. Just clear it. BTW, I want this class
            var $this = $(this);
            if (27 === e.keyCode && ("" !== $this.val())) {
                e.stopPropagation();
                e.preventDefault();
                $this.val("").clearValidation();
            }
        });
        */

        // textareas + inputs
        $scope.find(".ctrlenter-submit").on("keypress", function(e) {
            var key = e.keyCode;

            if (((13 === key) && e.ctrlKey) || (10 === key)) {
                $(this).closest("form").trigger("submit"); // $this from above. Do not confuse!
            }
        });

        // no doubleclicks. BTW, this can be applicable to ALL labels. I don't see any reasons why they should be selecable on double-click.
        $scope.find("no-dbl-click, label.check-label").on("mousedown", function(e) {
            if (1 < e.detail) // double click
                e.preventDefault();
        });

        // placeholders
        $scope.find("select.place-i").each(function() { // Don't use ".place-bi" for selects!! Only "place-bi"!
            var $sel = $(this),
                updatePlaceholder = function(e) {
                    var selectedVal = $sel.val(),
                        hasValue = ("" != selectedVal) && (0 != selectedVal); // any non-false / non-empty / non-zero value

                    $sel.css("fontWeight", hasValue ? "bold" : "normal");
                    // $sel.css("fontStyle", hasValue ? "normal" : "italic");
                };

            updatePlaceholder($sel);
            $sel.on("change", updatePlaceholder);
        });

        initBSTooltips($scope);
    }

    window.canAnimate = function() {
        return !/*window.*/matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // This is for "animate.css", from official doc (https://github.com/daneden/animate.css, https://animate.style/), but rewritten to jQuery
    // Improvement: animationName can be an array. In this case the random effect will be used.
    window.animateCSS = function(element, animationName, callback) {
        // WARNING! Do NOT try to test how this function works if you have disabled animation of controls and elements inside windows in your OS settings.
        if (canAnimate()) {
            var $node = $(element),
                // BTW I thought to add Array.prototype.random() function, but can't do it, because it adding as new array member.
                // And it looks like adding new property into the prototype is bad idea because of potential clash with another code: https://stackoverflow.com/questions/948358/adding-custom-functions-into-array-prototype
                aniClasses = "animated " + (Array.isArray(animationName) ? animationName[Math.floor(Math.random() * animationName.length)] : animationName),
                animationEnd = function() {
                    $node.removeClass(aniClasses);
                    if ("function" === typeof callback) callback();
                };
            $node.one("animationend", animationEnd) // originally "on()"
                .addClass(aniClasses);

        }else { // don't animate
            if ("function" === typeof callback) callback();
        }
    }

    // Animate background colors to show quick flash, to draw user attention to the changed item. Requires "common.css". Playground: https://jsfiddle.net/utilmind/fc8j01yu/
    // Does not respects "prefers-reduced-motion" @media feature of CSS.
    // AK 13.12.2019: Almost uncanonized after discover of animate.css, but still keeping for cases when we don't need animation, but still require user attention.
    window.flashItem = function(el, flashClass) {
        if ((el = $(el)).length) { // we don't care if the element not exists, but certainly don't want an error
            el.addClass(flashClass = flashClass || "flash-item");

            var duration = el.css("animation-duration") || 2,
                durationMs = parseFloat(duration);
            if (!isNaN(duration) || (0 > duration.indexOf("ms"))) // duration in seconds? Convert to milliseconds.
                durationMs*= 1000; // this is not animation length. It's timeout to remove animation class.

            setTimeout(function() {
                el.removeClass(flashClass);
            }, durationMs);
        }
    }

    window.scrollPg = function(targetPos, targetEl, duration, onComplete) { // targetPos required, other params are optional
        if (isNaN(duration)) // set default
            duration = canAnimate() ? 600 : 200;

        // BTW. stop scrolling with $("html,body").stop().

        if (duration) {
            $(targetEl || "html,body").animate({ // AK 11.09.2020: that's right. Scroll relatively to <HTML> element, not document.body.
                scrollTop: targetPos,
            }, duration, null, onComplete);

            // next -- no smooth animation. And I don't want to jump to location.hash = "#" + targetAnchor. I don't want it in history twice.
        }else {
            $(targetEl || window).scrollTop(targetPos);

            // we're getting "scroll" event after scrollTop(). So let's trigger onComplete after little delay to avoid triggering "scroll" after onComplete(). (BTW no need to delay in case of animated scrollTop.)
            if (onComplete)
                setTimeout(onComplete);
        }
    }

    // @PRIVATE
    var updatePreloadCss = function() {
            // NOTE: Browsers (especially Chrome) may already prepare it before this piece of code will be loaded and executed. This is for outdated browsers only, like FireFox.
            // More about preloading contents and browsers support: https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content
            var i, links = document.head.querySelectorAll('link[rel="preload"][as="style"]');
            if (links && (0 < links.length))
                for (i = 0; i < links.length; ++i)
                    links[i].rel = "stylesheet";
        },

        // Unfortunately rel="preload" still not supported by FireFox on 9.12.2019: https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content
        // But we don't care FF, let's use it anyway. It should improve performance on other browsers.
        preloadUrl = function(src, resourceType) { // if resourceType not specified, it's "script" by default
            var head = document.head,
                preloader = document.createElement("link");

            /* AK 12.2019: Let me clarify about preloading...

            Even during the AJAX sessions we need to execute scripts in certain order.
            But we don't want to wait while the scripts will be loaded and executed one by one.
            Let's download everything at once ASAP. Then execute preloaded content one by one applying them into the bottom of <head> section.
            */
            preloader.rel = "preload";
            preloader.as = resourceType || "script";
            preloader.href = src;
            // preloading the resource immediately. With jQuery this can be shorter: $(head).prepend('<link rel="preload" href="'+src+'" as="script" />');
            // head.prepend(preloader); // modern browsers
            head.insertBefore(preloader, head.childNodes[0]); // IE
        };

    // Creates or finds a link to an external resource (script or link CSS), then put it to the <head> section of DOM.
    // Returns FALSE if resource with the same source already exists in DOM. (Not 100% certainly loaded, it may require additional verification, but exists.)
    window.headExtResource = function(url, // can be either an URL (string type), so new object will be created OR you may specify an object (HTML element) which *already created*. Object can be outside of the DOM, not necessary attached to the "document".
                                    tagName, // should be specified if URL identified as string. If not specified, it will try to find <script> elements with specified URL.
                                    onLoadEvents, // legal events: onLoad (default, used if it's "function" type) and onError.
                                    returnResourceEvenIfLoaded) { // return pointer to DOM object even if it's already loaded.

        var isObj = ("object" === typeof url);

        if (!tagName)
            tagName = isObj ? url.tagName : "script";

        var headObj,
            isScript = ("script" === tagName.toLowerCase()),
            src = isObj ? (isScript ? url.src : url.href) : url,
            objPriority,

            // check if this script are already in DOM... Search in entire document, not only in <head>. Script can reside in <body> too.
            head = document.head;

        // if ($(tagName+srcValidation).length)
        // Use document.querySelector('script[src="URL"]') to check out if resource available in DOM. Don't need to make separate function. Just reuse the line below.
        if (headObj = document.querySelector(tagName + (isScript ? '[src="'+src+'"]' : '[href="'+src+'"]'))) { // already loaded to <head> section. We don't need duplicates.

            // destroy myself as duplicate from scope! (This is not required, but cleaner.)
            if (isObj)
                url.parentNode.removeChild(url); // should be the same as $(url).remove();

            // Resource already present in DOM.
            return returnResourceEvenIfLoaded ? headObj : false;
        }

        // Not found. Creating new element.
        var onLoad, onError;
        headObj = document.createElement(tagName);

        if ("object" === typeof onLoadEvents) {
            onError = onLoadEvents.onError;
            onLoad = onLoadEvents.onLoad;
        }else
            onLoad = onLoadEvents;


        if (isScript) {
            if (isObj && url.defer) { // defered scripts are adding to DOM, but NOT LOADING immediately
                headObj.srcdefer = src; // !!srcdefer!!
            }else
                headObj.src = src;

            preloadUrl(src); // let's download resource even before activation!

        }else {  // tagName === "link"
            headObj.href = src;
            headObj.rel  = isObj && url.rel  ? url.rel  : "stylesheet";
            headObj.as   = isObj && url.as   ? url.as   : "style";
            headObj.type = isObj && url.type ? url.type : "text/css";
        }

        if (isObj) {
            if (url.integrity) {
                headObj.crossOrigin = url.crossOrigin;
                headObj.integrity = url.integrity;
            }
            if (url.charset)
                headObj.charset = url.charset;

        /* AK 20.12.2019: Internal events should be avoided due to potential security risks..
                        (Atacker may execute malicious code on the page (and completely change it) through these inline event handlers, with bad browser extension.)

                        However since we're getting this code from trusted back-end, it's safe. But anyway, always avoid inline events.
                        Use code inside the external scripts to perform some actions similar to onLoad and you unlikely need onError.
        */
            if (url.onload || url.onerror) {
                if (!onLoadEvents) {
                    onLoadEvents = {};
                }else if ("function" === typeof onLoadEvents) { // it has only 1 onLoad event?
                    onLoadEvents = { onLoad: onLoadEvents }; // AK: this case never tested. Be careful!
                }

                var exec2 = function(e, f1, f2) { // execute both. AK: why not make execute ALL, with any number of multiple arguments?
                        f1(e);
                        f2(e);
                    };

                onLoad = onLoad ? exec2(e, url.onload, onLoadEvents.onLoad) : url.onload;
                onError = onError ? exec2(e, url.onerror, onLoadEvents.onError) : url.onerror;
            }

            objPriority = url.getAttribute("priority"); // don't add it as parameter for new object. We just use it to "prepend" priority objects.

            // destroy original!
            url.parentNode.removeChild(url); // $(url).remove();
        }

        if (onLoad)
            headObj.onload = onLoad;
        if (onError)
            headObj.onerror = onError;

        if (objPriority) { // Priority can be important for CSS. TODO: put in certain order, accordingly to priority value.
            // head.prepend(headObj); // modern browsers
            head.insertBefore(headObj, head.childNodes[0]); // IE
        }else {
            // head.append(headObj); // modern browsers
            head.appendChild(headObj); // IE
        }

        // ===============================================================================================================================================================
        // WARNING!! Normally, in modern browsers (2019), onLoad event tiggered after the script was fully loaded and executed.
        //
        // BUT BEWARE the situation of triggering onLoad before the script will be actually executed...
        //     Such situation possible when loadScript() called twice. First caller function gracefully waiting while the script will be executed to trigger onLoad event,
        //     but the second one, called asynchronously, notice that script are already in DOM (without possibility to check whether it was really executed)
        //     and trigger onLoad immediately, before the script was actually executed.
        //
        // I thought about adding some additional properties that may report about the current loading state (to some other function in another thread),
        // but it's becomes too complicated. And still not necessary in most cases. So Just watch each execution of loadScript()/headExtResource() and avoid their double
        // execution in each unique situation.
        //
        // UPD. Added "returnResourceEvenIfLoaded" parameter, so you can easily easily catch an existing object instance.
        //
        // (BTW, FireFox has an event "onafterscriptexecute", but it's useless, because not supported by any other browsers.)
        // ===============================================================================================================================================================

        return headObj;
    }

    // Dynaicaly load external script ONLY if some "selector" available within "$container". Or just load script without checking anything if $container is "function" (considered as onLoad)
    window.loadScript = function(scriptUrl, // array ["url1", "url2", "url3", ...] is allowed. If array specified, all urls will triggerer onLoad one by one, in the same order how they has been specified.
                                // UPD. array may contain objects: [obj1, obj2, ...]. If it's the set of objects, we replace all their "srcdefer" to "src".
                            $container, // OR onLoad if we don't need to check anything. Script will be loaded only if some "selector" are available inside $container.
                            selector, // #id or .class of something to find() with querySelector().
                            onLoad,  // onLoad always triggered after resource loaded or if it already available in DOM
                            avoidDoubleLoad) { // if TRUE -- do not call onLoad if object already in DOM

        if ("function" === typeof $container) { // it's onLoad, if function. So we skip $container and selector.
            onLoad = $container;
            selector = avoidDoubleLoad;
            $container = false;
        }

        // don't check if resource already available. We need to initialize content in any case
        if (!$container || $($container).find(selector).length) {
            if (Array.isArray(scriptUrl)) {
                // NOTE: this all does not works on IE<10. Need check readyState on IE<10. More info: https://www.html5rocks.com/en/tutorials/speed/script-loading/
                var useDeferedScript = function() {
                    var obj = scriptUrl.shift(),
                        isObj = "object" === typeof obj,

                        // recursive call of next item in queue, both on successful load and on error.
                        continueQueue = function(e, inheritedFunc, act) {
                            if (inheritedFunc) {
                                try {
                                    inheritedFunc(e);
                                }catch(e){}
                            }

                            if (scriptUrl.length) {
                                useDeferedScript(); // recursion!

                            }else { // all done. Let's trigger completion event.
                                ieEvent(document, "uLateLoad");
                                delete document.uLateLoad;

                                if (onLoad) onLoad(); // finalization. Everything loaded.
                            }
                        };

                    if (isObj) {
                        var inheritedLoad = obj.onload,
                            inheritedError = obj.onerror;

                        // 1. First adding script to DOM
                        // document.head.append(script); // modern browsers
                        document.head.appendChild(obj); // IE

                        // 2. AFTER it added to DOM setting onLoad and onError events.
                        obj.onload = function(e) { continueQueue(e, inheritedLoad); }; // add original event handlers
                        obj.onerror = function(e) { continueQueue(e, inheritedError); }; // continue queue in any case, even on error.

                        // 3. AFTER we have set up onLoad event -- specifying the source to download. Full explanition: https://stackoverflow.com/questions/16230886/trying-to-fire-the-onload-event-on-script-tag
                        obj.src = obj.srcdefer;
                    }else
                        obj = headExtResource(obj, "script", continueQueue);
                    };

                useDeferedScript();

            }else {
                var obj = headExtResource(scriptUrl, "script", onLoad, avoidDoubleLoad);

                if (!obj && onLoad) onLoad(); // call onLoad anyway if resource available, but we don't "avoidDoubleLoad"'s.
            }
        }
    }

    // Puts some content into container identitied by "container". (requires jQuery.)
    window.fillHtml = function(container,  // ID (string) with # prefix, OR an object within DOM. If ID is string, it will unwrap the received the content under that ID.
                            $data,         // html content. If data is an object, we consider it as wrapped inside some <DIV>. Content will be unwrapped from <DIV> before appending/putting into HTML.
                            options) {
                      /* Valid options are:
                             append: (boolean) append $data to existing content instead of overwriting it.
                             show: (boolean) unhide container element: $(container).show().
                             head: (string) list external scripts that should be moved to <head> section of page.
                                            If undefined (not specified), DEFAULT value will be used (for <scripts> and <link> resources).
                                            Set to FALSE or "" if you don't want to move anything to <head> section.
                             fallback: (element) element to *append* the data if container not exists in DOM. "body" or any non-string value appends to the "document.body".
                       */

        if ("number" === typeof $data) $data = $data.toString(); // number is string too. Surely not an objects. Don't validate it as isNaN(), we really want to check a data type.
        if (!options) options = {};
        var isString = "string" === typeof $data,
            doCheckExtResources = !isString || (0 < $data.indexOf(">")); // otherwise we consider it as prepared jQuery object. Object resourses contains some tags in any case.

        if (doCheckExtResources) { // has tags?
            $data = $(isString ? "<div>"+$data+"</div>" : $data); // wrap("<div></div>"). AK: we can't do this without wrapping. We have to make sure that adding only 1 SINGLE DOM-element.
                                                                  // + we need to be able to get raw HTML with $($data).html().
            // Since 9.12.2019 we're respecting the order of load & execution.
            var arrDeferQueue = [],
                headObjs = undefined === options.head // set default value if undefined
                              ? 'script[src], link[rel="stylesheet"][href], link[rel="preload"][as="style"][href]'
                              : options.head;

            // We checking rel="preload" links, but in real life they SHOULD NOT served from backend anyway. They should be converted to regular links.
            // If you would like to return it -- use: link[href][rel="preload"][as="style"].
            $data.find(headObjs).each(function() {
                var headObj = headExtResource(this); // move all external scripts to <head> section
                if (headObj && headObj.srcdefer)
                    arrDeferQueue.push(headObj); // add to defer queue. (we do checking if script already loaded, duplicates is unwanted but allowed)
            });

            // AK: uLateLoad is the signal that we can hook uLateLoad event of document.
            document.uLateLoad = 1;

            // convert "$data" back to (string) type
            $data = $data.contents()
                        .unwrap("string" === typeof container ? container : null); // unwrap the content inside the virtual container to put it the DOM container.
        }

        if ($(container).length) {
            if (options.append) {
                $(container).append($data);
            }else {
                $(container).html($data);
            }

            if (options.show)
                $(container).show(); // AK: don't do anything else. If you need more, enable something etc, hook some events.

        }else if (options.fallback) {
            $("string" === typeof options.fallback ? options.fallback : document.body).append($data);
        }

        if (doCheckExtResources && arrDeferQueue.length)
            loadScript(arrDeferQueue); // replace all "srcdefer" to "src" in their strict order and trigger all their onLoad event one-by-one.
    }


    // URL && AJAX
    // Get current parameter from an URL. If URL is not specified -- check out current URL from uAJAX.
    window.getUrlParam = function(param, url, getIntId) { // if url is empty, "window.location.search" is used
        if (url = url ? url.slice(url.indexOf("?") + 1) : location.search.slice(1)) { // We have much more trust to uAJAX.curUrl than to location.href/location.search. We want to have correct current URL in the onAfterNavigate event.
            var vars = url.split("&"),
                i, pair, rslt, tmp;

            for (i in vars) {
                pair = vars[i].split("=");
                if (pair[0] === param) {
                    rslt = pair[1];
                    if (!getIntId) {
                        rslt = decodeURIComponent(rslt.replace(/\+/g, "%20"));

                    }else if (isNaN(pair[1])) { // if we require only numerical value
                        if (isNaN(rslt = parseInt(tmp = rslt)) && // if the beginning of the string is not a numerical...
                            // ...then try to get numerical value after "-".
                            (i = tmp.lastIndexOf("-")) &&
                            (!isNaN(tmp = parseInt(tmp.substr(i+1)))))
                        rslt = tmp;
                    }

                    return rslt;
                }
            }
        }
        return false;
    }

    // AK: originally it was part of uAJAX, but we started using it even in web apps that doesn't require AJAX-based surfing.
    // Function returns new full URL
    // CAUTION. Browser should support History API. It doesn't works on ancient browsers, like IE < 10. Also it seems not supported by Opera Mini: https://caniuse.com/#feat=history
    //
    // ALSO. If you're using uAJAX in your app, use uAJAX's addUrlParam instead of this func. Because uAJAX.addUrlParam() also
    // updating all page links marked with "update-url" class. So it would be perfect for multi-lingual web apps, for switching the language with correctly updated URL parmeters.
    //
    window.setUrlParam = function(key, val, // if val is undefined, it will be removed from URL
                                addToHistory, // if addToHistory is true, URL will be added to history as new record, if false -- will replace existing record.
                                historyTitle) {

        var newParams,
            params = location.search.substr(1).split("&"),
            isAdd = val || 0 === val; // numeric 0 considered as good value. Others (false, null or undefined) means removal.

        if (isAdd)
            val = encodeURIComponent(val);
        key = encodeURIComponent(key);

        if ("" == params) // don't check with "===", it can be boolean FALSE.
            newParams = isAdd ? "?"+key+"="+val : "";
        else {
            var par, cnt = params.length;
            while (cnt--) { // AK --cnt doesn't works here :)
                par = params[cnt].split("=");
                if (par[0] === key) {
                    if (isAdd) {
                        par[1] = val;
                        params[cnt] = par.join("=");
                    }else
                        params.splice(cnt, 1);
                    break;
                }
            }

            if (isAdd && (0 > cnt)) // required key not found?
                params[params.length] = key+"="+val; // add it

            if (newParams = params.join("&")) // reassemble parameters
                newParams = "?" + newParams;
        }

        // Good article about History API https://computerrock.com/blog/html5-changing-the-browser-url-without-refreshing-page/
        newParams = location.origin + location.pathname + newParams + location.hash;
        /*window.*/history[addToHistory ? "pushState" : "replaceState"](null, historyTitle, newParams);

        return newParams;
    }

    window.urlEncodeUri = function(uri) { // see the more advanced backend analogue named make_url_friendly_alias() in strings_translit.php.
                                // It additionally transliterates cyrillic and converts umlauts. But for our purposes, for the front-end it's okay as is.
        return encodeURIComponent(uri.toLowerCase().replace(/[^a-z\d\-\s_]/, "").replace(/[\s_]+/, "_"));
    }

    /* too simple to be canonical:
    window.setUrlHash = function(hash) {
    history.replaceState(null, null, location.origin + location.pathname + location.search + hash);
    }
    */

    window.grabNonce = function() {
        // also try to select "style[nonce]".
        var el = document.querySelector("script[nonce]"); // first. (BTW. Its possible in theory that some external script will contain preset incorrect nonce? MS Edge seems like setting up our local nonce even for external scripts by Google!)
        return el ? el.nonce || el.getAttribute("nonce") : false; // Property el.nonce exists in Chrome/Firefox, getAttribute("nonce") is for Edge.
    }

    // Accepts string and returns JSON-object.
    // Returns FALSE if incoming string don't even looks as JSON format (don't have brackets {} or []). Or returns undefined/null/void 0 on parse error.
    window.parseJSON = function(jsonStr) {
        try {
            // next block can be removed, error can be catched as an exception in case of malformed response too.
            if (("string" === typeof jsonStr) && (jsonStr = jsonStr.trim())) {
                var first = jsonStr.charAt(0),
                    last  = jsonStr.charAt(jsonStr.length-1);

                return (("{" === first) && ("}" === last)) ||
                    (("[" === first) && ("]" === last)) // looks like JSON. Don't check for "[{...}]", it can be ugly 1-dimensional array, values without keys.
                        ? JSON.parse(jsonStr) // try to parse it
                        : false; // false if incoming string is obviously non-JSON
            }
        }catch(err) {} // this will return undefined/null if any parse error occur.
    }

    // standard reusable HTTP error message. Can be reused in other places, eg in uAJAX Navigator.
    window.commonHTTPError = function(httpStatusCode, url, responseData, errorTitle, errorMsg) {
        var boxOptions = errorTitle ? { title: errorTitle } : {};

        if (0 === httpStatusCode) { // Host unreachable
            // retrieving the hostname
            var temp = document.createElement("a"); // create it without adding to DOM
            temp.href = url;

            if (!errorMsg)
            errorMsg = printf("<b>"+commonLang["ajaxHostUnreach"]+'</b>\n\n<div class="mt-3">' + commonLang["ajaxHostUnreachText"]+"</div>", url, temp.hostname); // add destination host name. And I hope that object "data" is destroyed upon the end this function. I hope but not sure that it's really destroys. Need memory profiling.

            $.extend(boxOptions, {
                icon: "🦖", // T-rex dinosaur emoji
                effect: "flipy",
            });

        }else {
            console.error("HTTP error #"+httpStatusCode+", Response: "+responseData); // we don't display responseData. Let's put it only in console.

            // <br /> and <small> sucks, but we avoiding to use any CSS here. Let's use only "text-muted" (same as "text-secondary" for non-anchors) from Bootstrap.
            if (!errorMsg) {
            errorMsg = commonLang["ajaxBadResponse"] + ":<br />\n<b>" + commonLang["httpError"] + " " + httpStatusCode + "</b><br />\n" +

                // AK I don't want to make variable to control the length of output. This is default situation for debug purposes only. If you need something custom -- write your own event handler.
                (("string" === typeof responseData) &&
                        // we don't want to display HTML. Only non-HTML responses will be displayed.
                        // UPD 6.02.2020: short responses less than 500 chars are OK.
                            (500 > responseData.length || ("<" !== responseData.charAt(0))) ? responseData.trimEllip(500, 1/*trim to word*/) : "") +

                        "<br />\n<small class=\"text-muted\">("+url+")</small>";
            }

            $.extend(boxOptions, {
                icon: commonSvgIcons["navError"], // bug under magnifying glass
                effect: "flipx",
            });
        }

        umbox(errorMsg, boxOptions);
    }


    // RECAPTCHA
    // RESET recaptcha, to be able to re-submit the form. In case of ANY error, or just repeated submission.
    window.resetRecaptcha3 = function($form) {
        $($form).field("g-recaptcha-response").remove(); // alternatively '#form_id  > input[name="g-recaptcha-response"]', but who knows, maybe the form is already an object?
        // for recaptcha2 just use "grecaptcha.reset()".
    }

    // Adds the recaptcha field into the form + triggers some action if recaptcha is ready.
    window.requestRecaptcha3 = function($form, recaptchaClientKey, onReady,
                                        disableSubmitOnRequest) { // re-enable "submit" buttons with call of disableSubmit($form, false)
        $form = $($form); // for sure

        var callOnReady = function(recaptchaToken) {
                if (!$form.prop("method", "post").attr("action")) // we don't specifying the method in HTML templates to confuse bots. But we always using POST.
                    $form.attr("action", $form.data("to")); // We may specify target script in data-to="..." attribute, to confuse bots. UPD 19.08.2021. For some reason I can't specify "action" as property :( it works only as attribute. :-/

                if (recaptchaToken)
                    $form.prepend('<input type="hidden" name="g-recaptcha-response" value="' + recaptchaToken + '">');

                if (onReady) onReady();
            },

            isRecaptchaReady = function() {
                var isReady = $form.field("g-recaptcha-response").length; // alternatively '#form_id  > input[name="g-recaptcha-response"]', but who knows, maybe the form is already an object?
                if (isReady && onReady) // token already present
                    onReady();
                return isReady;
            },

            applyRecaptcha = function() {
                grecaptcha.ready(function() {
                    grecaptcha.execute(recaptchaClientKey, {action: "homepage"}).then(function(token) {
                        if (!isRecaptchaReady()) // maybe it's has been added by some other thread? It's not an error if recaptcha token already added. Just do nothing.
                            callOnReady(token);
                    });
                });
            };

        // Warning! Recaptcha API not available locally. Skip it if isLocal is TRUE.
        if (!recaptchaClientKey || (window.isLocal && isLocal)) { // empty recaptchaClientKey = no recaptcha.
            callOnReady();

        }else if (!isRecaptchaReady()) {
            if (disableSubmitOnRequest)
                disableSubmit($form);

            if (!window.grecaptcha) {
                loadScript("https://www.google.com/recaptcha/api.js?render=" + recaptchaClientKey, applyRecaptcha);
            }else {
                applyRecaptcha();
            }
        }
    }


    // This function also pass current interface language as "&lang=" parameter, if it finds
    // AK: do not improve it to support onError and onAlways events. Use jQuery instead if you really need this.
    // jQuery is more realiable. Use this for projects that don't use jQuery, OR you want quick "standartized" error processing with commonHTTPErrors(), which also used by uAJAX.
    //
    // AK 13.12.2019: Afer I read that synchronous requests officially deprectated (because can cause jank on the main thread and be detrimental to user experience), synchronous requests was removed forever.
    // ----------
    // IMPORTANT: onResponse does not occurs in case of HTTP error! Only alert message will be displayed. Use another tools to process error responses!
    window.getURL = function(url, onResponse, showHourglass, useCache, noLang, headers, postData /* if specified, this is POST request, not GET */) {

        var ireq = new XMLHttpRequest(),

            processStateChange = function() {
                if (4 === ireq.readyState) {
                    if (showHourglass) hourglass.show(0);

                    if (200 === ireq.status) {
                        // if (typeof onResponse === "function") // actually we don't care. This is must be a function. Don't waste time to check..
                        onResponse(ireq);
                    }else {
                        commonHTTPError(ireq.status, url, ireq.responseText, ireq.statusText);
                    }
                }
            },

            setReqHeader = function(name, val) {
                if (!headers[name]) // only if not set
                    headers[name] = val;
            };

        if (ireq) {
            try {
                if (showHourglass) {
                    if (window.hourglass) hourglass.show(1)
                    else showHourglass = 0;
                }
                if (onResponse)
                    ireq.onreadystatechange = processStateChange; // We can use onload, but this is for guaranteed to support ancient browsers.

                if (!postData) postData = ""; // not NULL and not FALSE. We will append string.
                var i, isPOST = !!postData,
                    langToken = "&lang=",
                    phpSessionIdToken = "_psid=",
                    nonceToken = "_nonce=";

                if (!noLang && window.lang && (0 > url.indexOf(langToken))) // add both to POST and GET requests
                    postData+= langToken + lang;

                if (window.psid && (0 > url.indexOf(phpSessionIdToken)))
                    postData+= "&" + phpSessionIdToken + psid;
                if (i = grabNonce())
                    postData+= "&" + nonceToken + i;

                if (!useCache) // POST requests are never cached anyway
                    postData+= "&_=" + Math.random(); // +Date.now() for some more entropy

                if (!isPOST && postData) {
                    url+= url.indexOf("?") < 0 ? "?"+postData.substr(1) : postData;
                    postData = null;
                }

                if (!headers) headers = []; // initialize variable if not present
                setReqHeader("X-Requested-With", "XMLHttpRequest"); // this probably does not work for Cross-domain request. But we should never use cross-domain AJAX=reqiests anyway. Use jQuery for reliable cross-domain communication.
                if (isPOST)
                    setReqHeader("Content-Type", "application/x-www-form-urlencoded"); // TODO: add JSON requests!

                // debug
                ireq.open(isPOST ? "POST" : "GET", url, 1);
                for (i in headers)
                    ireq.setRequestHeader(i, headers[i]);
                ireq.send(postData);
            }catch (e) { // Communication error. Malformed request (not even response)?
                if (showHourglass) hourglass.show(0);
                umbox(commonLang["ajaxException"] + ":<br />" + e, {icon: commonSvgIcons["navError"], title: commonLang["navError"], effect: "flipx"});
            }
        }
    }

    // IMPORTANT: onResponse does not occurs in case of HTTP error! Only alert message will be displayed. Use another tools to process error responses!
    window.postURL = function(url, postData, onResponse, showHourglass, headers, noLang) {
        return getURL(url, onResponse, showHourglass, 1/*use (ignore) cache. POST can't be cached anyway*/, noLang, headers, postData);
    }

    // WARNING! IE don't support Promises. Use polyfill: https://cdn.polyfill.io/v2/polyfill.min.js?features=Promise
    window.timedPromise = function(checkFn, firstAttemptInterval, timeoutMs, attemptsCnt) { // if firstAttempInterval is negative (<0), we doing attempt in the same thread immediately
        if (!timeoutMs) timeoutMs = 250;
        if (!attemptsCnt) attemptsCnt = 15;

        return new Promise(function(resolve, reject) {
            var checkCounter = 0,

                attempt = function() {
                    var res = checkFn();
                    if (res) {
                        resolve(res);
                        return true;
                    }
                };

            // if immediateAttempt is TRUE, we trying to resolve the result in the same thread. Otherwise -- by timer. Although the first attempt occurs in 0ms.
            if (0 <= firstAttemptInterval || !attempt()) {
                setTimeout(function() {
                    if (!attempt()) {
                        attemptsCnt-= 2; // 1st passed + another to compare with >, instead of >=
                        var timerId = setInterval(function() {
                                if (attempt()) {
                                    clearInterval(timerId);

                                }else if (++checkCounter > attemptsCnt) {
                                    clearInterval(timerId);
                                    reject(new Error("Not initialized in " + checkCounter + " attempts."));
                                }
                            }, timeoutMs);
                    }
                }, firstAttemptInterval); // okay if firstAttemptInterval is undefined or 0.
            }
        });
    }

    // extend jQuery, if present. But the most common functions should work even without jQuery. jQuery is NOT strictly required, just optional. We can wait for it.
    var extendJQuery = function($) {
            // do some actions which possible to do only with jQuery
            $(window).one("touchstart", function() {
                isTouchDevice = 1; // 1, not TRUE. When it 1 we know for sure that touch event occured once.
                initDeviceTypeClass(); // here "device-type" class will be initialized everywhere. But you should call initDeviceTypeClass() for AJAX-loaded content, eg in uAJAX's setContent event.

                if ("function" === typeof $().modal) // if bootstrap enabled. ".modal" shorter than ".tooltip". Don't modify $(). We rally must check it as function.
                    $(".tooltip-no-tap").tooltip("disable");

            }).one("mousemove", function() {
                if (1 !== isTouchDevice) { // mobiles are more important, so if we already detected "touchstart" event -- ignore mousemove.
                    isTouchDevice = 0; // 0, not FALSE. When 0 we know for sure that device has mouse plugged in.
                    initDeviceTypeClass();
                }
            });

            // extend jQuery...
            $.fn.extend({

                getHTML: function(url, onSuccess, noHourglass, useCache, noLang) {
                    var $containers = this;

                    getURL(url, function(o) {
                        if (o.responseText) // only if we have some result. No result = error. We always want to display something. Otherwise no need to make it visible.
                            $containers.each(function() {
                                if (!$(this).html(o.responseText).is(":visible"))
                                    $(this).show();
                                if (onSuccess)
                                    onSuccess(this);
                            });
                    }, !noHourglass, useCache, noLang);

                    return false; // It's violation of jQuery canons, but this allows usage as <a onClick="return $(container).getHTML(url)">
                },

                once: function(token) {
                    if (!token) token = "_umOnce";
                    return this.filter(function() {
                        return !$(this).data(token); // if doesn't have data(token)
                    }).data(token, true); // apply data(token)
                },

                // input element by name
                field: function(name) {
                    return this.find('input[name="'+name+'"], select[name="'+name+'"], textarea[name="'+name+'"]');
                },

                clearValidation: function() {
                    return this.removeClass(classIsValidEntry + " " + classIsInvalidEntry); // remove all variations for both valid and invalid
                },

                // external validation for <input> field. Used to check is username/alias/email taken, whether the entry is correct.
                extValidateInput: function(options) {
                    /* Valid options are:
                            except: exceptId
                            original: originalValue -- no valid nor invalid decoration when original is set.
                            url: validateUrl
                            onPrevalidate: function(fieldValue). Result must be either 1 (valid) or 0 (invalid).
                            onResult: function(result). Result must be either 1 (valid), 0 (invalid) or empty (undefined). Function may return custom result.

                        We can hook 1 field only once. But we can check different usernames, different exceptions.
                        So let's save exceptId somewhere.
                    */
                    if (!options) options = {};
                    var $field = this,
                        $form = $field.closest("form"),

                        _dataToken = "_xtid",
                        r = $field.data(_dataToken, options) // set up fresh options
                                .once(_dataToken + "_init") // it must be different of _dataToken, otherwise we'll get empty value if options.except is not set.
                                .on("input change paste", function() { // AK: don't hook "change", to avoid an extra check out when we set up this value programmatically. When we setup it from inside, we suppose that it's valid already.
                                                                       // UPD. We actually need to check on "change" too. "change" triggered on auto-completion (particularly on email autocompletion).
                                                                       // We must check the input when we did not typed anything, but just auto-completed it instead.
                            var fieldVal = $field.val().trim(),
                                fieldName = $field.prop("name"),
                                options = $field.data(_dataToken),
                                isReady = $form.data("ready"); // this is support of bsDialogs. $form.data("ready") is TRUE when all values received and set up.

                            if (isReady || undefined === isReady) { // undefined === it's not dsDialog, but it's okay too. Form is ready then.

                                if ((!options.onPrevalidate || options.onPrevalidate(fieldVal)) && fieldVal && // call onPreValidate() before checking whether fieldVal is not empty!! Always call onPrevalidate!!
                                    (!options.original || options.original !== fieldVal)) {

                                    if (!fieldName)
                                        fieldName = $field.data("name"); // alternative to standard "name" attribute

                                    getURL((options.url || "/out/check-input.php") +
                                            "?field=" + fieldName + "&input=" + encodeURIComponent(fieldVal) +
                                            (options.except ? "&except="+options.except : ""), function(o) { // no hourglass. Get the status silently on background.

                                        var r = o.responseText.gap("\n"); // AK: lame. We may need JSON instead.

                                        if (r[0] === fieldVal) {
                                            r = r[1];

                                            if (options.onResult) {
                                                var temp = options.onResult(r);
                                                if (undefined !== temp)
                                                    r = temp;
                                            }

                                            r = r.charAt(0);
                                            if (isNaN(r)) { // any non-integer considered as wrong valid, like undefined
                                                $field.clearValidation();
                                            }else {
                                                var isValid = 0 < r;

                                                $field.addClass(isValid ? classIsValidEntry : classIsInvalidEntry) // this is standard Bootstrap's classes, but you can override them to use own styles.
                                                    .removeClass(isValid ? classIsInvalidEntry : classIsValidEntry);

                                                if (options.onValidate)
                                                    options.onValidate(isValid);
                                            }
                                        }else
                                            $field.clearValidation();
                                    });
                                }else
                                    $field.clearValidation();
                            }
                        });

                    if (options.validateNow && $field.val())
                        $field.trigger("change");

                    return r;
                },

                aniRemove: function() {
                    var $this = this,
                        animatedRemove = function() {
                            // alternative to slideUp() is fadeOut().
                            $this.slideUp(100, function() { $this.remove(); });
                        };

                    if (canAnimate()) {
                        animateCSS($this, ["hinge", "rollOut", "fadeOut", "flipOutX"], function() {
                            /* Steps:
                                1. Make it invisible (preserving the bounds);
                                2. SlideUp other content;
                                3. Remove from DOM.
                            */
                            $this.css("visibility", "hidden");
                            animatedRemove();
                        });
                    }else
                        animatedRemove(); // remove with very quick slideUp effect.

                    return $this;
                },

                scrollPg: function(offsetTop, targetEl, duration, onComplete) {
                    scrollPg(this.offset().top + (offsetTop || 0), targetEl, duration, onComplete); // offsetTop can be undefined, so normalization required. Alternative is fl0at(offsetTop)
                    return this;
                },

                // todo: add more extensions!
            });
        };


    // AK: alternative here is doInit(). But for some reason I decided to avoid it here.
    if (undefined !== $) {
        extendJQuery($);
    }else {
        document.addEventListener("DOMContentLoaded", function() { // defer
            if (window.jQuery) { // already available?
                extendJQuery($ = jQuery); // assign fresh jQuery to $, since we use $ as pointer to jQuery in this wrapper
            }else { // last attempt
                window.addEventListener("load", function() {
                    if (window.jQuery)
                        extendJQuery($ = jQuery);
                });
            }
        });
    }



    // === OTHERS ===


    // === ACTIONS ===

    // update stylesheets in <head> section for browsers that don't support onload event for <link>'s.
    updatePreloadCss();


    /* Timezone management... Of course it's so much better to fix the timezones on the front-end,
    correcting the values inside <time></time> tags. But in some projects we need to pass
    the timezone to backend, to store it in DB, etc.

    UPD. I decided to not overload commons. This is just an example how it works.
    Just copy the next line to your site-specific JS-module:

        setCookie("tz", -(new Date().getTimezoneOffset()/60)); // auto-detected user timezone
    */
})(window.jQuery, // don't remove window.! It could be undefined here, then defined later!
   document, window);