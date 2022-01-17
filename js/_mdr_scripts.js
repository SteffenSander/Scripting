
var scripts_path = "/Scripts/"; // define in layout(!) to load from road (see possible 'Areas')
//console.log(navigator.userAgent);

/**
 * @author  Sander, Steffen
 * @desc    to initialize client scripts on demand
 */
jQuery(window).ready(function () {
    Init(true);
});


/**
 * 
 * @param {bool} isFirstLoadOrAjax true on the first load or false if is an AJAX call
 */
function Init(isFirstLoadOrAjax) {
    if (isFirstLoadOrAjax) {
        _initSelectPicker();
        _initToastr();
    }

    _initFormValidation();
    _animate();
}

/** 
 * 
 **************************************************************** **/
if (jQuery("#preloader").length > 0) {

    jQuery(window).on("load", function () {

        jQuery("#preloader").fadeOut(750, function () {
            jQuery("#preloader").remove();
        });
    });
}

/** Custom File Upload
	<input class="custom-file-upload" type="file" id="file" name="myfiles[]" multiple />
 *********************** **/
var file_container = jQuery("input[type=file].custom-file-upload");

if (file_container.length > 0) {
    jQuery(window).on("load",
        function() {
            loadScript("query.customFle_upload.js");
        });
}

function _initToastr() {
    loadScript("toastr.js", function () { console.info("toastr initialized"); });
}

function _initSelectPicker() {
    if ($(".selectpicker").length === 0) {
        return;
    }

    loadScript("bootstrap-select.min.js",
        function () {
            $(".selectpicker").selectpicker();
        });//*/
}

/**
 * see in DisplayTemplates and Models-Template ToggleButton
 * @param string domIdRadio
 * @param string classDivSelected
 */
function toggleButtonState(domIdRadio, classDivSelected) {
    var btnRadio = document.getElementById(domIdRadio);

    if (btnRadio === null || btnRadio === undefined) {
        console.error("missing radio button to toggle its state by id '" + domIdRadio + "'");
        return false;
    }

    // reset selected
    var btnGroup = document.getElementsByName(btnRadio.name);
    for (var i = 0; i < btnGroup.length; i++) {
        var idDivReset = btnGroup[i].dataset.toggleIdDiv;
        if (document.getElementById(idDivReset).className.indexOf(classDivSelected) > -1) {
            $("#" + idDivReset).removeClass(classDivSelected);
        }
    }

    // set selected
    btnRadio.click();

    var domIdDiv = btnRadio.dataset.toggleIdDiv;
    var div = document.getElementById(domIdDiv);

    if (div === null || div === undefined) {
        console.error("missing button div to toggle class by id '" + domIdDiv + "'");
        return false;
    }

    console.log("toggle button state [id:" + domIdRadio + "; name:" + btnRadio.name + "; state:" + btnRadio.checked + "; div:" + domIdDiv + "; class:" + div.className + "]");

    $("#" + domIdDiv).toggleClass(classDivSelected);

    return false;
}

/**
 * see CompanyController.ShowOptions to handle relations between company and departments
 * @param {bool} newState see employee controller to create or remove an object
 * @param {object} jsonRelationAndAction (action:[, companyId:, departmentId:])
 */
function onTableItemRelationChanged(newState, jsonRelationAndAction) {
    if ("string" === typeof jsonRelationAndAction) {
        jsonRelationAndAction = JSON.parse(jsonRelationAndAction);
    }

    jsonRelationAndAction.relationState = newState;

    $.ajax({
        type: "POST",
        url: jsonRelationAndAction.action,
        headers: { 'X-Requested-With': "XMLHttpRequest" },
        dataType: "json",
        data: jsonRelationAndAction,
        cache: false,
        success: function (response) {
            console.info("result of onTableItemRelationChanged: " + jsonRelationAndAction.action);
            processResponseWithAlerts(response);
        },
        error: function (response, state, errMsg) {
            console.error("onTableItemRelationChanged: " + errMsg);
            console.log(arguments);

            // TODO processShowAlerts
        },
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    });
}

/**
 * see Mdr.Home.BankDetails document description
 * @param {any} uplSettings
 * @param {any} formData
 * @param {any} callbackOnSuccess
 */
function postUplSettings(uplSettings, formData, callbackOnSuccess) {
    $.ajax({
        async: uplSettings.async,
        type: "POST",
        url: uplSettings.action,
        headers: { 'X-Requested-With': "XMLHttpRequest" },
        dataType: uplSettings.dataType || "json",
        data: formData || uplSettings,
        cache: false,
        success: function(response) {
            console.info("postUplSettings.success: " + uplSettings.action);
            processResponseWithAlerts(response);
            if ("function" === typeof callbackOnSuccess) {
                callbackOnSuccess();
            }
        },
        error: function(response, state, errMsg) {
            console.error("postUplSettings.error: " + errMsg);
            console.log(arguments);

            // TODO processShowAlerts
        },
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        }
    });
}


