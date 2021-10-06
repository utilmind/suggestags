/**
 * umSuggestags
 *     Based on amsifySuggestags, forked from https://github.com/amsify42/jquery.amsify.suggestags
 *     http://www.amsify42.com
 *
 * Improved in 06.2020 by https://github.com/utilmind
 * ...more improvements and first release as separate umSuggestags on 10.2021
 *
 * Compatibility notes:
 *    - trim() is part of JavaScript v1.8.1: https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/String/Trim
 *      But you can use $.trim(...) instead.
 */
"use strict"; // can be commented out in production release

(function(factory) {
        if ("object" === typeof module && "object" === typeof module.exports) {
                factory(require("jquery"), window, document);
        }else {
                factory(jQuery, window, document); // AK: regular way
        }
}
(function($, window, document, undefined) {

        var umSuggestags = function(selector) {
                var _self = this;
                _self.selector = selector;
                _self.settings = {
                        iconRemove        : "&times;", // See also <i class="fa fa-times"></span> OR <i class="material-icons right">clear</i>.
                        tooltipRemove     : "Remove",
                        tagLimit          : -1,
                        // editableOnReachLimit : true,
                        suggestions       : [],
                        suggestionsAction : {timeout: -1, minChars: 2, minChange: -1, type: "GET"},
                        minSuggestionWidth: "200px",
                        defaultTagClass   : "",
                        classes           : [],
                        backgrounds       : [],
                        colors            : [],
                        whiteList         : false,
                        prepareTag        : {}, // Prepare to add callback, triggered before adding typed text. Should return modified string for tag.
                        afterAdd          : {},
                        afterRemove       : {},
                        addTagOnBlur      : true,
                        clearOnEsc        : true, // clear input when Escape pressed
                        selectOnHover     : false, // it's absolutely useless option, which makes me mad if I leave my cursor pointer little bit under the input box and trying to type something.
                        selectSimilar     : false,
                        triggerChange     : false,
                        noSuggestionMsg   : "",
                        highlightSuggestion:true,
                        showAllSuggestions: false,
                        keepLastOnHoverTag: true,
                        checkSimilar      : true,
                        delimiters        : [",", ";"], // first delimiter used to split the incoming value. At least 1 delimiter must be used.
                };
                _self.classes       = {
                        sTagsArea     : ".umsg-suggestags-area",
                        inputArea     : ".umsg-suggestags-input-area",
                        focus         : ".umsg-focus",
                        sTagsInput    : ".umsg-suggestags-input",
                        listArea      : ".umsg-suggestags-list",
                        list          : ".umsg-list",
                        listItem      : ".umsg-list-item",
                        itemPad       : ".umsg-item-pad",
                        inputType     : ".umsg-select-input",
                        tagItem       : ".umsg-select-tag",
                        colBg         : ".umsg-col-bg",
                        removeTag     : ".umsg-remove-tag",
                        noSuggestion  : ".umsg-no-suggestion",

                        // temporary marks, w/o first dot
                        waitToRemove  : "wt-rmv",
                        readyToRemove : "to-rmv",
                };
                _self.selectors     = {
                        sTagsArea     : null,
                        inputArea     : null,
                        sTagsInput    : null,
                        listArea      : null,
                        list          : null,
                        listGroup     : null,
                        listItem      : null,
                        itemPad       : null,
                        inputType     : null,
                };
                _self.isRequired = false;
                _self.ajaxActive = false;
                _self.tagNames   = [];
        };

        umSuggestags.prototype = {

                init : function(settings, method) {
                    var _self = this,
                        $selfSelector = $(_self.selector), // original input control
                        items = $selfSelector.val().split(","); // keep it before "refresh".

                    // mergin default settings with custom
                    if (settings)
                        _self.settings = $.extend(true, {}, _self.settings, settings);

                    if (!method) { // create
                        _self.createHTML()
                            .setEvents();

                        var $tagsInput = $(_self.selectors.sTagsInput);
                        if ($selfSelector.is(":focus"))
                            $tagsInput.trigger("focus");

                        // hide original input control
                        $selfSelector.hide()
                            // ...and redorect any possible focus events
                            .on("focus", function(e) {
                                $tagsInput.trigger("focus", e);
                            });

                    }else if (method) {
                        if ("destroy" === method) {
                            // remove EVERYTHING. All controls
                            var $findTags = $selfSelector.next(_self.classes.sTagsArea);
                            if ($findTags.length)
                            $findTags.remove();

                            // restore original <input>. TODO: do we need to return focus if input is focused?
                            $selfSelector.show();
                            return;

                        }else if ("refresh" === method)
                            _self.removeTag(false);
                    }


                    // convert current <input> value into tags.
                    if (items.length) {
                        $.each(items, function(index, item) {
                            _self.addTag(item.trim());
                        });
                    }
                },

                createHTML : function() {
                    var i, _self = this,
                        selectors = _self.selectors,
                        selfSelector = _self.selector,
                        $selfSelector = $(selfSelector),
                        selfSelectorId = $selfSelector.attr("id");

                        selectors.sTagsArea = $('<div class="' + _self.classes.sTagsArea.substr(1) + '"></div>')
                                                         .insertAfter(selfSelector);
                        selectors.inputArea = $('<div class="' + _self.classes.inputArea.substr(1) + '"></div>')
                                                         .appendTo(selectors.sTagsArea);

                        selectors.sTagsInput = $('<div contenteditable="plaintext-only" class="' + _self.classes.sTagsInput.substr(1) +
                                                         // ((i = $selfSelector.attr("class")) ? " " + i : "") +
                                                         '"' +
                                                         // ((i = $selfSelector.attr("style")) ? ' style="'+i+'"' : "") +
                                                         ((i = $selfSelector.attr("placeholder")) ? ' placeholder="'+i+'"' : "") +
                                                         ((i = $selfSelector.attr("spellcheck")) ? ' spellcheck="'+i+'"' : "") +
                                                       '></div>')
                                                           .appendTo(selectors.inputArea); // also here was .attr("autocomplete", "off"), but this is unnamed <div>, not <input> anymore.

                    if ($selfSelector.attr("required")) {
                            $selfSelector.removeAttr("required");
                            _self.isRequired = true;
                            _self.updateIsRequired();
                    }

                    selectors.listArea  = $('<div class="'+_self.classes.listArea.substr(1)+'"></div>')
                                                        .appendTo(selectors.sTagsArea)
                                                        .css("min-width", _self.settings.minSuggestionWidth); // TODO: research, whether jQuery's css() are safe for Content-Security-Policy. If no -- set up style directly as described on https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src

                    selectors.list      = $('<ul class="'+_self.classes.list.substr(1)+'"></ul>')
                                                        .appendTo(selectors.listArea);

                    _self.updateSuggestionList();


                    // AK 13.06.2020: redirect focus from hidden control to our new editable div.
                    // (Unfortunately we can't focus setting up new ID and overriding FOR. It won't focus contenteditable <div>, only <input>'s. Explanation at https://stackoverflow.com/questions/54792126/html-label-with-for-div-id-to-focus-a-contenteditable-div-does-label-label
                    // So hooking an event.)
                    if (selfSelectorId) {
                        $('label[for="' + selfSelectorId + '"]').on("click", function() {
                            // it won't focus immediately after click, so let's focus when this thread is about to finish
                            setTimeout(function() {
                                $(selectors.sTagsInput).focus(); // set input focus
                            }, 0);
                        });
                    }

                    return _self;
                },

                updateIsRequired : function() {
                    var attrRequired = "required",
                        _self = this,
                        $input = $(_self.selectors.sTagsInput);

                    if (_self.isRequired) {
                        if (_self.tagNames.length)
                            $input.removeAttr(attrRequired);
                        else
                            $input.attr(attrRequired, attrRequired);
                    }
                },

                updateSuggestionList : function() {
                    var _self = this;

                    $(_self.selectors.list).html("");
                    $(_self.createList()).appendTo(this.selectors.list);

                    return _self;
                },

                setEvents : function() {
                    var _self = this,

                        $selfSelector = $(_self.selector),
                        $inputArea = $(_self.selectors.inputArea),

                        controlStyles = $selfSelector.attr("style");

                    // Always avoid using inline styles!
                    if (controlStyles)
                        $inputArea.attr("style", controlStyles);

                    $inputArea.addClass($selfSelector.attr("class"));

                    _self.setTagEvents()
                            .setSuggestionsEvents()
                            .setRemoveEvent();
                },

                setTagEvents : function() {
                    var _self = this,
                        settings = _self.settings,
                        selectors = _self.selectors,
                        classes = _self.classes,
                        $suggestList = $(selectors.listArea),
                        $input = $(selectors.sTagsInput),

                        appendTag = function(_instance, $input, hasDelimiter) {
                            var value = $input.text().trim();
                            if (hasDelimiter) {
                                // remove all characters used as delimiters from the appended value
                                $.each(_instance.settings.delimiters, function(dkey, delimiter) {
                                    value = value.replace(delimiter, "").trim();
                                });
                            }

                            $input.text(""); // AK: originally was used .val() for input field instead of .text().
                            _instance.addTag(_instance.getValue(value));
                            if (_instance.settings.showAllSuggestions) {
                                _instance.suggestWhiteList("", 0, 1);
                            }
                        };

                    $input.on("focus", function() {
                        var $inputParent = $(this).parent();

                        if (settings.showAllSuggestions)
                            _self.suggestWhiteList("", 0, 1);

                        $inputParent.closest(classes.inputArea).addClass(classes.focus.substr(1));
                    })

                    .on("blur", function() {
                        var $input = $(this); // we already have $input above, but this is for sure that we're in correct instance

                        $input.closest(classes.inputArea).removeClass(classes.focus.substr(1));

                        if ($input.text()) { // AK: originally used .val() for input field instead of .text().
                            if (settings.addTagOnBlur)
                                appendTag(_self, $input);
                        }else {
                            $suggestList.hide();
                        }
                    })

                    .on("keydown", function(e) {
                        var $input = $(this),
                            key = e.keyCode;

                        if (8 === key && !$input.text()) {
                            $input.addClass($input.hasClass(classes.waitToRemove) ? classes.readyToRemove : classes.waitToRemove);

                        }else if (_self.isLimitReached() && // when limit reached we shouldn't allow to type anything, although control is focusable.
                                ((32 === key) ||
                                ((48 < key) && // 48 is "0". All other keys before 0 is control keys (like backspace, enter, tab, escape etc), so the are OK.
                                    !((112 <= key) && (123 >= key))))) { // ! F1..F12
                            e.preventDefault();
                        }else
                            $input.removeClass(classes.waitToRemove).removeClass(classes.readyToRemove)
                    })

                    .on("keyup", function(e) {
                        var $input = $(this), // we already have $input above, but this is for sure that we're in correct instance
                            inputText = $input.text(),
                            keyName = e.key,
                            key = e.keyCode;

                        if (keyName) {
                            // AK 14.06.2020: I don't trust to e.key anymore. Sometimes (and totally randomly) it don't recognize non-latin keyboard layout and shows ".", when user typed ",".
                            // UPD. It trigging keyup twice on cyrrillic layout. 1st key is Shift, 2nd is ".". But shift+"." is "," on cyrillic layout!
                            // UPD. It's so easy to reproduce. Press shift, immediately unhold it and type ".". Again, Shift, then "." lightning quickly, without holding Shift.
                            // So let's check last character to know it for sure.
                            if (("Shift" === keyName) && ("," === inputText.substr(-1)))
                                keyName = ",";

                        }else if (13 === key)
                            keyName = "Enter";
                        else if (27 === key)
                            keyName = "Escape";
                        else if (188 === key)
                            keyName = ",";

                        if ("Escape" === keyName) {
                            $suggestList.hide(); // hide the list of suggestions
                            if (settings.clearOnEsc) $input.text("");
                            return;
                        }

                        var isDelimiter = -1 !== $.inArray(keyName, settings.delimiters),
                            isEnter = keyName === "Enter";

                        if (isDelimiter || isEnter) {
                            if (isEnter && ("" === inputText)) { // if no text
                                $input.closest("form").submit(); // act like a normal <input> box. Submit on enter.

                            }else {
                                appendTag(_self, $input, isDelimiter);
                            }

                        }else { // character OR backspace

                            if (8 === key && !inputText) { // AK: originally used .val() for input field instead of .text().

                                if (_self.isLimitReached() || $input.hasClass(classes.readyToRemove)) {
                                    _self.removeTagByItem($input.closest(classes.inputArea).find(classes.tagItem + ":last"), false);
                                }

                                $suggestList.hide();
                                if (settings.showAllSuggestions) {
                                    _self.suggestWhiteList("", 0, 1);
                                }
                            }else if ((settings.suggestions.length || _self.isSuggestAction()) && (inputText || settings.showAllSuggestions)) { // AK: originally used .val() for input field instead of .text().
                                _self.processWhiteList(key, $input.text()); // AK: originally used .val() for input field instead of .text().
                            }
                        }
                    })

                    .on("keypress", function(e) {
                        if (13 === e.keyCode) return false; // prevent premature submission
                    });

                    $(selectors.sTagsArea).on("click", function() {
                        if (!$input.is(":focus"))
                            $input.trigger("focus");
                    });

                    return _self;
                },

                setSuggestionsEvents : function() {
                        var _self = this,
                            settings = _self.settings,
                            selectors = _self.selectors,
                            classes = _self.classes;

                        // AK: Of course we always hightlight the item under mouse, but don't always want to replace input text with items content.
                        //if (settings.selectOnHover) {
                                $(selectors.listArea).find(classes.listItem).hover(function() { // hover in
                                        $(selectors.listArea).find(classes.listItem).removeClass("active");
                                        $(this).addClass("active");
                                        if (settings.selectOnHover) {
                                                _self.setInputText($(this).text());
                                        }
                                }, function() { // hover out
                                        $(this).removeClass("active");
                                        if (settings.selectOnHover && !settings.keepLastOnHoverTag) {
                                                $(selectors.sTagsInput).text(""); // AK: originally used .val() for input field instead of .text().
                                        }
                                });
                        //}

                        $(selectors.listArea).find(classes.listItem).mousedown(function(e) {
                                e.preventDefault(); // block stealing focus from input (and triggering blur event for input) before we process click event here.

                        }).on("click", function() {
                                _self.addTag($(this).data("val"));
                                $(selectors.sTagsInput).text("").focus(); // AK: originally used .val() for input field instead of .text().
                        });

                        return _self;
                },

                isLimitReached: function() {
                    var _self = this,
                        tagLimit = _self.settings.tagLimit;
                    return (0 < tagLimit) && (_self.tagNames.length >= tagLimit);
                },

                isSuggestAction : function() {
                    return this.settings.suggestionsAction && this.settings.suggestionsAction.url;
                },

                getTag : function(value) {
                    if (this.settings.suggestions.length) {
                        var tag = value;

                        $.each(this.settings.suggestions, function(key, item) {
                                if (("object" === typeof item) && (item.value === value)) {
                                        tag = item.tag;
                                        return false; // break each()

                                }else if (item === value) {
                                        return false; // break each()
                                }
                        });

                        value = tag;
                    }
                    return value;
                },

                getValue : function(tag) {
                    if (this.settings.suggestions.length) {
                        var value = tag,
                            lower = tag.toLowerCase();

                        $.each(this.settings.suggestions, function(key, item) {
                                if (("object" === typeof item) && lower === item.tag.toLowerCase()) {
                                        value = item.value;
                                        return false; // break each()

                                }else if (lower === item.toLowerCase()) {
                                        return false; // break each()
                                }
                        });
                        return value;
                    }
                    return tag;
                },

                processAjaxSuggestion : function(value, keycode) {
                        var _self = this,
                            settings = _self.settings,

                            getActionURL = function(urlString) {
                                var URL = "",

                                    isAbsoluteURL = function(urlString) {
                                        return !!(new RegExp("^(?:[a-z]+:)?//", "i")).test(urlString);
                                    };

                                if (window !== undefined)
                                    URL = window.location.protocol + "//" + window.location.host;

                                if (isAbsoluteURL(urlString))
                                    URL = urlString;
                                else
                                    URL += "/" + urlString.replace(/^\/|\/$/g, "");

                                return URL;
                            },

                            params  = {
                                    existingTags: _self.tagNames,
                                    existing: settings.suggestions,
                                    term: value,
                                },

                            ajaxFormParams  = {
                                url : getActionURL(settings.suggestionsAction.url),
                            },

                            unique = function(list) {
                                var result = [],

                                    objectInArray = function(element, result) {
                                        var present = 0;

                                        if (result.length) {
                                            $.each(result, function(i, e) {
                                                if ("object" === typeof e) {
                                                    if (e.value === element.value)
                                                        present = 1;
                                                }else {
                                                    if (e === element.value)
                                                        present = 1;
                                                }
                                                if (present) return false; // break each()
                                            });
                                        }

                                        return present;
                                    };

                                $.each(list, function(i, e) {
                                    if ("object" === typeof e) {
                                        if (!_self.objectInArray(e, result)) {
                                            result.push(e);
                                        }
                                    }else {
                                        if (-1 === $.inArray(e, result)) {
                                            result.push(e);
                                        }
                                    }
                                });

                                return result;
                            };

                        if ("GET" === settings.suggestionsAction.type) {
                                ajaxFormParams.url = ajaxFormParams.url + "?" + $.param(params);
                        }else {
                                ajaxFormParams.type = settings.suggestionsAction.type;
                                ajaxFormParams.data = params;
                        }

                        if (-1 !== settings.suggestionsAction.timeout) {
                                ajaxFormParams["timeout"] = settings.suggestionsAction.timeout * 1000;
                        }

                        if ("function" === typeof settings.suggestionsAction.beforeSend) {
                                ajaxFormParams["beforeSend"] = settings.suggestionsAction.beforeSend;
                        }

                        ajaxFormParams["success"] = function(data) {
                                if (data && data.suggestions) {
                                        settings.suggestions = $.merge(settings.suggestions, data.suggestions);
                                        settings.suggestions = _self.unique(settings.suggestions);
                                        _self.updateSuggestionList()
                                             .setSuggestionsEvents()
                                             .suggestWhiteList(value, keycode);
                                }

                                if ("function" === typeof settings.suggestionsAction.success) {
                                        settings.suggestionsAction.success(data);
                                }
                        };

                        if ("function" === typeof settings.suggestionsAction.error) {
                                ajaxFormParams["error"] = settings.suggestionsAction.error;
                        }

                        ajaxFormParams["complete"] = function(data) {
                                if ("function" === typeof settings.suggestionsAction.complete) {
                                        settings.suggestionsAction.complete(data);
                                }

                                _self.ajaxActive = false;
                        };

                        $.ajax(ajaxFormParams);
                },

                processWhiteList : function(keycode, value) {
                        var _self = this;

                        if (40 === keycode || 38 === keycode) {
                                var type = (40 === keycode) ? "down" : "up";
                                _self.upDownSuggestion(value, type);
                        }else {
                                if (_self.isSuggestAction() && !_self.ajaxActive) {
                                        var minChars   = _self.settings.suggestionsAction.minChars,
                                            minChange  = _self.settings.suggestionsAction.minChange,
                                            lastSearch = _self.selectors.sTagsInput.data("last-search");

                                        if ((value.length >= minChars) && (-1 === minChange || !lastSearch || _self.similarity(lastSearch, value) * 100 <= minChange)) {
                                                _self.selectors.sTagsInput.data("last-search", value);
                                                _self.ajaxActive = true;
                                                _self.processAjaxSuggestion(value, keycode);
                                        }
                                }else {
                                        _self.suggestWhiteList(value, keycode);
                                }
                        }
                },

                upDownSuggestion : function(value, type) {
                        var _self     = this,
                            isActive  = 0,
                            classes   = _self.classes;

                        $(_self.selectors.listArea).find(classes.listItem + ":visible").each(function() {
                                var $item = $(this);
                                if ($item.hasClass("active")) {
                                        $item.removeClass("active");

                                        // replace $item
                                        $item = ("up" === type) ?
                                                        $item.prevAll(classes.listItem + ":visible:first") :
                                                        $item.nextAll(classes.listItem + ":visible:first");

                                        if ($item.length) {
                                                isActive = 1;
                                                $item.addClass("active");
                                                _self.setInputText($item.text());
                                        }
                                        return false;
                                }
                        });

                        if (!isActive) {
                                var childItem = ("down" === type) ? "first" : "last",
                                    $item = $(_self.selectors.listArea).find(classes.listItem + ":visible:" + childItem);

                                if ($item.length) {
                                  $item.addClass("active");
                                  _self.setInputText($item.text());
                                }
                        }
                },

                setInputText : function(value) {
                    var $input = $(this.selectors.sTagsInput),

                        // this function moves input cursor to the end of editable <div>. For <input>'s we should use different code, see setSelectionRange().
                        cursorToEnd = function() {
                            var textLen = $input.text().length,
                                input = $input[0],
                                range = document.createRange(),
                                sel = window.getSelection();

                            range.setStart(input.childNodes[0], textLen);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                        };

                    $input.text(value); // AK: originally used .val() for input field instead of .text().
                    cursorToEnd();
                },

                suggestWhiteList : function(value, keycode, showAll) {
                    var _self = this,
                        settings = _self.settings,
                        selectors = _self.selectors,
                        classes = _self.classes,
                        found,
                        lower = value.toLowerCase(),
                        $listArea = $(selectors.listArea),
                        $tagsArea = $(selectors.sTagsArea);

                    $listArea.find(classes.noSuggestion).hide();

                    var $list = $listArea.find(this.classes.list);
                    $list.find(classes.listItem).each(function() {
                        var $item = $(this),
                            dataVal = $item.data("val");

                        if ((!!showAll || ~$item.text().toLowerCase().indexOf(lower)) && (-1 === $.inArray(dataVal, _self.tagNames))) {
                            $item.attr("data-show", 1);
                            found = 1;
                        }else {
                            $item.removeAttr("data-show");
                        }
                        $item.hide();
                    });

                    if (found) {
                        /**
                         * Sorting the suggestions
                         */
                        var $dataShow = $list.find(classes.listItem + "[data-show]");

                        $dataShow.sort(function(a, b) {
                                    a = $(a).text();
                                    b = $(b).text();

                                    var lowerVal = value.toLowerCase(),
                                        vLen = value.length,
                                        startA = (a.substr(0, vLen).toLowerCase() === lowerVal),
                                        startB = (b.substr(0, vLen).toLowerCase() === lowerVal);

                                    if (startA) {
                                        if (!startB)
                                            return -1;
                                    }else if (startB)
                                        return 1;

                                    return a.localeCompare(b);
                            }).appendTo($list);

                        if (settings.highlightSuggestion) {
                            $list.find(classes.listItem).each(function() {
                                 var $el = $(this),

                                     // https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
                                     escapeRegExp = function(str) {
                                         return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
                                     };

                                 $el.html($el.text().replace(new RegExp("("+escapeRegExp(value)+")", "gi"), "<b>$1</b>"));
                            });
                        }

                        $dataShow.each(function() {
                            $(this).show();
                        });

                        /**
                         * If only one item left in whitelist suggestions
                         */
                        var $item = $listArea.find(classes.listItem + ":visible"),

                            isSimilarText = function(_instance, str1, str2, perc) {
                                return _instance.settings.checkSimilar ? !!(_instance.similarity(str1, str2) * 100 >= perc) : false;
                            };

                        if ((1 === $item.length) && (8 !== keycode)) {
                            if (settings.selectSimilar &&
                               ((settings.whiteList && isSimilarText(_self, value.toLowerCase(), $item.text().toLowerCase(), 40)) ||
                               isSimilarText(_self, value.toLowerCase(), $item.text().toLowerCase(), 60))) {
                                    // this will highlight similar text, but not yet choose it.
                                    $item.addClass("active");
                                    // now let's replace typed text with similar. (AK: it's wrong, but this is as it was in original code, even without selectSimilar settings, added my me)
                                    _self.setInputText($item.text());
                            }
                        }else {
                            $item.removeClass("active");
                        }

                        // Calculate optimal position & width for dropdown box with suggestions
                        var $inputArea = $(selectors.inputArea),
                            inputAreaLeft = $inputArea.position().left,
                            leftPos = $(selectors.sTagsInput).position().left;// - inputAreaLeft;

                        $listArea.css({ // TODO: research, whether jQuery's css() are safe for Content-Security-Policy. If no -- set up style directly as described on https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src
                            left: inputAreaLeft + leftPos,
                            width: $inputArea.width() - leftPos + 3,
                        });
                        $listArea.show();

                    }else {
                        if (value && settings.noSuggestionMsg) {
                            $listArea.find(classes.listItem).hide();
                            $listArea.find(classes.noSuggestion).show();
                        }else {
                            $listArea.hide();
                        }
                    }

                    return _self;
                },

                setRemoveEvent: function() {
                    var _self = this,
                        //$input = $(_self.selectors.sTagsInput),
                        $inputArea = $(_self.selectors.inputArea);

                    $inputArea.find(_self.classes.removeTag).on("click", function(e) {
                        e.stopImmediatePropagation();

                        var $tagItem = $(this).closest(_self.classes.tagItem);
                        _self.removeTagByItem($tagItem, false);

                        $(_self.selectors.sTagsInput).trigger("focus"); // set input focus
                    });

                    return _self;
                },

                createList : function() {
                    var _self    = this,
                        settings = _self.settings,
                        listHTML = "";

                    $.each(settings.suggestions, function(index, item) {
                        var value = "",
                            tag   = "";

                        if ("object" === typeof item) {
                            value = item.value;
                            tag   = item.tag;
                        }else {
                            value = item;
                            tag   = item;
                        }

                        listHTML += '<li class="' + _self.classes.listItem.substr(1) + '" data-val="' + value + '">' + tag + '</li>';
                    });

                    if (settings.noSuggestionMsg)
                        listHTML += '<li class="' + _self.classes.noSuggestion.substr(1) + '">' + settings.noSuggestionMsg + '</li>';

                    return listHTML;
                },

                addTag : function(value) {
                    if (value) {
                        var _self = this,
                            settings = _self.settings,
                            $input = $(_self.selectors.sTagsInput),
                            placeholderText = $input.attr("placeholder");

                        if (placeholderText) { // remove placholder message when at least 1 tag available.
                            $input.data("placeholder", placeholderText)
                                .removeAttr("placeholder");
                        }

                        if ("function" === typeof settings.prepareTag)
                            value = settings.prepareTag(value);

                        var $item = $('<span class="' + _self.classes.tagItem.substr(1) + '" data-val="' + value + '">' + _self.getTag(value) + " " +
                                            '<span class="' + _self.classes.removeTag.substr(1) + '"' +
                                                (settings.tooltipRemove ? ' title="'+settings.tooltipRemove+'"' : "") +'>' + settings.iconRemove + "</span>" +
                                            "</span>")
                                        .insertBefore($input);

                        if (settings.defaultTagClass)
                                $item.addClass(settings.defaultTagClass);

                        if ((-1 !== settings.tagLimit) && (0 < settings.tagLimit) && _self.isLimitReached()) {
                            _self.removeItem($item, 1)
                                .flashItem(value);
                            return false;
                        }

                        var itemKey = _self.getItemKey(value);
                        if (settings.whiteList && (-1 === itemKey)) {
                            _self.removeItem($item, 1)
                                .flashItem(value);
                            return false;
                        }

                        if (_self.isPresent(value)) {
                            _self.removeItem($item, 1)
                                .flashItem(value);
                        }else {
                            _self.customStylings($item, itemKey)
                                .tagNames.push(value);
                            _self.setRemoveEvent()
                                .updateInputValue();
                            if (settings.afterAdd && ("function" === typeof settings.afterAdd)) {
                                settings.afterAdd(value);
                            }
                        }
                        $(_self.selector).trigger("suggestags.add", [value]);
                        $(_self.selector).trigger("suggestags.change");
                        if (settings.triggerChange)
                            $(_self.selector).trigger("change");

                        $(_self.selectors.listArea).find(_self.classes.listItem).removeClass("active");
                        $(_self.selectors.listArea).hide();
                        $input.removeClass(_self.classes.readyToRemove);

                        /* // disable editable if we reach limit.
                        if (!settings.editableOnReachLimit && _self.isLimitReached()) {
                            setTimeout(function(e) { // for some reason disabling of the editability will trigger another addTag(). So let's delay.
                                $input.removeAttr("contenteditable");
                            }, 0);
                        } */
                    }
                },

                removeTag: function(tagTitle, animate) { // boolean FALSE removes all tags.
                        var _self = this,
                            findTagItem = function(tagTitle) {
                                return $(_self.selectors.inputArea).find('[data-val="'+tagTitle+'"]');
                            };

                        if (_self.tagNames.length) {
                            if (tagTitle) { // remove single item by name
                                _self.removeTagByItem(findTagItem, animate);

                            }else { // remove all items
                                $.each(_self.tagNames, function(index, item) {
                                   _self.removeItem(findTagItem(item), animate);
                                });
                                _self.tagNames = []; // clear array completely
                            }
                        }
                        _self.updateInputValue();
                },

                removeTagByItem : function(item, animate) { // item is HTML element
                        var _self = this,
                            settings = _self.settings,
                            $input = $(_self.selectors.sTagsInput);

                        _self.tagNames.splice($(item).index(), 1);
                        _self.removeItem(item, animate)
                            .updateInputValue();

                        $(_self.selector).trigger("suggestags.remove", [$(item).attr("data-val")])
                                         .trigger("suggestags.change");

                        if (settings.triggerChange)
                            $(_self.selector).trigger("change");

                        if ("function" === typeof settings.afterRemove)
                            settings.afterRemove($(item).attr("data-val"));

                        $input.removeClass(_self.classes.readyToRemove);

                        if (!_self.tagNames.length) {
                            var placeholderText = $input.data("placeholder");
                            if (placeholderText) // return back placeholder message
                                $input.attr("placeholder", placeholderText);
                            /*
                                if (!settings.editableOnReachLimit && _self.isLimitReached())
                                $input.attr("contenteditable", "plaintext-only");
                             */
                        }
                },

                removeItem : function(item, animate) { // TODO: respect reduced animation.
                    item = $(item);
                    if (item.length) {
                        if (animate) {
                            $(item).addClass("disabled");

                            setTimeout(function() {
                                $(item).fadeOut(); // originally .slideUp(), but I don't want jumps.
                                setTimeout(function() {
                                    $(item).remove();
                                }, 500);
                            }, 200);
                        }else {
                            $(item).remove();
                        }
                    }

                    return this;
                },

                flashItem : function(value) {
                    var $item = false;

                    value = value.toLowerCase();

                    $(this.selectors.sTagsArea).find(this.classes.tagItem).each(function() {
                        var tagName = $(this).attr("data-val").trim();
                        if (value === tagName.toLowerCase()) {
                            $item = $(this);
                            return false; // break each()
                        }
                    });

                    if ($item) { // See also "flashItem()" from utilmind's commons. Basically it's the same.
                        $item.addClass("flash");
                        setTimeout(function() {
                            $item.removeClass("flash");
                        }, 1500); // it's not animation duration, it's when "flash" class being removed. Duration of effect controlled by CSS.
                    }

                    return this;
                },

                getItemKey : function(value) {
                    var itemKey = -1;

                    if (this.settings.suggestions.length) {
                            var lower = value.toLowerCase();

                            $.each(this.settings.suggestions, function(key, item) {
                                    if ("object" === typeof item) {
                                            if (item.value.toLowerCase() === lower) {
                                                    itemKey = key;
                                                    return false; // break each()
                                            }
                                    }else if (item.toLowerCase() === lower) {
                                            itemKey = key;
                                            return false; // break each()
                                    }
                            });
                    }
                    return itemKey;
                },

                isPresent : function(value) {
                    var present = 0;

                    $.each(this.tagNames, function(index, tag) {
                        if (value.toLowerCase() === tag.toLowerCase()) {
                            present = 1;
                            return false; // break each()
                        }
                    });
                    return present;
                },

                customStylings : function(item, key) {
                    var _self = this,
                        settings = _self.settings,
                        $item = $(item),
                        isCustom = false;

                    if (settings.classes[key]) {
                        isCustom = true;
                        $item.addClass(settings.classes[key]);
                    }
                    if (settings.backgrounds[key]) {
                        isCustom = true;
                        $item.css("background", settings.backgrounds[key]);
                    }
                    if (settings.colors[key]) {
                        isCustom = true;
                        $item.css("color", settings.colors[key]);
                    }
                    if (!isCustom) {
                        $item.addClass(_self.classes.colBg.substr(1));
                    }
                    return _self;
                },

                updateInputValue: function() {
                        this.updateIsRequired();
                        $(this.selector).val(this.tagNames.join(","));
                },

                refresh : function() {
                        this._init(false, "refresh");
                },

                destroy : function() {
                        this._init(false, "destroy");
                },

                similarity: function(s1, s2) {
                        var editDistance = function(s1, s2) {
                                s1 = s1.toLowerCase();
                                s2 = s2.toLowerCase();

                                var i, costs = [];
                                for (i = 0; i <= s1.length; ++i) {
                                        var j, lastValue = i;
                                        for (j = 0; j <= s2.length; ++j) {
                                                if (0 === i) {
                                                        costs[j] = j;
                                                }else {
                                                        if (0 < j) {
                                                                var newValue = costs[j-1];
                                                                if (s1.charAt(i-1) !== s2.charAt(j-1)) {
                                                                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                                                                }
                                                                costs[j-1] = lastValue;
                                                                lastValue  = newValue;
                                                        }
                                                }
                                        }

                                        if (0 < i)
                                                costs[s2.length] = lastValue;
                                }
                                return costs[s2.length];
                            },

                            longer = s1,
                            shorter = s2;

                        if (s1.length < s2.length) {
                            longer = s2;
                            shorter = s1;
                        }

                        var longerLength = longer.length;
                        if (0 === longerLength) {
                                return 1.0;
                        }
                        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
                },
        };

        $.fn.umSuggestags = function(settings, method) {
                return this.each(function() {
                         if (settings && ("object" !== typeof settings)) {
                             method = settings;
                             settings = false;
                         }

                         if (!this.suggestTags) {
                             if (method) return false; // control not yet initialized. We can't perform this action. Initialize it first gracefully, without specifying the method.

                             this.suggestTags = new umSuggestags(this);
                         }

                         this.suggestTags.init(settings, method);
                });
        };
}));