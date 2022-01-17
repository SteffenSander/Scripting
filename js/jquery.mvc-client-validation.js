/**
 * @author  Sander, Steffen
 *
 * to utilize MVC data validation attributes
 * on client side validation
 */
(function ($) {
    $.fn.initMvcClientValidation = function(options) {
        var settings = $.extend({
                debug: false,
                // You can change the animation class for a different entrance animation - check animations page
                errorClass: "field-validation-valid text-danger",
                errorElement: "div",
                errorPlacement: function(error, e) {
                    var errFieldMvc = e.siblings(".field-validation-valid");
                    if (errFieldMvc !== undefined && errFieldMvc !== null && errFieldMvc.length > 0) {
                        errFieldMvc.replaceWith(error); // TODO copy additional attributes
                    } else {
                        $(e).parents(".form-group > div")
                            .append(error);
                    }
                },
                highlight: function(e) {
                    $(e).closest(".form-group")
                        .removeClass("has-success has-error")
                        .addClass("has-error");
                    //var element = $(e);
                    //var eFocused = element.hasFocus;
                    //element.fadeOut(function () { element.fadeIn(function () { element.focus(); }); });
                },
                success: function(e) {
                    $(e).closest(".form-group")
                        .removeClass("has-success has-error");
                }
            },
            options);

        return this.each(function() {
            var form = $(this);

            // iterate elements and filter by attributes starting with 'data-val'
            var valFields = getValidationInputFields(form.attr("id"));

            console.info("plugin mvc-client-validation initializing, form '" +
                form.attr("id") + "' (action-mode: "+ form.data("action-mode") + ") with field length " +
                (valFields.length || "0, stop evaluation of rules and messages"));

            if (valFields.length === 0)
                return this;

            if (settings.debug) {
                var dbgOut = [];
                for (var k = 0; k < valFields.length; k++) {
                    dbgOut = { _prop: valFields[k].id, field: valFields[k] };
                }

                console.log(dbgOut);
            }

            var validateOptions = {};
            addRulesAndMessages(validateOptions, valFields);

            console.log("validateOptions.addRulesAndMessages");
            console.log(validateOptions);

            setFormValidationOptions(form, validateOptions);


            //registerDebugDomModification(form);



            function setFormValidationOptions(jqForm, valOptions) {
                // see: https://jqueryvalidation.org/validate/
                valOptions["errorClass"] = settings.errorClass;
                valOptions["errorElement"] = settings.errorElement;
                valOptions["errorPlacement"] = settings.errorPlacement;
                valOptions["highlight"] = settings.highlight;
                valOptions["success"] = settings.success;

                try {
                    jqForm.validate(valOptions);
                    console.log("form is valid: " + jqForm.valid());
                } catch (err) {
                    console.error("on validate form");
                    console.log(err);
                }
            }

            function addRulesAndMessages(valOptions, valFieldsIn) {
                // some hints: https://www.c-sharpcorner.com/article/asp-net-mvc5-jquery-form-validator/
                var ruleOptions = {};
                var msgOptions = {};

                for (var i = 0; i < valFieldsIn.length; i++) {
                    //debugger;
                    var vf = valFieldsIn[i]; //{input: {}, validation:[]}

                    ruleOptions[vf.input.getAttribute("id")] = createRules(vf.validation);

                    msgOptions[vf.input.getAttribute("id")] = createMessages(vf.validation);
                }

                valOptions["rules"] = ruleOptions;
                valOptions["messages"] = msgOptions;
            }

            function createMessages(valAttribs) {
                var valMsg = {};
                var substrPos = 9;
                var attribNames = Object.getOwnPropertyNames(valAttribs);

                for (var i = 0; i < attribNames.length; i++) {
                    if (attribNames[i].len <= substrPos)
                        continue;

                    var attrName = attribNames[i].substr(substrPos);
                    switch (attrName) {
                    case "required":
                        valMsg[attrName] = valAttribs[attribNames[i]];
                        break;
                    case "maxlength":
                        valMsg["maxlength"] = valAttribs[attribNames[i]];
                        break;

                    case "remote":
                        valMsg["remote"] = valAttribs[attribNames[i]];
                        break;

                    case "remote-additionalfields":
                    case "remote-url":
                    case "": // omit
                        break;
                    default:
                        if (isNaN(valAttribs[attribNames[i]])) {
                            valMsg[attrName] = valAttribs[attribNames[i]];
                            if (settings.debug)
                                console.log("create-messages: default for attribute: " + attrName);
                        }
                        break;
                    }
                }

                return valMsg;
            }

            function createRules(valAttribs) {
                var valRule = {};
                var substrPos = 9;
                var attribNames = Object.getOwnPropertyNames(valAttribs);

                for (var i = 0; i < attribNames.length; i++) {
                    if (attribNames[i].length <= substrPos)
                        continue;

                    var attrName = attribNames[i].substr(substrPos);
                    switch (attrName) {
                    case "required":
                        valRule[attrName] = true;
                        break;
                    case "maxlength": //means the message text
                        break;
                    case "maxlength-max":
                        valRule["maxlength"] = valAttribs[attribNames[i]];
                        break;
                    case "minlength": //means the message text
                        break;
                    case "minlength-min":
                        valRule["minlength"] = valAttribs[attribNames[i]];
                        break;

                    case "remote":
                    case "remote-url":
                    case "remote-additionalfields":
                        evalRemoteRule(valRule, valAttribs[attribNames[i]], attrName);
                        break;

                    case "range": // means the message text
                        break;
                    case "range-min": //see: https://jqueryvalidation.org/range-method/
                    case "range-max":
                        evalRangeMinMax(valRule, valAttribs[attribNames[i]]);
                        break;
                    case "": // omit
                        break;
                    default:
                        valRule[attrName] = valAttribs[attribNames[i]];
                        if (settings.debug) {
                            console.log("create-rules: default for attribute: " + attrName);
                        }
                        break;
                    }
                }

                return valRule;
            }

            function evalRemoteRule(rule, attrValue, attrName) {
                var remRule = rule["remote"] || new RemoteRule();

                switch (attrName) {
                    case "remote-url":
                        remRule.setUrl(attrValue);
                        break;

                    case "remote-additionalfields":
                        remRule.evalAdditionalData(attrValue);
                        break;

                    case "remote": // means the message text here
                        break;
                }

                rule["remote"] = remRule;
            }

            function evalRangeMinMax(rule, attrValue) {
                if (rule["range"] != null) {
                    var val0 = rule["range"][0];
                    var val1 = attrValue;

                    if (val0 < val1) {
                        rule["range"] = [val0, val1];
                    } else {
                        rule["range"] = [val1, val0];
                    }
                } else {
                    rule["range"] = [attrValue];
                }
            }

            function getValidationInputFields(formId) {
                var validationFields = [];

                var inputFields = getInputFieldsHavingId(formId);
                var valRules = getDataValidationRules(inputFields);

                if (settings.debug) {
                    console.log("inputFields/valRules");
                    console.log(inputFields);
                    console.log(valRules);
                }

                if (inputFields.length === 0)
                    return validationFields;

                if (valRules === null || valRules === undefined)
                    return validationFields;

                var valProps = Object.getOwnPropertyNames(valRules);
                for (var i = 0; i < inputFields.length; i++) {
                    var field = inputFields[i];
                    for (var j = 0; j < valProps.length; j++) {
                        //var regexTest = new RegExp("%_" + valProps[j] + "$"); regexTest.test([id])
                        if (field.getAttribute("id") === valProps[j]) {
                            validationFields.push({
                                _prop: valProps[j], // just for console output (field id)
                                input: field,
                                validation: valRules[valProps[j]]
                            });
                        }
                    }
                }

                return validationFields;
            }
            
            function getDataValidationRules(inputFields) {
                if (document.getElementById("data_validation_rules")) {
                    var dataRules = JSON.parse(document.getElementById("data_validation_rules").innerHTML);
                    if (settings.debug) {
                        console.log(dataRules);
                    }

                    return dataRules;
                }

                var dataValFields = filterElementsByAttributes(inputFields, "data-val");
                if (settings.debug) {
                    console.info("dataValFields");
                    console.log(dataValFields);
                }

                return dataValFields;
            }

            function getInputFieldsHavingId(formId) {
                var el = document.getElementById(formId).elements;
                var inputFields = [];
                for (var i = 0; i < el.length; i++) {
                    if (el[i].getAttribute("id")) {
                        inputFields.push(el[i]);
                    }
                }
                return inputFields;
            }

            function filterElementsByAttributes(formFields, attrStartsWidth) {
                var elDataVal = [];

                    //debugger;
                for (var i = 0; i < formFields.length; i++) {
                    var formFieldId = formFields[i].id;
                    var el = document.getElementById(formFieldId);
                    if (hasDataValAttributes(el, attrStartsWidth)) {
                        if (settings.debug) {
                            console.info("has data-val attribute input.name: " + el.name);
                            console.log(el);
                        }
                        elDataVal[formFieldId] = getDataValAttributes(el, attrStartsWidth);
                    }
                }

                return elDataVal;
            }

            function getDataValAttributes(formElement, attrStartsWidth) {
                var dataValAttribs = {};

                if (!formElement)
                    return dataValAttribs;

                for (var i = 0; i < formElement.attributes.length; i++) {
                    var attrName = "" + formElement.attributes[i].name;
                    if (attrName.indexOf(attrStartsWidth) !== 0)
                        continue;

                    dataValAttribs[attrName] = formElement.getAttribute(attrName);
                }

                return dataValAttribs;
            }

            function hasDataValAttributes(formElement, attrStartsWidth) {
                if (!formElement)
                    return false;

                for (var i = 0; i < formElement.attributes.length; i++) {
                    var attrName = "" + formElement.attributes[i].name;
                    if (attrName.indexOf(attrStartsWidth) === 0)
                        return true;
                }

                return false;
            }

            function registerDebugDomModification(jqForm) {
                jqForm.bind("DOMSubtreeModified",
                    function(evt) {
                        console.info("dom subtree modified of form " +
                            jqForm.attr("id") +
                            ", elements: " +
                            evt.currentTarget.elements.length);
                    });
            }

            return this;
        });
    };
}(jQuery));

function RemoteRule() {
    this.url = "";
    this.type = "post";
    this.data = { async: true };
    //this.success = function (jsonResult) {
    //    console.log("remote validation result: "+ jsonResult);
    //    return jsonResult === "true";
    //};
}

RemoteRule.prototype.setUrl = function protoSetUrl(urlString) {
    this.url = urlString;
}

RemoteRule.prototype.evalAdditionalData = function protoAddData(addDataDefinition) {
    var split = addDataDefinition.split(",");

    for (var i = 0; i < split.length; i++) {
        var idElement = split[i].substring(2);
        this[idElement] = true;
        this.data[idElement] = (function iifeData(idEl) {
            return function() {
                this.idEl4Value = idEl;
                //debugger;
                //console.log("remote-data of element-id: " + idEl4Value);
                return document.getElementById(idEl4Value).value;
            }
        })(idElement);
    }
}
