/*
 * a jQuery plugin to setup a HTML table as a master-detail table
 * {tbl} as a instance variable to update its contents by async calls
 */
(function($) {
    $.fn.setupMasterDetailTable = function (options) {
        var valTrCounter = 0;
        var keyTrCounter = "tr-counter";
        var keyTrDetailsClickRegistered = "tr-click-registered";
        var dataWorker = null;

        var settings = $.extend({
                debug: false,
                idForm: "#formData",
                idBtnCreate: "#btnCreate",
                idDetailItem: "#ItemId",
                actionGetDetails: "/Home/ShowDetails",
                actionReloadMaster: "/Home/Index",
                idMsgDialog: "#dialog",
                idPrefPlaceholderDetails: "placeholderDetails_",
                dataRowItemId: "row-item-id",
                includeDataWorker: true,
                scriptDataWorker: "/Scripts/_mdr_data_worker.js",
                dataWorkerOnError: function() {
                    console.error("dataWorker got an error");
                    console.log(arguments);
                },
                dataSourcePref: "dataSource_",
                actionOnFilterMasterData: {
                    idFilter: "#cmbFilterByCompany",
                    actionFilteredMaster: "/Home/GetFilteredData:filterByCompanies",
                    dataAction: "filter",
                    actionReloadMasterFilter: "/Home/GetMasterFilterData",
                    reloadMasterFilter: function(jsonResponse) { console.log("unhandled call of reloadMasterFilter"); }
                },
                getSelectionData: [
                    {
                        action: "/Company/GetSelectionData",
                        sourceMappings: [
                            { responseKey: "businessUnits", targetElement: "BusinessUnit" },
                            { responseKey: "systemEntities", targetElement: "SystemEntity" }
                        ]
                    }
                ],
                getOptionValuesOf: function(idTargetElement, jsonDataItem) {
                    console.log("Setup selection data finished. targetElement: " + idTargetElement);
                },
                detailFrameClickHandlerAssigned: function(containerId) {
                    console.info("set button handler in '" + containerId + "'");
                },
                actionOnDetailClick: {
                    controller: "/Company/",
                    options: { action: "ShowOptions", dialogTitle: "Related Departments" },
                    edit: "Edit",
                    cancel: "Cancel",
                    delete: "Delete",
                    save: "Save"
                },
                showPromptWithCallback: function(msgText, msgTitle, callback) {
                    showPrompt(msgText, msgTitle, callback);
                },
                showAlerts: function(jsonResult) {
                    console.info("option 'showAlerts' passed unhandled!");
                    console.log(jsonResult);
                }
            },
            options);

        var tbl = $(this);

        if (settings.idBtnCreate == null || $(settings.idBtnCreate).length === 0) {
            alert("Missing the create button to add new items.");
            return this;
        }

        console.info("plugin master-detail initializing with table '" + tbl.attr("id") + "'");

        initDataWorker();

        registerCreateButtonClick();

        setFilterOnChange();
        
        setTableRowCounter();

        setTableRowClickShowDetails();

        /**
         * to initialize and start loading values for comboboxes async on window.onload
         */
        function initDataWorker() {
            if (settings.includeDataWorker === undefined || !settings.includeDataWorker) {
                console.log("data worker excluded");
                return;
            }

            var sw = Date.now();
            console.log("start data loader:");

            dataWorker = new Worker(settings.scriptDataWorker);
            dataWorker.onmessage = function(event) {
                console.log("dataWorker response:");

                if (event.data.error != null) {
                    console.log(event);
                    return;
                }

                var dataSourcesLoaded = addOrUpdateDataSource(event.data);
                console.log("data sources loaded: " + dataSourcesLoaded);
            };

            console.log("init data loader done: " + (Date.now() - sw) + "ms");

            if (settings.getSelectionData == null)
                return;

            console.log("post selection properties:");
            for (var i = 0; i < settings.getSelectionData.length; i++) {
                var selectProps = settings.getSelectionData[i];
                //console.log(selectProps);// show selection properties
                dataWorker.postMessage(selectProps);
            }
        }

        /**
         * to save response of the data worker in a script tag locally
         * @param {any} eventData
         */
        function addOrUpdateDataSource(eventData) {
            var j = 0;
            for (; j < eventData.sourceMappings.length; j++) {
                var srcMapping = eventData.sourceMappings[j];
                //console.log(evtData.results[srcMapping.responseKey]);//JSON data

                // TODO create or update script tag
                var idDataSource = settings.dataSourcePref + srcMapping.targetElement;
                var scriptTagOfResponseData = document.getElementById(srcMapping.targetElement);
                var replaceOrAppend = 0;

                if (scriptTagOfResponseData == null) {
                    replaceOrAppend = 1;
                    scriptTagOfResponseData = document.createElement("script");
                    scriptTagOfResponseData.type = "application/json";
                    scriptTagOfResponseData.setAttribute("id", idDataSource);
                    scriptTagOfResponseData.setAttribute("data-target", srcMapping.targetElement);
                }

                var head = document.getElementsByTagName("head")[0];
                // TODO error handling
                scriptTagOfResponseData.text = JSON.stringify(eventData.results[srcMapping.responseKey]);

                if (replaceOrAppend) {
                    head.appendChild(scriptTagOfResponseData);
                }
            }

            return j;
        }

        /**
         * evaluate configured filter settings of master data
         */
        function setFilterOnChange() {
            if (settings.actionOnFilterMasterData === undefined || settings.actionOnFilterMasterData === null) {
                console.log("no action to filter master data specified");
                return;
            }

            var idFilter = settings.actionOnFilterMasterData.idFilter;

            if (idFilter === undefined || idFilter === null) {
                console.log("no filter for master data specified");
                return;
            }

            var cmbFilter = $(idFilter);

            if (cmbFilter.length === 0) {
                console.warn("no filter found by given id: " + idFilter);
                return;
            }

            cmbFilter.on("change", function() { onFilterMasterData(this); });
        }

        /**
         * to evolve selected filter values and to trigger reload of 
         * @param {any} cmb
         */
        function onFilterMasterData(cmb) {
            if (settings.debug) {
                console.info("found filter of type: " + typeof cmb);
            }

            var opt, filterValues = [];

            for (var i = 0; i < cmb.options.length; i++) {
                opt = cmb.options[i];
                if (opt.selected) {
                    filterValues.push(parseInt(opt.value));
                }
            };

            var placeholderSelector = "#" + tbl.attr("id") + " > tbody";
            var actFilteredMaster = settings.actionOnFilterMasterData.actionFilteredMaster;
            var dataAction = settings.actionOnFilterMasterData.DataAction || "filter";

            if (settings.debug) {
                console.log("trigger filter master data of placeholder: " +
                    placeholderSelector +
                    ", action: " +
                    actFilteredMaster +
                    ", dataAction: " +
                    dataAction);
            }

            var actionMethod = actFilteredMaster.split(":"); // expecting "/controller/action:argument-name"
            var requestData = {};
            requestData[actionMethod[1]] = filterValues;

            // call even if filterValues is empty
            reloadMasterView(placeholderSelector, dataAction, null, actionMethod[0], requestData);
        }

        function registerCreateButtonClick() {
            var btnCreate = $(settings.idBtnCreate);

            btnCreate.on("click",
                function (event) {
                    event.stopPropagation();
                    btnCreate.button("loading");

                    // NOTE break if a new row is still shown
                    if (tbl.find(".row-new").length > 0) {
                        console.info(
                            "a table row with class '.row-new' is still open, so prevent from adding a new one");
                        btnCreate.button("reset");

                        // function call by convention
                        if (typeof window.focusFirstElement === "function") {
                            window.focusFirstElement();
                        }
                        return;
                    }

                    // fade-out any details view
                    $(".row-details").each(function() {
                        var trRow = $(this); // TODO to an IFEE
                        trRow.children("td").children("div")
                            .slideUp("slow", "swing", function() { trRow.remove(); });
                        //$(this).fadeOut(400, function() { $(this).remove() });
                    });

                    var idPlaceholderDetails = prependToDetailsRow("new");

                    // baseItemId by convention (introduced with Mdr.bankDetailDocuments)
                    var baseItemId = tbl[0].dataset.identityBase || 0;

                    loadDetailsView(idPlaceholderDetails, baseItemId, "new"); // with prepend to details row
                });
        }

        /**
         * register a click handler for all table rows to show the details view
         */
        function setTableRowClickShowDetails() {
            tbl.find("tbody > tr").each(function () {
                $(this).css("cursor", "pointer");
                var rowItemId = $(this).data(settings.dataRowItemId);

                if (rowItemId != undefined) {
                    if ($(this).data(keyTrDetailsClickRegistered) != undefined)
                        return;

                    $(this).on("click",
                        function() {
                            $(".row-details,.row-new").each(function() {
                                var thisId = $(this).attr("id");
                                if (thisId != undefined && thisId !== "" && thisId.match("_" + rowItemId + "$"))
                                    return;

                                var trRow = $(this);
                                trRow.children("td").children("div")
                                    .slideUp("slow", "swing", function() { trRow.remove(); });

                                //$(this).fadeOut(400, function () {
                                //    var trRow = $(this);
                                //    trRow.children("td").children("div").slideUp();
                                //    trRow.remove();
                                //});
                            });

                            var idPlaceholderDetails = appendDetailsRow($(this).attr("id"), rowItemId, "details");

                            loadDetailsView(idPlaceholderDetails, rowItemId, "details"); // with replace loader div
                            return false; // to prevent default action
                        });

                    //to prevent from registering multiple times
                    $(this).data(keyTrDetailsClickRegistered, 1);
                }
            });
        }

        /**
         * to numerate all rows of the table-body to be able to insert the details-view
         */
        function setTableRowCounter() {
            valTrCounter = 0;
            tbl.find("tbody > tr").each(function () {
                $(this).data(keyTrCounter, valTrCounter++);
                //console.log("detail-row: "+$(this).data(keyTrCounter));
            });
        }

        /**
         * append a table row as a placeholder to load the details/edit view into
         * @param {string} trId
         * @param {int} itemId
         * @param {string} mode
         * @returns object {jIdPlaceholder:,timeoutObj:} timeoutObj to clear timeout
         */
        function appendDetailsRow(trId, itemId, mode) {
            var colSpan = getColSpan();

            var idPlaceholderDetails = trId + "_" + itemId;
            var jIdPlaceholderDetails = "#" + idPlaceholderDetails;
            var sd = showDetailsLoaderByTimeout(idPlaceholderDetails, itemId);

            if (document.getElementById(idPlaceholderDetails) !== null) {
                return decorateWithLoaderTimeout(sd, jIdPlaceholderDetails);
            }

            // insert tr as a placeholder for the new details view
            $("#" + trId)
                .after("<tr class='row-" + mode + "' id='Details_" + itemId +
                "' data-placeholder-details='#" + idPlaceholderDetails +
                "'><td colspan='" + colSpan +
                "' style='margin:0px; padding:0px; height:0px;'><div id='" + idPlaceholderDetails +
                "' class='placeholder-details-hidden'></div></td></tr>")
                .slideDown("slow", "swing");

            setTableRowCounter();

            return decorateWithLoaderTimeout(sd, jIdPlaceholderDetails);
        }

        /**
         * IIFE means an immediately invoked function expression
         * @param {object<div>} detailsLoader
         * @param {string} jIdPlaceholder
         */
        function decorateWithLoaderTimeout(detailsLoader, jIdPlaceholder) {
            return {
                idPlaceholder: jIdPlaceholder,
                loaderTimer: (function iifeToClearTimeout(timeoutId) {
                    this.timeoutId = timeoutId;

                    return {
                        stop: function iifeStop() {
                            window.clearTimeout(timeoutId);
                        }
                    };
                })(detailsLoader.show())
            };
        }

        function showDetailsLoaderByTimeout(idPlaceholderDetails, itemId) {
            return (function iifeShowLoader(placeholder, item) {
                this.idPlaceholder = placeholder;
                this.itemId = item;

                function showLoader() {
                    var elPlaceholderDetails = document.getElementById(idPlaceholderDetails);
                    if (elPlaceholderDetails !== undefined && elPlaceholderDetails !== null) {
                        elPlaceholderDetails.innerHTML = "<div id='" +
                            idPlaceholder +
                            "_loading' class='description' style='font-size:16px'>loading details view ... (item: " +
                            itemId +
                            ")";
                    }
                }

                return {
                    show: function() { return window.setTimeout(function() { showLoader(); }, 300) }
                };
            })(idPlaceholderDetails, itemId);
        }

        /**
         * add a table row at the beginning of the body of the table to create a new item
         * @param {string} mode
         */
        function prependToDetailsRow(mode) {
            var colSpan = getColSpan();

            console.log("colspan: " + colSpan);

            var idPlaceholderDetails = settings.idPrefPlaceholderDetails + (valTrCounter + 1);
            var sd = showDetailsLoaderByTimeout(idPlaceholderDetails, -1); // -1: just a dummy value

            // insert tr as a placeholder for the new details view
            $("<tr class='row-" + mode + "'><td colspan='" + colSpan +
                "' style='margin:0px; padding:0px; height:0px;'><div id='" + idPlaceholderDetails +
                "' class='placeholder-details-hidden'></div></td></tr>").prependTo(tbl.find("tbody"));

            setTableRowCounter();

            return decorateWithLoaderTimeout(sd, "#" + idPlaceholderDetails);
        }

        /**
         * to create a table row that spans over all columns
         */
        function getColSpan() {
            "use strict";
            var colSpan = -1;
            tbl.find("tbody > tr").each(function() {
                colSpan = this.cells.length > colSpan ? this.cells.length : colSpan;
            });

            if (colSpan < 0) {
                tbl.find("thead > tr").each(function() {
                    colSpan = this.cells.length > colSpan ? this.cells.length : colSpan;
                });
            }

            return colSpan;
        }

        function showDialog(response, dlgTitle, usePlainHtmlFromResponse) {
            if ($(settings.idMsgDialog).length === 0)
                return;

            try {
                if (usePlainHtmlFromResponse) {
                    console.log("typeof response: " + typeof response);
                    var responseHtml = response.responseText;
                    if (responseHtml === undefined) {
                        responseHtml = response;
                    }

                    $(settings.idMsgDialog)
                        .html(responseHtml)
                        .dialog({
                            title: dlgTitle || "Request Error"
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
                $(settings.idMsgDialog)
                    .html(bodyHtml)
                    .dialog({
                        title: dlgTitle || "Request Error"
                    })
                    .dialog("open");
            } catch (err) {
                console.error(err);
            }
        }

        function reloadMasterView(placeholderSelector, dataAction, dataType, actionFilterMaster, filterData) {
            $.ajax({
                type: "POST",
                url: actionFilterMaster || settings.actionReloadMaster,
                headers: { 'X-Requested-With': "XMLHttpRequest" },
                dataType: dataType || "html",
                data: filterData, //jQuery.parseJSON('{"itemId": "' + detailItemId + '", "mode": "' + viewMode + '"}'),
                cache: false,
                success: function (result) {
                    $(placeholderSelector)
                        .slideUp("fast",
                            "swing",
                            function() {
                                $(this).html(result).fadeIn("slow"); //.slideDown("slow", "swing");

                                console.log("master view loaded, selector: " +
                                    placeholderSelector + ", dataType: " + dataType);

                                setTableRowCounter();

                                setTableRowClickShowDetails();
                            });
                },
                error: function (response, state, errMsg) {
                    //debugger;
                    console.error("on loading master view, selector: " +
                        placeholderSelector + ", dataType: " + dataType);
                    if (settings.debug) {
                        console.log(arguments);
                    }

                    showDialog(response);
                },
                complete: function () {
                    console.log("reload master view complete, selector: " +
                        placeholderSelector + ", dataType: " + dataType);
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        }

        /**
         * 
         * @param {any} dataType default: json
         */
        function reloadMasterFilter(updateByResult) {
            if (settings.actionOnFilterMasterData === undefined ||
                settings.actionOnFilterMasterData.reloadMasterFilter === undefined) {
                return;
            }

            if (updateByResult !== null && typeof updateByResult === "object") {
                if (typeof settings.actionOnFilterMasterData.reloadMasterFilter !== "function") {
                    console.warn("missing function to reload master filter (see declaration of 'settings.actionOnFilterMasterData.reloadMasterFilter')");
                    return;
                }

                try {
                    settings.actionOnFilterMasterData.reloadMasterFilter(updateByResult);
                } catch (err) {
                    console.error("on invoke reloadMasterFilter for update");
                    console.log(err);
                }
                return;
            }

            var urlAction = settings.actionOnFilterMasterData.actionReloadMasterFilter;

            $.ajax({
                type: "POST",
                url: urlAction,
                headers: { 'X-Requested-With': "XMLHttpRequest" },
                dataType: "json",
                cache: false,
                success: function(result) {
                    console.info("reload master filter");
                    if (settings.debug) {
                        console.log(result);
                    }

                    reloadMasterFilter(result);
                },
                error: function(response, state, errMsg) {
                    //debugger;
                    console.error("on reloading master filter by calling action: " + urlAction);
                    if (settings.debug) {
                        console.log(arguments);
                    }

                    try {
                        switch (response.status) {
                        case 200:
                            showDialog(formatError(urlAction, response.responseText, state, errMsg), null, true);
                            break;
                        case 404:
                        default:
                            showDialog(response);
                            break;
                        }
                    } catch (errShow) {
                        console.error("on show error dialog");
                        console.log(errShow);
                    }
                },
                complete: function() {
                    console.log("reload master filter completed");
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        }

        function formatError(urlAction, response, state, errMsg) {

            var errUrl = "<div class='error-url'>request url: "+ urlAction +"</div>";
            var errState = "<div class='error-state'>state: "+ state +"</div>";
            var errMessage = "<div class='error-msg'>error message: "+ errMsg +"</div>";
            var errResponse = "<div class='error-response'>"+ response +"</div>";

            return {
                responseText: "<div class='error-box'>" + errUrl + errState + errMessage + errResponse + "</div>"
            };
        }

        /**
         * 
         * @param {object} optSettings {action:'/controller/action', data:{}, idEventSource:'#btnId', responseDataType:'html')
         * @param {any} formData
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
                    showDialog(response, optSettings.dialogTitle, true);
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

        /**
         * 
         * @param {object} idPlaceholderDetails object: {idPlaceholder:'#divId', onComplete:function}
         * @param {number} detailItemId
         * @param {string} viewMode
         * @param {string} dataType
         * @param {function} onComplete to clearTimeout
         */
        function loadDetailsView(idPlaceholderDetails, detailItemId, viewMode, dataType) {
            var actionMethod = "POST";
            var actionGetDetails = settings.actionGetDetails;

            if(actionGetDetails.indexOf(":")!= -1){
                // expected e.g.: 'GET:/Home/GetDetails'
                var actionSplit = actionGetDetails.split(":");
                actionMethod = actionSplit[0];
                actionGetDetails = actionSplit[1];
            }

            $.ajax({
                type: actionMethod,
                evalScripts:true,
                url: actionGetDetails,
                headers: { 'X-Requested-With': "XMLHttpRequest" },
                dataType: dataType || "html",
                data: jQuery.parseJSON('{"itemId": "' + detailItemId + '", "mode": "' + viewMode + '"}'),
                cache: false,
                success: function (result) {
                    if (idPlaceholderDetails.loaderTimer !== undefined && idPlaceholderDetails.loaderTimer !== null) {
                        idPlaceholderDetails.loaderTimer.stop();
                    }
                    $(idPlaceholderDetails.idPlaceholder)
                        .slideUp("fast",
                            "swing",
                            function() {
                                var plc = $(this);
                                plc.addClass("placeholder-details-visible")
                                    .removeClass("placeholder-details-hidden")
                                    .html(result)
                                    .fadeIn("slow"); //.slideDown("slow", "swing");

                                if (settings.debug) {
                                    console.log("details view loaded, viewMode: " + viewMode);
                                }

                                viewMode = viewMode != undefined ? viewMode.toLowerCase() : viewMode;

                                switch (viewMode) {
                                case "edit":
                                case "new":
                                    assignSelectionDataInternal();
                                //break; // fall-through is intended
                                case "details":
                                    registerDetailFrameClickHandler(plc.attr("id"));
                                    settings.detailFrameClickHandlerAssigned(plc.attr("id"));
                                    break;
                                }
                            });
                },
                error: function(response, state, errMsg) {
                    //debugger;
                    console.error("error loading details view");
                    console.log(arguments);

                    // NOTE show error details and a cancel button
                    $(idPlaceholderDetails.idPlaceholder)
                        .fadeOut(400,
                            function() {
                                $(this).html("sorry an error occurred: Details " + errMsg)
                                    .fadeIn(400);
                            });

                    showDialog(response);
                },
                complete: function() {
                    if (idPlaceholderDetails.loaderTimer !== undefined && idPlaceholderDetails.loaderTimer !== null) {
                        idPlaceholderDetails.loaderTimer.stop();
                    }
                    setTimeout(function() {
                            $(settings.idBtnCreate).button("reset"); // reset always
                        },
                        250);
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        }

        /**
         * iterate the given container to decorate a-tags having 'data-action-detail'
         * @param {string} containerId parent container of the detail frame view
         */
        function registerDetailFrameClickHandler(containerId) {
            //debugger;
            $("#" + containerId)
                .find("a")
                .each(function() {
                    console.clear();

                    var btn = $(this);

                    var dataAction = btn.attr("data-action-detail");
                    if (dataAction == undefined)
                        return;

                    btn.click(function() {
                        if (settings.debug) {
                            console.info("on click action-detail with data action: " + dataAction);
                        }
                        var btnClick = $(this);
                        var jDomIdBtn = "#" + btnClick.attr("id");
                        btnClick.button("submit...");

                        try {
                            onDetailFrameClick(dataAction, jDomIdBtn);
                        } catch (err) {
                            console.error("on click action-detail with data action: " +
                                dataAction +
                                "; err: " +
                                err.message);
                            console.log(err);
                        } finally {
                            btnClick.button("reset");
                        }

                        return false;
                    });
                });
        }

        /**
         * 
         */
        function assignSelectionDataInternal() {
            if (typeof settings.getOptionValuesOf !== "function") {
                console.error("missing configuration of function 'getOptionValuesOf'");
                return;
            }

            if (settings.getSelectionData == undefined) {
                console.error("missing settings of 'getSelectionData'");
                return;
            }

            for (var i = 0; i < settings.getSelectionData.length; i++) {
                var selectionDataCfg = settings.getSelectionData[i];

                for (var j = 0; j < selectionDataCfg.sourceMappings.length; j++) {
                    var srcMapping = selectionDataCfg.sourceMappings[j];
                    var idDataSource = settings.dataSourcePref + srcMapping.targetElement;
                    var idTargetElement = srcMapping.targetElement;

                    // TODO handle exceptions
                    assignOptionsFromSelectionData(idDataSource, idTargetElement);
                }
            }
        }

        /**
         * apply a mapping from data source to the target element
         * @param {string} idDataSource
         * @param {string} idTargetElement
         */
        function assignOptionsFromSelectionData(idDataSource, idTargetElement) {
            if (settings.debug) {
                console.log("assign selection data from source: " +
                    idDataSource + " to targetElement: " + idTargetElement);
            }

            if (document.getElementById(idDataSource) == undefined) {
                console.error("missing data source element by id: " + idDataSource);
                return;
            }

            var te = document.getElementById(idTargetElement);
            if (te == undefined) {
                console.error("missing target element by id: " + idTargetElement);
                return;
            }

            var preselectedValue = te.getAttribute("data-selected-value");
            te.innerHTML = ""; // clear first
            var opt = document.createElement("option");
            opt.value = "-1";
            opt.innerHTML = "please select...";
            te.appendChild(opt);

            var jsonData = JSON.parse(document.getElementById(idDataSource).innerHTML);

            //debugger;
            for (var i = 0; i < jsonData.length; i++) {
                var item = jsonData[i];
                opt = document.createElement("option");
                te.appendChild(opt);

                try {
                    // expecting value:text, caption:text, selected:boolean
                    var optionValues = settings.getOptionValuesOf(idTargetElement, item, preselectedValue);

                    opt.value = optionValues.value;
                    opt.innerHTML = optionValues.caption;
                    opt.selected = optionValues.selected;
                } catch (err) {
                    console.error("option generator failed with target element: " + idTargetElement + "; ERR: " + err);
                    opt.value = "-1";
                    opt.innerHTML = "ERR: " + err.message;
                }
            }
        }

        /**
         * 
         * @param {any} command success, info, warning, error
         * @param {any} message
         */
        function delegateShowAlert(command, message) {
            delegateShowAlerts({ "_Alerts": [{ Command: command, Message: message }] });
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
            var msgs = [];
            for (var i = 0; i < messages.length; i++) {
                msgs.push({
                    Command: command,
                    Message: messages[i]
                });
            }

            return msgs;
        }

        function callFunctionCatching(fncTarget, fncTargetArgs) {
            try {
                fncTarget(fncTargetArgs);
            } catch (e) {
                console.error("on call function with error message: " + e.Message);
            } 
        }

        function onDetailFrameClickOptions(dataAction, formData, jDomIdBtn) {
            if ("function" === typeof settings.actionOnDetailClick.options) {
                callFunctionCatching(settings.actionOnDetailClick.options, formData);
            } else if ("object" === typeof settings.actionOnDetailClick.options) {
                console.info("detail frame click with data-action: " + dataAction + ". supplied an object");

                if (settings.debug) {
                    console.log(settings.actionOnDetailClick.options);
                    console.log(formData);
                }

                loadOptionsView({
                    action: settings.actionOnDetailClick.controller + settings.actionOnDetailClick.options.action,
                    data: formData,
                    idEventSource: jDomIdBtn,
                    dialogTitle: settings.actionOnDetailClick.options.dialogTitle
                });
            } else {
                console.warn("detail frame click unhandled with data-action: " +
                    dataAction +
                    ". expecting a function but got: " +
                    (typeof settings.actionOnDetailClick.options) +
                    " = " +
                    settings.actionOnDetailClick.options);
            }
        }

        /**
         * default implementation of currently defined detail frame click handler
         * @param {object} dataAction
         * @param {string} jDomIdBtn to reset after POST
         */
        function onDetailFrameClick(dataAction, jDomIdBtn) {
            var actionMode = $(jDomIdBtn).data("action-mode");

            if (settings.debug) {
                console.log("on click detail: " + dataAction + ", source-button: " + jDomIdBtn +
                    "; action-mode:" + actionMode + "; controller: " + settings.actionOnDetailClick.controller);
            }

            switch (dataAction) {
            case "item-options":
                var optionsItemObj = getFormDataAsJson({
                    mode: "options"
                });

                // NOTE call external function
                onDetailFrameClickOptions(dataAction, optionsItemObj, jDomIdBtn);
                break;

            case "item-change":
                // NOTE load and prepend detail view
                var selectedItemObj = getFormDataAsJson({
                    mode: settings.actionOnDetailClick.edit
                });

                // get the current placeholder id to replace with the new content
                var idPlaceholderDetails = {
                    idPlaceholder: $("#Details_" + selectedItemObj.ItemId).data("placeholder-details"),
                    onComplete: null
                };

                loadDetailsView(idPlaceholderDetails, selectedItemObj.ItemId, selectedItemObj.mode); // no loader div
                break;

            case "item-cancel":
            case "item-close":
                onClickCloseDetailViewByActionMode(actionMode);
                break;

            case "item-delete":
                if (settings.showPromptWithCallback("The current item will be deleted permanently!",
                    "Delete Confirmation",
                    function(result) {
                        if (result == undefined || !result)
                            return;

                        var deleteItemObj = getFormDataAsJson({
                            DataAction: settings.actionOnDetailClick.delete
                        });

                        submitItemData(deleteItemObj);
                    }));
                break;

            case "item-save":
                var formValid = $(settings.idForm).valid();
                console.info("input form valid: " + formValid);

                if (!formValid) {
                    // NOTE show a proper toastr message
                    delegateShowAlert("warning", "Please, validate the form data again!");
                    break;
                }

                // TODO check for custom function registration, e.g. to handle file data
                var saveItemObj = getFormDataAsJson({
                    DataAction: settings.actionOnDetailClick.save
                });

                submitItemData(saveItemObj);
                break;

            default:
                console.error("handler of data-action-detail '" + dataAction + "' not supported yet.");
                break;
            }
        }

        /**
         * 
         * @param {any} actionMode
         */
        function onClickCloseDetailViewByActionMode(actionMode) {
            var jQuerySelector = "";

            actionMode = actionMode != undefined ? actionMode.toLowerCase() : actionMode;

            switch (actionMode) {
            case "new":
                jQuerySelector = ".row-new";
                break;
            case "delete":
            case "save": // to close after saved successfully
            case "edit": // keep .row-details with the new content
            case "details":
                jQuerySelector = ".row-details";
                break;

            default:
                console.warn("Cancel on action-mode: " + actionMode + " is not provided yet or not intended!");
                return;
            }

            var elements = $(jQuerySelector);
            elements
                .children("td")
                .children("div")
                .slideUp("slow", "swing", function() { elements.remove(); });
        }

        /**
         * 
         */
        function getFormDataAsJson(addOptions) {
            var formInputElements = $(settings.idForm).serializeArray();

            var itemFormData = addOptions != undefined ? addOptions : {};

            if (formInputElements.length === 0) {
                console.info("no elements found by 'settings.idForm': " + settings.idForm);

                // NOTE by convention: the item id of an existing item (e.g. to change or delete)
                var itemId = $(settings.idDetailItem);
                //debugger;
                var itemIdValue = itemId.length > 0 ? itemId.val() : undefined;
                // to be able to update a specific item
                itemFormData.ItemId = itemIdValue != undefined ? itemIdValue : -1;

                return itemFormData;
            }

            formInputElements.forEach(function(item, index) {
                itemFormData[item.name] = item.value;

                // NOTE use a lookup table to parseInt specificly
                // props.hasOwnProperty(el.name) ? parseInt(el.value) : el.value;
                //if (typeof el.value === "object" || isNaN(el.value)) {
                //    itemFormData[el.name] = el.value;
                //} else {
                //    itemFormData[el.name] = parseInt(el.value, 10);
                //}
            });

            return itemFormData;
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
                return;

            if (jsonObj["result"]) {
                // successfully
                console.info("handleJsonResultDetail " + jsonObj["mode"]);
                onClickCloseDetailViewByActionMode(jsonObj["mode"]);

                var replaceSelector = "#" + tbl.attr("id") + " > tbody";
                reloadMasterView(replaceSelector, jsonObj["mode"], null, null, null);
                reloadMasterFilter();
                //start reload data
            } else {
                // TODO
                console.error("handleJsonResultDetail " + jsonObj["mode"]);
                delegateShowErrors(jsonObj);
            }

            console.log(jsonObj);
        }

        /**
         * *
         * @param {any} itemObj data to be transmitted
         * @param {any} targetAction target controller and action URL
         */
        function submitItemData(itemObj, targetAction, dataType, ajaxAsync) {
            $.ajax({
                async: ajaxAsync == undefined ? false : true,
                type: "POST",
                url: targetAction || settings.actionOnDetailClick.controller + itemObj.DataAction,
                headers: { 'X-Requested-With': "XMLHttpRequest" }, // to detect this as an AJAX call on controller side
                dataType: dataType != undefined ? dataType : "json",
                data: itemObj,
                cache: false,
                //contentType: "application/json; charset=utf-8",
                success: function (result) {
                    handleJsonResultDetail(result);
                },
                error: function (response, state, errMsg) {
                    //debugger;
                    console.error("error on submit item data, action:" + targetAction +"; state: "+ state +"; errMsg:"+ errMsg);
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
                    }
                    catch (err){
                        console.error(err);
                    }
                },
                crossDomain: true,
                xhrFields: {
                    withCredentials: true
                }
            });
        }

        return this;
    }
}(jQuery));