/** Load Script
	USAGE
	var pageInit = function() {}
	loadScript(plugin_path + "script.js", function);
	Load multiple scripts and call a final function
	loadScript(plugin_path + "script1.js", function(){
		loadScript(plugin_path + "script2.js", function(){
			loadScript(plugin_path + "script3.js", function(){
				loadScript(plugin_path + "script4.js", function);
			});
		});
	});
 **************************************************************** **/

var _loadedScripts = {};

function loadScript(scriptName, callback, callbackOnError) {

    if (!_loadedScripts[scriptName]) {
        _loadedScripts[scriptName] = true;

        var body = document.getElementsByTagName('body')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scripts_path + scriptName;

        // then bind the event to the callback function
        // NOTE there are several events for cross browser compatibility
        // script.onreadystatechange = callback;
        script.onload = callback;

        if (callbackOnError !== undefined && typeof callbackOnError === "function") {
            script.onerror = function () { callbackOnError(script); };
        } else {
            script.onerror = function () {
                console.error("on loading script " + (script ? script.src : "src missing"));
                console.log(arguments);
            };
        }

        // fire the loading
        body.appendChild(script);

    } else if (callback) {
        callback();
    }
}


/** 01. init MVC client validation
 * EXAMPLE USAGE
 * <form class="mvc-client-validation" >...</form>
 */

function _initFormValidation() {
    if (jQuery(".mvc-client-validation").length > 0) {
        loadScript("jquery.mvc-client-validation.js",
            function () {
                jQuery(".mvc-client-validation").initMvcClientValidation();
            });
    }
}


/** 02. Animate
	EXAMPLE USAGE
	<img class="wow fadeInUp" data-wow-delay="0.1s" src="image.jpg" alt="" />
 **************************************************************** **/

function _animate() {

    if (jQuery("body").hasClass('enable-animation')) {

        var wow = new WOW({
            boxClass: 'wow',
            animateClass: 'animated',
            offset: 90,
            mobile: false,
            live: true,
            callback: function (el) {
                try {
                    afterReveal(el);
                } catch (err) {
                    console.error("on call function 'afterReveal'");
                    console.log(err);
                }
            }
        });

        wow.init();

    }

    //// Count To
    //      jQuery(".countTo").appear(function(){
    //	var _t 					= jQuery(this),
    //		_from 				= _t.attr('data-from') 				|| 0,
    //		_speed 				= _t.attr('data-speed') 			|| 1300,
    //		_refreshInterval 	= _t.attr('data-refreshInterval') 	|| 60;


    //          _t.countTo({
    //              from: 				parseInt(_from),
    //              to: 				_t.html(),
    //              speed: 				parseInt(_speed),
    //              refreshInterval: 	parseInt(_refreshInterval),
    //          });

    //      });
}

/**
 * @see http://bootboxjs.com/examples.html
 * @param {string} msgText to show as message body
 * @param {string} msgTitle the title text of the message box
 * @param {function} callbackOnConfirm to go on with further processing
 */
function showPrompt(msgText, msgTitle, callbackOnConfirm, boxType) {
    loadScript("bootbox.min.js",
        function() {
            switch (boxType) {
            case "prompt":
                bootbox.prompt({
                    title: msgTitle,
                    message: msgText,
                    callback: callbackOnConfirm,
                    ok: {
                        label: "Save",
                        className: "btn-success"
                    },
                    cancel: {
                        label: "Cancel",
                        className: "btn-info"
                    }
                });
                break;
            default:
                bootbox.confirm({
                    title: msgTitle,
                    message: msgText,
                    inputType: inputType,
                    buttons: {
                        confirm: {
                            label: "Yes",
                            className: "btn-danger"
                        },
                        cancel: {
                            label: "Cancel",
                            className: "btn-success"
                        }
                    },
                    callback: function(result) {
                        if ("function" !== typeof callbackOnConfirm || callbackOnConfirm === undefined)
                            return;

                        try {
                            callbackOnConfirm(result);
                        } catch (err) {
                            console.error("on confirm callback '" + msgTitle + "', err: " + err.Message);
                            console.log(err);
                        }
                    }
                });
                break;
            }
        });
}

/**
 * 
 * @param {any} response directly from the ajax call
 * @param {any} callbackHandleOtherProperty a callback method to handle particular response data, returns true if has handled
 */
