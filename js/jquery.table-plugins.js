/*
 * a jQuery plugin to setup a HTML table for click events of each row<br/>
 * see usage in view Mdr/Home/ListWaitingRequests
 * <ul>
 * <li>onClickTableRow: is using HTML data-target-action to set window.location.href with data-record-id appended</li>
 * </ul>
 */
(function ($) {
    $.fn.setupTable = function(options) {
        var pluginSettings = $.extend({}, $.fn.setupTable.defaults, options); // keep defaults
        //var pluginSettings = $.extend($.fn.setupTable.defaults, options);//override defaults globally

        // init html table var
        return this.each(function() {
            registerRowClickHandler($(this), pluginSettings);
        });
    }

    $.fn.reloadBody = function(options) {
        var settings = $.exend({

            data: {}//submit for selection at server side
        }, $.fn.setupTable.defaults, options);

        return this.each(function() {
            performReloadData($(this), settings);
        });
    }

    // set default settings globally
    $.fn.setupTable.defaults = {
        idMsgDialog: "#dialog",
        dataRowItemId: "record-id",
        dataTargetAction: "target-action",
        dataReloadAction: "reload-action",
        keyTrDetailsClickRegistered: "tr-click-registered",
        showAlerts: function(jsonResult) {
            console.info("option 'showAlerts' passed unhandled!");
            console.log(jsonResult);
        }
    };

    /**
     * register a click handler for all table rows to show the details view
     */
    function registerRowClickHandler(tbl, settings) {
        tbl.find("tbody > tr").each(function() {
            $(this).css("cursor", "pointer");

            var targetAction = tbl.data(settings.dataTargetAction);
            var rowItemId = $(this).data(settings.dataRowItemId);

            if (rowItemId != undefined) {
                if ($(this).data(settings.keyTrDetailsClickRegistered) != undefined)
                    return;

                $(this).on("click", 
                    function (event) {
                        event.stopPropagation();
                        $.fn.setupTable.onClickTableRow(rowItemId, targetAction);
                        return false; // to prevent default action
                    });

                //to prevent from registering multiple times
                $(this).data(settings.keyTrDetailsClickRegistered, 1);
            }
        });

        return this;
    }

    /**
     * 
     */
    function performReloadData(tbl, settings) {
            $.ajax({
                type: "POST",
                url: settings.dataReloadAction,
                headers: { 'X-Requested-With': "XMLHttpRequest" },
                dataType: dataType || "html",
                data: settings.data,
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


    // to offer an extension point to override
    $.fn.setupTable.onClickTableRow = function (rowItemId, targetAction) {
        var hrefTarget = (targetAction || window.location.href) + "/" + rowItemId;
        console.log("change location.href with rowItemId: " + rowItemId + "; hrefTarget: " + hrefTarget);
        window.location.href = hrefTarget;
    }

})(jQuery);
