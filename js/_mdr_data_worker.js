/**
 * to get selection data in background while loading a detail view or when being on startup or something
 * post back object (action, sourceMappings, results)
 * @param {} event use event.data expecting a JSON object with the following properites: action (url), sourceMappings (array of string)
 * @returns {} 
 */
onmessage = function(event) {
    console.log("dataWorker called:");
    console.log(event.data != null ? JSON.stringify(event.data) : "event.data: null");

    var xhr = new XMLHttpRequest();

    xhr.onload = function() {
        console.log("xhr.onloaded status:" + xhr.status + "; responseType:" + xhr.responseType + "; readyState:" + xhr.readyState);
        //console.log(xhr.response);

        var results = null;
        var error = null;

        switch (xhr.status) {
            case 200:
                results = JSON.parse(xhr.response);
            break;

            default:
        debugger;
                error = xhr.response;
            break;
        }

        postMessage({
            action: event.data.action,
            sourceMappings: event.data.sourceMappings,
            results: results,
            error: error,
            status: xhr.status
        });
    };
    xhr.onerror = function() {
        console.log("xhr.onerror:");

        postMessage({
            action: event.data.action,
            sourceMappings: event.data.sourceMappings,
            results: {},
            error: xhr.response
        });
    };
    xhr.onprogress = function(evtProgress) {
        console.log("data loaded: " + evtProgress.loaded + "/" + evtProgress.total);
    };

    xhr.open("GET", event.data.action, true);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.withCredentials = true;
    //xhr.responseType = "json"; // has no effect

    xhr.send(null); // null data to send
}