function processResponseWithAlerts(response, callbackHandleOtherProperty) {
    var props = Object.getOwnPropertyNames(response);
    var propsUnhandled = [];

    try {
        for (var j = 0; j < props.length; j++) {
            switch (props[j]) {
            case "_Alerts":
                processShowAlerts(response[props[j]]);
                break;

            default:
                if ("function" === typeof callbackHandleOtherProperty) {
                    if (callbackHandleOtherProperty(props[j], response[props[j]])) {
                        continue;
                    }
                }

                propsUnhandled.push(props[j]);
                break;
            }
        }
    } catch (err) {
        console.error("on process '_Alerts', err: " + err.Message);
        console.log(err);
    }

    if (propsUnhandled.length > 0) {
        console.log("processResponseWithAlerts.success.prop: " + propsUnhandled.join(", "));
    }
}

/**
 * called by option of '.setupMasterDataTable' - processJsonResult
 * @param {Array<Alert>} alerts [{Command:, Message:}, ...]
 */
function processShowAlerts(alerts) {
    if (alerts === undefined || alerts === null || alerts.length === 0)
        return;

    loadScript("toastr.js",
        function () {
            // see: http://codeseven.github.io/toastr/demo.html
            toastr.options.closeButton = true;
            toastr.options.positionClass = "toast-top-center";
            toastr.options.progressBar = true;
            toastr.options.timeOut = 5000;
            toastr.options.extendedTimeOut = 3000; // after mouse over
            toastr.options.showMethod = "slideDown";
            toastr.options.hideMethod = "slideUp";
            //toastr.options.iconClasses = {
            //    error: "alert-error",
            //    info: "alert-info",
            //    success: "alert-success",
            //    warning: "alert-waring"
            //};

            for (var i = 0; i < alerts.length; i++) {
                toastr[alerts[i].Command](alerts[i].Message);
            }
        });
}

/**
 * gets called when WOW animiation is completed
 * @param {any} el to add a listener on animationend
 */
function afterReveal(el) {
    el.addEventListener("animationend",
        function (event) {
            if (event.target.id === "") {
                //console.log('target.nodeName:' + event.target.nodeName + '; target-type:' + event.target.type + ';');
                return;
            }

            var div = $("#" + event.target.id);
            if (div === null || div === undefined || div.data("function") === undefined)
                return;

            console.log("end " +
                event.target.id +
                " has function " +
                div.data("function") +
                " params: " +
                div.data("functionParams"));

            switch (div.data("function")) {
                case "addClass": // see: http://api.jquery.com/addClass/
                    var clArgs = div.data("functionParams").split(":");

                    div.addClass(clArgs[0], { duration: clArgs[1] }).stop(true, false).removeAttr("style");
                    break;

                case "animate": // see: http://api.jquery.com/animate/
                    var argsDict = {};

                    var argsList = div.data("functionParams").split(";");
                    argsList.forEach(function (keyValue, index) {
                        var kvSplit = keyValue.split(":");
                        argsDict[kvSplit[0]] = kvSplit[1];
                    });

                    div.animate(argsDict, 250);

                    break;

                default:
                    console.warn("function not supported " + div.data("function"));
                    break;
            }
        }
    );
}

function tab2FormValidationActive(htmlForm) {
    return false; // TODO impl. for a.04, a.04.1
}

