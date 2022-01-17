

[Anpassungen in]
fnc: registerDetailFrameClickHandler (jquery variable)
fnc: onDetailFrameClick (case für )
fnc: loadDetailView 'GET:/...'


[Dokumentation]
fnc: registerDetailFrameClickHandler
    Prüfung auf Attribut "data-action-detail"
    wird an fnc: onDetailFrameClick übergeben

fnc: onDetailFrameClick
    Abfrage des Attributs "action-mode", Weitergabe bei "cancel" und "close"
    Argument "dataAction" wird via switch-case ausgewertet
    wenn nicht vorhanden (case-default), dann Abbruch mit console.error(dataAction)

    case-default als extenion-point für intercepter implementieren

fnc: detailFrameClickHandlerAssigned(id-of-the-placeholder)
    kann dazu verwendet werden, um nachgelagerte funktionen aufzurufen (wizard-navigation)
    bspw. Bindung von viewspezifischen Click-Events via 'click: function.bind(param1, param2)