/**
 * @author  Sander, Steffen
 *
 * to utilize MVC data validation attributes
 * on client side validation
 */
(function($) {
    $.fn.initMvcWizardNavigation = function (options) {
        var $form = { };
        var settings = $.extend({
                debug: false,
                idMsgDialog: "#dialog",
                actionSuffix: "", // Save by convention
                formIdExtension: "-form",
                showAlerts: function(jsonResult) {
                    console.info("option 'showAlerts' passed unhandled!");
                    console.log(jsonResult);
                }
            },
            $.fn.initMvcWizardNavigation.defaults,
            options);

        // init navigation var

        return this.each(function () {
            $form = this;

            $(this)
                .find("a[data-wizard-navigation]")
                .each(function() {
                    var dataWizNav = this.dataset.wizardNavigation.trim();
                    console.log("found navigation button: '" + this.innerText + "'; data: '" + dataWizNav + "'");

                    // NOTE apply a specific binding, change to a plugin method
                    if (dataWizNav.indexOf(": ") !== -1) {
                        bindClickHandler(this,
                            dataWizNav.split(": "), // e.g. 'data-wizard-navigation="click: getDialogSettings.bind($form.BpId.value)"'
                            function(dlgSettings, event) {
                                loadOptionsView(dlgSettings);
                            });
                        return this;
                    }

                    // NOTE apply the standard binding
                    $(this).on("click",
                        function (event) {
                            event.stopPropagation();
                            console.clear();

                            var fncArgs = [this];

                            // split value for wizard navigation
                            var splitArgs = dataWizNav.split(";").forEach(function(item) {
                                fncArgs.push(item);
                            });

                            //debugger;
                            var formIsValid = triggerFormValidation.apply(this, fncArgs);
                            if (!formIsValid) {
                                console.warn("form input is invalid");
                                return this;
                            }

                            var submitFailed = submitWizardForm.apply(this, fncArgs);
                            if (submitFailed) {
                                //debugger;
                                console.error("stop wizard navigation");
                                return this;
                            }

                            // redirect 'back' or 'next'
                            window.location.href = fncArgs[2];
                            return this;
                        });
                });

            //Initialize tooltips of the step visualizer
            $(".nav-tabs > li a[title]").tooltip();

            /**
             * to submit current form data by using ajax
             * @param {any} clickBtn
             * @param {any} targetSaveUrl
             * @param {any} targetNextUrl
             * @param {any} currentTabId
             * @param {any} allTabIds   to load from form elements by form-ID-conventions '$(tabId)-form'
             * @returns bool true on an error
             */
            function submitWizardForm(clickBtn, targetSaveUrl, targetNextUrl, currentTabId, allTabIds) {
                var btn = $(clickBtn);
                //btn.button({ loadingText: 'submit form' });
                btn.button("loading");

                if (document.forms.length > 0) {
                    var formData = {};
                    var allTabFormIds = (allTabIds || "").split("|");
                    allTabFormIds = $.grep(allTabFormIds, function(n) { return n }); // remove empty/falsy items

                    if (allTabFormIds.length === 0) {
                            formData = getFormDataAsObject(document.forms[0]);
                            //formData = new FormData(document.forms[0]);
                    } else {
                        for (var i = 0; i < allTabFormIds.length; i++) {
                            var frmObj = document.getElementById(allTabFormIds[i] + settings.formIdExtension);
                            var frmData = getFormDataAsObject(frmObj);

                            var attributeNames = Object.getOwnPropertyNames(frmData);
                            for (var j = 0; j < attributeNames.length; j++) {
                                formData[attributeNames[j]] = frmData[attributeNames[j]];
                            }
                        }
                    }

                    var withError = submitAllFormsData(targetSaveUrl + settings.actionSuffix, formData);

                    btn.button("reset");

                    if (withError === true) {
                        return true;
                    }
                }

                return false;
            }

            return this;
        });

        /**
         * 
         * @param {any} elem
         * @param {any} bindConfig
         * @param {Object} callLoadOptionsView expecting dialog-view-settings
         */
        function bindClickHandler(elem, bindConfig, callLoadOptionsView) {
            // 'click: showDocuments.bind(108)'
            var fncBind = [bindConfig[0]];
            // [event-type, 'showDocuments', '(108)']
            // [event-type, 'showDocuments', '($form.BpId.value)']

            bindConfig[1].split(".bind").forEach(function(cfg) {
                fncBind.push(cfg.trim());
            });

            var defEvent = fncBind[0];
            var defJsFnc = fncBind[1];
            var defParam = fncBind[2] || "()";
            var fncArgDecl = defParam.substring(defParam.indexOf("(")+1, defParam.lastIndexOf(")"));

            //elem.addEventListener(fncBind[0], window[fncBind[1]].bind(fncBind[0], fncArg));
            elem.addEventListener(defEvent,
                function (event) {
                    event.stopPropagation();
                    console.log("additional event listener arguments:");
                    // console.log(arguments);
                    var fncArg = fncArgDecl || "";

                    try {
                        if (fncArg.indexOf(".") !== -1) {
                            var paramTree = fncArg.split(".");
                            switch (paramTree.shift()) {
                                case "$form":
                                    fncArg = $form[paramTree.shift()][paramTree.shift()];
                                break;
                                default:
                                    // keep function arg
                                    break;
                            }
                        } else if(fncArg.indexOf(", ") !== -1){
                            fncArg = fncArg.split(", ");                            
                        }
    
                        var dialogViewSettings = window[defJsFnc](fncArg, event); // event to get the id of srcElement
                        console.log(dialogViewSettings);

                        if (dialogViewSettings && typeof dialogViewSettings === "object" && typeof callLoadOptionsView === "function") {
                            callLoadOptionsView(dialogViewSettings, event);
                        }
                    } catch (ex) {
                        console.error("on call a wizard-function: " + bindConfig.toString() + ", fncBind:");
                        console.log(fncBind);
                        console.log(ex);
                    }
                });
        }

        /**
         * 
         * param {object} optSettings {action:'/controller/action', data:{}, idEventSource:'#btnId', responseDataType:'html', dlgTitle:'...', idMsgDialog:'#...')
         */
        function loadOptionsView(optSettings) {
            "use strict";
            if (optSettings.idEventSource !== undefined) {
                $(optSettings.idEventSource).button("loading");
            }

            $.ajax({
                type: "POST",
                url: optSettings.action,
                headers: { 'X-Requested-With': "XMLHttpRequest" },
                dataType: optSettings.responseDataType || "html",
                data: optSettings.data,
                cache: false,
                success: function (response) {
                    if (settings.debug) {
                        console.info("result of loadOptionsView: " + optSettings.action + "; dialogTitle:" + optSettings.dialogTitle);
                        console.log(response);
                    }

                    var dlgSettings = {
                        idMsgDialog: optSettings.idMsgDialog || settings.idMsgDialog,
                        dlgTitle: optSettings.dlgTitle
                    };
                    showDialog(response, dlgSettings, true);
                },
                error: function(response, state, errMsg) {
                    //debugger;
                    console.error("error loading an options view by action: " + optSettings.action);
                    console.log(arguments);

                    showDialog(response);
                },
                complete: function () {
                    if (optSettings.idEventSource !== undefined) {
                        setTimeout(function() {
                                $(optSettings.idEventSource).button("reset"); // reset always
                            },
                            250);
                    }
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        }

        function showDialog(response, dlgSettings, usePlainHtmlFromResponse) {

            if (dlgSettings === undefined || dlgSettings === null) {
                dlgSettings = {
                    idMsgDialog: settings.idMsgDialog,
                    dlgTitle: "Request Error"
                };
            }

            if ($(dlgSettings.idMsgDialog).length === 0)
                return;

            try {
                if (usePlainHtmlFromResponse) {
                    console.log("typeof response: " + typeof response);
                    var responseHtml = response.responseText;
                    if (responseHtml === undefined) {
                        responseHtml = response;
                    }

                    $(dlgSettings.idMsgDialog)
                        .html(responseHtml)
                        .dialog({
                            title: dlgSettings.dlgTitle || "Request Error"
                        })
                        .dialog("open");
                    return;
                }

                var getBodyHtml = new DOMParser() // NOTE eval error response
                    .parseFromString(response.responseText, "text/html")
                    .getElementsByTagName("body");
                var bodyHtml = getBodyHtml.length > 0
                    ? new XMLSerializer().serializeToString(getBodyHtml[0])
                    : response.responseText;
                $(dlgSettings.idMsgDialog)
                    .html(bodyHtml)
                    .dialog({
                        title: dlgSettings.dlgTitle || "Request Error"
                    })
                    .dialog("open");
            } catch (err) {
                console.error(err);
            }
        }

        function triggerFormValidation(clickBtn, targetSaveUrl, targetNextUrl, currentTabId, allTabIds) {
            var allTabFormIds =
                $.grep((allTabIds || "").split("|"), function(n) { return n }); // remove empty/falsy items

            //debugger;
            var formValid = true;
            var alerts = {};

            if (allTabFormIds.length === 0) {
                // process the first form of the html document
                if (!$.fn.initMvcWizardNavigation.formValidationEnabled(document.forms[0])) {
                    console.info("forms[0] validation omitted.");
                    return true;
                }

                formValid = $(document.forms[0]).validate({ ignore: "hidden" });
                console.log("wizard form validation: " + formValid);

                if (formValid.errorList.length > 0) {
                    console.warn("Validation of a single form failed!");
                    alerts = {
                        "_Alerts": [
                            { Command: "warning", Message: "Please, validate your form input values!" }
                        ]
                    };
                    settings.showAlerts(alerts);
                }
            } else {
                // process tabs
                for (var i = 0; i < allTabFormIds.length; i++) {
                    var formId = allTabFormIds[i] + settings.formIdExtension;
                    var frmObj = document.getElementById(formId);

                    if (!$.fn.initMvcWizardNavigation.formValidationEnabled(frmObj)) {
                        console.info("form (id: " + formId + ") validation omitted.");
                        continue; // with next form on the page
                    }

                    var formValidTemp = $(frmObj).validate({ ignore: "hidden" });
                    if (formValidTemp.errorList.length > 0) {
                        console.warn("Validation of form '" + formId + "' failed!");
                        formValid = false;
                        alerts = {
                            "_Alerts": [
                                { Command: "warning", Message: "Please, validate input values of form " + formId + "!" }
                            ]
                        };
                        settings.showAlerts(alerts);
                    }
                }
            }

            return formValid;
        }

        function getFormDataAsObject(formObj, addOptions) {
            var formInputElements = $(formObj).serializeArray();
            var itemFormData = addOptions != undefined ? addOptions : {};

            formInputElements.forEach(function(item, index) {
                itemFormData[item.name] = item.value;
            });

            return itemFormData;
        }

        /**
         *
         * @param {any} itemObj data to be transmitted
         * @param {any} targetAction target controller and action URL
         */
        function submitAllFormsData(targetAction, formData, handleSuccessResponse) {
            var withError = true;

            $.ajax({
                async: false,
                type: "POST",
                url: targetAction,
                headers:
                    { 'X-Requested-With': "XMLHttpRequest" }, // to detect this as an AJAX call on controller side
                dataType: "json",
                data: formData,
                cache: false,
                //contentType: "application/json; charset=utf-8",
                success: function (result) {
                    if (typeof handleSuccessResponse === "function") {
                        handleSuccessResponse(result);
                        withError = false;
                        return;
                    }

                    withError = handleJsonResultDetail(result);
                },
                error: function(response, state, errMsg) {
                    //debugger;
                    console.error("error on submit item data, action:" + targetAction + "; state: " + state + "; errMsg:" + errMsg);
                    console.log(arguments);

                    // NOTE show error details and a cancel button
                    try {
                        if ($(settings.idMsgDialog).length > 0) {
                            var getBodyHtml = new DOMParser() // NOTE eval error response
                                .parseFromString(response.responseText, "text/html")
                                .getElementsByTagName("body");
                            var bodyHtml = getBodyHtml.length > 0
                                ? new XMLSerializer().serializeToString(getBodyHtml[0])
                                : response.responseText;

                            switch (state) {
                            case "parsererror":
                                $(settings.idMsgDialog)
                                    .text(bodyHtml)
                                    .dialog("open");
                                break;
                            default:
                                $(settings.idMsgDialog)
                                    .html(bodyHtml)
                                    .dialog("open");
                                break;
                            }

                        }
                    } catch (err) {
                        console.error(err);
                    }
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });

            return withError;
        }

        /**
         * to delegate processing the JSON response of actions (Edit, Cancel, Delete, Save)
         * see 'settings.handleJsonResult' within '_LayoutCompany.cshtml'
         * @param {any} jsonObj expecting properties of 'result', 'mode', 'errors', 'messages', '_Alerts[{Command,Message}]'
         */
        function handleJsonResultDetail(jsonObj) {
            try {
                delegateShowAlerts(jsonObj);
            } catch (err) {
                console.error("on showAlerts with JSON result");
                console.log(jsonObj);
                console.log(err);
            }

            //var props = Object.getOwnPropertyNames(jsonObj);
            if (jsonObj["result"] == undefined)
                return false; // FIXME handle as an error?

            if (jsonObj["result"]) {
                // successfully
                console.info("handleJsonResultDetail " + jsonObj["mode"]);
                //start reload data
                return false;
            } else {
                // TODO
                console.error("handleJsonResultDetail " + jsonObj["mode"]);
                delegateShowErrors(jsonObj);
                return true;
            }

            console.log(jsonObj);
        }

        /**
         *
         * @param {any} jsonWithAlerts {'_Alerts': [{Command:, Message:})}
         */
        function delegateShowAlerts(jsonWithAlerts) {
            if ("function" === typeof settings.showAlerts && settings.showAlerts != undefined) {
                try {
                    settings.showAlerts(jsonWithAlerts);
                } catch (err) {
                    console.error("on delegateShowAlerts");
                    console.log(err);
                }
            } else {
                console.log("missing option 'showAlerts' of type function to notify user: ");
                console.info(jsonWithAlerts);
            }
        }

        function delegateShowErrors(jsonWithErrors) {
            var errAlerts = { _Alerts: [] };

            var props = Object.getOwnPropertyNames(jsonWithErrors);
            for (var i = 0; i < props.length; i++) {
                switch (props[i]) {
                case "errors":
                    var err = collectAlerts("error", jsonWithErrors[props[i]]);
                    if (err.length > 0)
                        errAlerts._Alerts = errAlerts._Alerts.concat(err);
                    break;
                case "messages":
                    var inf = collectAlerts("info", jsonWithErrors[props[i]]);
                    if (inf.length > 0)
                        errAlerts._Alerts = errAlerts._Alerts.concat(inf);
                    break;
                }
            }

            delegateShowAlerts(errAlerts);
        }

        function collectAlerts(command, messages) {
            var msgResult = [];

            for (var i = 0; i < messages.length; i++) {
                msgResult.push({
                    Command: command,
                    Message: messages[i]
                });
            }

            return msgResult;
        }

    } // jquery plugin definition

    // define a plugin extension point
    $.fn.initMvcWizardNavigation.formValidationEnabled = function (htmlForm) {
        var attributeOptFnc = $.fn.initMvcWizardNavigation.defaults.attributeFormValOptional;
        var optFnc = htmlForm.dataset[attributeOptFnc];

        //debugger;
        if (optFnc === undefined || optFnc === null || optFnc.trim() === "" || typeof window[optFnc] !== "function") {
            console.log("stop optional form validation of: " + htmlForm.getAttribute("id") + "; form-validation-optional: " + optFnc);
            return true;
        }

        return window[optFnc](htmlForm);
    };

    $.fn.initMvcWizardNavigation.defaults = {
        attributeFormValOptional: "form-validation-optional" // a function name: true to validate form
    }
}(jQuery));