/*! WOW - v1.1.3 - 2016-05-06 
/* Copyright (c) 2016 Matthieu Aussaguel;*/(function () { var a, b, c, d, e, f = function (a, b) { return function () { return a.apply(b, arguments) } }, g = [].indexOf || function (a) { for (var b = 0, c = this.length; c > b; b++)if (b in this && this[b] === a) return b; return -1 }; b = function () { function a() { } return a.prototype.extend = function (a, b) { var c, d; for (c in b) d = b[c], null == a[c] && (a[c] = d); return a }, a.prototype.isMobile = function (a) { return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(a) }, a.prototype.createEvent = function (a, b, c, d) { var e; return null == b && (b = !1), null == c && (c = !1), null == d && (d = null), null != document.createEvent ? (e = document.createEvent("CustomEvent"), e.initCustomEvent(a, b, c, d)) : null != document.createEventObject ? (e = document.createEventObject(), e.eventType = a) : e.eventName = a, e }, a.prototype.emitEvent = function (a, b) { return null != a.dispatchEvent ? a.dispatchEvent(b) : b in (null != a) ? a[b]() : "on" + b in (null != a) ? a["on" + b]() : void 0 }, a.prototype.addEvent = function (a, b, c) { return null != a.addEventListener ? a.addEventListener(b, c, !1) : null != a.attachEvent ? a.attachEvent("on" + b, c) : a[b] = c }, a.prototype.removeEvent = function (a, b, c) { return null != a.removeEventListener ? a.removeEventListener(b, c, !1) : null != a.detachEvent ? a.detachEvent("on" + b, c) : delete a[b] }, a.prototype.innerHeight = function () { return "innerHeight" in window ? window.innerHeight : document.documentElement.clientHeight }, a }(), c = this.WeakMap || this.MozWeakMap || (c = function () { function a() { this.keys = [], this.values = [] } return a.prototype.get = function (a) { var b, c, d, e, f; for (f = this.keys, b = d = 0, e = f.length; e > d; b = ++d)if (c = f[b], c === a) return this.values[b] }, a.prototype.set = function (a, b) { var c, d, e, f, g; for (g = this.keys, c = e = 0, f = g.length; f > e; c = ++e)if (d = g[c], d === a) return void (this.values[c] = b); return this.keys.push(a), this.values.push(b) }, a }()), a = this.MutationObserver || this.WebkitMutationObserver || this.MozMutationObserver || (a = function () { function a() { "undefined" != typeof console && null !== console && console.warn("MutationObserver is not supported by your browser."), "undefined" != typeof console && null !== console && console.warn("WOW.js cannot detect dom mutations, please call .sync() after loading new content.") } return a.notSupported = !0, a.prototype.observe = function () { }, a }()), d = this.getComputedStyle || function (a, b) { return this.getPropertyValue = function (b) { var c; return "float" === b && (b = "styleFloat"), e.test(b) && b.replace(e, function (a, b) { return b.toUpperCase() }), (null != (c = a.currentStyle) ? c[b] : void 0) || null }, this }, e = /(\-([a-z]){1})/g, this.WOW = function () { function e(a) { null == a && (a = {}), this.scrollCallback = f(this.scrollCallback, this), this.scrollHandler = f(this.scrollHandler, this), this.resetAnimation = f(this.resetAnimation, this), this.start = f(this.start, this), this.scrolled = !0, this.config = this.util().extend(a, this.defaults), null != a.scrollContainer && (this.config.scrollContainer = document.querySelector(a.scrollContainer)), this.animationNameCache = new c, this.wowEvent = this.util().createEvent(this.config.boxClass) } return e.prototype.defaults = { boxClass: "wow", animateClass: "animated", offset: 0, mobile: !0, live: !0, callback: null, scrollContainer: null }, e.prototype.init = function () { var a; return this.element = window.document.documentElement, "interactive" === (a = document.readyState) || "complete" === a ? this.start() : this.util().addEvent(document, "DOMContentLoaded", this.start), this.finished = [] }, e.prototype.start = function () { var b, c, d, e; if (this.stopped = !1, this.boxes = function () { var a, c, d, e; for (d = this.element.querySelectorAll("." + this.config.boxClass), e = [], a = 0, c = d.length; c > a; a++)b = d[a], e.push(b); return e }.call(this), this.all = function () { var a, c, d, e; for (d = this.boxes, e = [], a = 0, c = d.length; c > a; a++)b = d[a], e.push(b); return e }.call(this), this.boxes.length) if (this.disabled()) this.resetStyle(); else for (e = this.boxes, c = 0, d = e.length; d > c; c++)b = e[c], this.applyStyle(b, !0); return this.disabled() || (this.util().addEvent(this.config.scrollContainer || window, "scroll", this.scrollHandler), this.util().addEvent(window, "resize", this.scrollHandler), this.interval = setInterval(this.scrollCallback, 50)), this.config.live ? new a(function (a) { return function (b) { var c, d, e, f, g; for (g = [], c = 0, d = b.length; d > c; c++)f = b[c], g.push(function () { var a, b, c, d; for (c = f.addedNodes || [], d = [], a = 0, b = c.length; b > a; a++)e = c[a], d.push(this.doSync(e)); return d }.call(a)); return g } }(this)).observe(document.body, { childList: !0, subtree: !0 }) : void 0 }, e.prototype.stop = function () { return this.stopped = !0, this.util().removeEvent(this.config.scrollContainer || window, "scroll", this.scrollHandler), this.util().removeEvent(window, "resize", this.scrollHandler), null != this.interval ? clearInterval(this.interval) : void 0 }, e.prototype.sync = function (b) { return a.notSupported ? this.doSync(this.element) : void 0 }, e.prototype.doSync = function (a) { var b, c, d, e, f; if (null == a && (a = this.element), 1 === a.nodeType) { for (a = a.parentNode || a, e = a.querySelectorAll("." + this.config.boxClass), f = [], c = 0, d = e.length; d > c; c++)b = e[c], g.call(this.all, b) < 0 ? (this.boxes.push(b), this.all.push(b), this.stopped || this.disabled() ? this.resetStyle() : this.applyStyle(b, !0), f.push(this.scrolled = !0)) : f.push(void 0); return f } }, e.prototype.show = function (a) { return this.applyStyle(a), a.className = a.className + " " + this.config.animateClass, null != this.config.callback && this.config.callback(a), this.util().emitEvent(a, this.wowEvent), this.util().addEvent(a, "animationend", this.resetAnimation), this.util().addEvent(a, "oanimationend", this.resetAnimation), this.util().addEvent(a, "webkitAnimationEnd", this.resetAnimation), this.util().addEvent(a, "MSAnimationEnd", this.resetAnimation), a }, e.prototype.applyStyle = function (a, b) { var c, d, e; return d = a.getAttribute("data-wow-duration"), c = a.getAttribute("data-wow-delay"), e = a.getAttribute("data-wow-iteration"), this.animate(function (f) { return function () { return f.customStyle(a, b, d, c, e) } }(this)) }, e.prototype.animate = function () { return "requestAnimationFrame" in window ? function (a) { return window.requestAnimationFrame(a) } : function (a) { return a() } }(), e.prototype.resetStyle = function () { var a, b, c, d, e; for (d = this.boxes, e = [], b = 0, c = d.length; c > b; b++)a = d[b], e.push(a.style.visibility = "visible"); return e }, e.prototype.resetAnimation = function (a) { var b; return a.type.toLowerCase().indexOf("animationend") >= 0 ? (b = a.target || a.srcElement, b.className = b.className.replace(this.config.animateClass, "").trim()) : void 0 }, e.prototype.customStyle = function (a, b, c, d, e) { return b && this.cacheAnimationName(a), a.style.visibility = b ? "hidden" : "visible", c && this.vendorSet(a.style, { animationDuration: c }), d && this.vendorSet(a.style, { animationDelay: d }), e && this.vendorSet(a.style, { animationIterationCount: e }), this.vendorSet(a.style, { animationName: b ? "none" : this.cachedAnimationName(a) }), a }, e.prototype.vendors = ["moz", "webkit"], e.prototype.vendorSet = function (a, b) { var c, d, e, f; d = []; for (c in b) e = b[c], a["" + c] = e, d.push(function () { var b, d, g, h; for (g = this.vendors, h = [], b = 0, d = g.length; d > b; b++)f = g[b], h.push(a["" + f + c.charAt(0).toUpperCase() + c.substr(1)] = e); return h }.call(this)); return d }, e.prototype.vendorCSS = function (a, b) { var c, e, f, g, h, i; for (h = d(a), g = h.getPropertyCSSValue(b), f = this.vendors, c = 0, e = f.length; e > c; c++)i = f[c], g = g || h.getPropertyCSSValue("-" + i + "-" + b); return g }, e.prototype.animationName = function (a) { var b; try { b = this.vendorCSS(a, "animation-name").cssText } catch (c) { b = d(a).getPropertyValue("animation-name") } return "none" === b ? "" : b }, e.prototype.cacheAnimationName = function (a) { return this.animationNameCache.set(a, this.animationName(a)) }, e.prototype.cachedAnimationName = function (a) { return this.animationNameCache.get(a) }, e.prototype.scrollHandler = function () { return this.scrolled = !0 }, e.prototype.scrollCallback = function () { var a; return !this.scrolled || (this.scrolled = !1, this.boxes = function () { var b, c, d, e; for (d = this.boxes, e = [], b = 0, c = d.length; c > b; b++)a = d[b], a && (this.isVisible(a) ? this.show(a) : e.push(a)); return e }.call(this), this.boxes.length || this.config.live) ? void 0 : this.stop() }, e.prototype.offsetTop = function (a) { for (var b; void 0 === a.offsetTop;)a = a.parentNode; for (b = a.offsetTop; a = a.offsetParent;)b += a.offsetTop; return b }, e.prototype.isVisible = function (a) { var b, c, d, e, f; return c = a.getAttribute("data-wow-offset") || this.config.offset, f = this.config.scrollContainer && this.config.scrollContainer.scrollTop || window.pageYOffset, e = f + Math.min(this.element.clientHeight, this.util().innerHeight()) - c, d = this.offsetTop(a), b = d + a.clientHeight, e >= d && b >= f }, e.prototype.util = function () { return null != this._util ? this._util : this._util = new b }, e.prototype.disabled = function () { return !this.config.mobile && this.util().isMobile(navigator.userAgent) }, e }() }).call(this);