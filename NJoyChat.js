// ==UserScript==
// @name         NJoyChat
// @namespace    https://www.joyclub.de/chat/login/
// @version      Alpha-v2
// @downloadURL  https://raw.githubusercontent.com/NJoyChat/NJoyChat/master/NJoyChat.js
// @updateURL    https://raw.githubusercontent.com/NJoyChat/NJoyChat/master/NJoyChat.js
// @description  Improves JoyChat with additional utilities.
// @author       NJoyChat Team
// @match        https://www.joyclub.de/chat/login/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.getValue
// @grant        GM.setValue
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @run-at       document-idle
// ==/UserScript==

class TextMacro {
    constructor(macro_id, name, macro_text) {
        this.macro_id = macro_id
        this.name = name
        this.macro_text = macro_text
    }
}

class TextAutoGreeting {
    constructor(auto_greeting_id, name, auto_greeting_text) {
        this.auto_greeting_id = auto_greeting_id
        this.id = auto_greeting_id
        this.name = name
        this.auto_greeting_text = auto_greeting_text
    }
}

(function () {
    'use strict';


    let font_array = '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃'
    let njoy_emojis = new Map([['#test#', 'https://forumstatic.oneplusmobile.com/opforum-gl/upload/image/app/thread/20230204/2780603194562714301/1258923422265114625/1258923422265114625.gif']])
    let giphy_url = "https://giphy.com/gifs/"
    let IMAGE_MAX_WIDTH = 250
    let IMAGE_MAX_HEIGHT = 250
    let macros = load_text_macros()
    let auto_greetings = load_auto_greetings()
    let observed_chat_outputs = []
    let users = new Map()

    waitForKeyElements(".toolbar", start_running)
    waitForKeyElements("ul.userlist:nth-child(3)", watch_user_list_for_change)
    waitForKeyElements(".joychat_output", watch_chat_output_for_change)

    //start_running()

    function start_running() {
        console.log('Test. Ich weiß, was ich tue, und das hier ist in keinster Art und Weise bösartig. Bitte kontaktieren Sie mich, falls meine Aktivitäten zu Problemen führen.')
        let toolbar = document.querySelectorAll('.toolbar')[0]
        if (toolbar !== null) {
            create_container_divs()
            create_function_buttons()
            create_macro_admin_buttons()
            create_auto_greeting_admin_buttons()
        }
    }

    function create_container_divs() {
        let parent_container = document.createElement('div')
        parent_container.id = "njoy_parent_container"
        let function_buttons_container = document.createElement('div')
        function_buttons_container.id = "njoy_function_buttons_container"
        let macro_admin_buttons_container = document.createElement('div')
        macro_admin_buttons_container.id = "njoy_macro_admin_buttons_container"
        macro_admin_buttons_container.hidden = true
        let macro_buttons_container = document.createElement('div')
        macro_buttons_container.id = "njoy_macro_buttons_container"
        let auto_greet_admin_buttons_container = document.createElement('div')
        auto_greet_admin_buttons_container.id = "njoy_auto_greet_admin_buttons_container"
        auto_greet_admin_buttons_container.hidden = true
        let auto_greet_buttons_container = document.createElement('div')
        auto_greet_buttons_container.id = "njoy_auto_greet_buttons_container"
        auto_greet_buttons_container.hidden = true

        parent_container.appendChild(function_buttons_container)
        parent_container.appendChild(macro_admin_buttons_container)
        parent_container.appendChild(macro_buttons_container)
        parent_container.appendChild(auto_greet_admin_buttons_container)
        parent_container.appendChild(auto_greet_buttons_container)
        let toolbar = document.querySelectorAll('.toolbar')[0]
        if (toolbar !== null) {
            toolbar.after(parent_container)
        }
    }

    function create_macro_buttons() {
        for (const macro of macros.keys()) {
            if (document.getElementById("njoy_macro_buttons_container") !== undefined && document.getElementById("njoy_macro_buttons_container") !== null) {
                document.getElementById("njoy_macro_buttons_container").appendChild(add_button(macros.get(macro), false))
            }
        }
    }

    function create_auto_greeting_admin_buttons() {
        let auto_greeting_save_button = new TextAutoGreeting(-1, "Save", undefined)
        let auto_greeting_load_button = new TextAutoGreeting(-2, "Load", undefined)
        let auto_greeting_delete_button = new TextAutoGreeting(-3, "Delete", undefined)
        let auto_greeting_name_input = document.createElement('input')
        auto_greeting_name_input.id = "auto_greeting_name_input"
        let save_button = add_button(auto_greeting_save_button, true)
        let load_button = add_button(auto_greeting_load_button, false)
        let delete_button = add_button(auto_greeting_delete_button, false)
        save_button.id = 'auto_greeting_button_-1'
        load_button.id = 'auto_greeting_button_-2'
        delete_button.id = 'auto_greeting_button_-3'
        document.getElementById('njoy_auto_greet_admin_buttons_container').appendChild(save_button)
        document.getElementById('auto_greeting_button_-1').addEventListener('click', save_auto_greeting)
        document.getElementById('njoy_auto_greet_admin_buttons_container').appendChild(load_button)
        document.getElementById('auto_greeting_button_-2').addEventListener('click', load_auto_greeting)
        document.getElementById('njoy_auto_greet_admin_buttons_container').appendChild(delete_button)
        document.getElementById('auto_greeting_button_-3').addEventListener('click', delete_auto_greeting)
        document.getElementById('njoy_auto_greet_admin_buttons_container').appendChild(auto_greeting_name_input)
    }

    function create_auto_greeting_buttons() {
        for (const auto_greeting of auto_greetings.keys()) {
            if (document.getElementById("njoy_auto_greet_buttons_container") !== undefined && document.getElementById("njoy_auto_greet_buttons_container") !== null) {
                document.getElementById("njoy_auto_greet_buttons_container").appendChild(add_button(auto_greetings.get(auto_greeting), false))
            }
        }
    }

    function clear_auto_greeting_buttons() {
        let auto_greet_button_container = document.getElementById('njoy_auto_greet_buttons_container')
        while (auto_greet_button_container.firstChild) {
            auto_greet_button_container.removeChild(auto_greet_button_container.lastChild);
        }
    }

    function clear_macro_buttons() {
        let macro_button_container = document.getElementById('njoy_macro_buttons_container')
        while (macro_button_container.firstChild) {
            macro_button_container.removeChild(macro_button_container.lastChild);
        }
    }

    function create_function_buttons() {
        let conversion_button = document.createElement('button')
        conversion_button.innerText = 'Convert to custom font.'
        conversion_button.setAttribute('class', " j-button__content ")
        conversion_button.addEventListener("click", convert_editor_to_custom_font)
        conversion_button.id = 'test_button_for_me'
        document.getElementById('njoy_function_buttons_container').appendChild(conversion_button)
        let show_macro_admin_button = document.createElement('button')
        show_macro_admin_button.innerText = 'Toggle Macro Admin.'
        show_macro_admin_button.setAttribute('class', " j-button__content ")
        show_macro_admin_button.addEventListener("click", toggle_macro_admin_container_visibility)
        show_macro_admin_button.id = 'toggle_macro_admin_button'
        document.getElementById('njoy_function_buttons_container').appendChild(show_macro_admin_button)
        let show_auto_greet_admin_button = document.createElement('button')
        show_auto_greet_admin_button.innerText = 'Toggle Auto-greet Admin.'
        show_auto_greet_admin_button.setAttribute('class', " j-button__content ")
        show_auto_greet_admin_button.addEventListener("click", toggle_auto_greet_admin_container_visibility)
        show_auto_greet_admin_button.id = 'toggle_auto_greet_admin_button'
        document.getElementById('njoy_function_buttons_container').appendChild(show_auto_greet_admin_button)
    }

    function create_macro_admin_buttons() {
        let macro_save_button = new TextMacro(-1, "Save", undefined)
        let macro_load_button = new TextMacro(-2, "Load", undefined)
        let macro_delete_button = new TextMacro(-3, "Delete", undefined)
        let macro_name_input = document.createElement('input')
        macro_name_input.id = "macro_name_input"
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_save_button, true))
        document.getElementById('macro_button_-1').addEventListener('click', save_macro)
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_load_button, false))
        document.getElementById('macro_button_-2').addEventListener('click', load_macro)
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_delete_button, false))
        document.getElementById('macro_button_-3').addEventListener('click', delete_macro)
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(macro_name_input)
    }

    function toggle_macro_admin_container_visibility() {
        let macro_admin_buttons_container = document.getElementById('njoy_macro_admin_buttons_container')
        macro_admin_buttons_container.hidden = !macro_admin_buttons_container.hidden;
    }

    function toggle_auto_greet_admin_container_visibility() {
        let auto_greet_admin_buttons_container = document.getElementById('njoy_auto_greet_admin_buttons_container')
        let auto_greet_buttons_container = document.getElementById('njoy_auto_greet_buttons_container')
        if (auto_greet_admin_buttons_container.hidden) {
            auto_greet_admin_buttons_container.hidden = false
            auto_greet_buttons_container.hidden = false
        } else {
            auto_greet_admin_buttons_container.hidden = true
            auto_greet_buttons_container.hidden = true
        }
    }

    function load_text_macros() {
        const macros = new Map();
        let counter = 0
        GM.getValue("macros").then((macro_list) => {
                if (macro_list !== undefined) {
                    macro_list = new Map(JSON.parse(macro_list))
                    if (typeof macro_list[Symbol.iterator] === 'function' && macro_list.keys() !== undefined) {
                        for (const macro_id of macro_list.keys()) {
                            GM.getValue(macro_id).then((value) => {
                                    if (value !== undefined) {
                                        macros.set(macro_id, JSON.parse(value))
                                    }
                                    counter++
                                    if (counter === macro_list.size) {
                                        console.log("Initiating stage 2.")
                                        create_macro_buttons()
                                    }
                                }
                            )
                        }
                    }
                } else {
                    macro_list = new Map()
                    GM.setValue("macros", JSON.stringify([...macro_list]))
                }
            }
        )
        return macros
    }

    function load_auto_greetings() {
        const greetings = new Map();
        let counter = 0
        GM.getValue("auto_greetings").then((auto_greetings_list) => {
                if (auto_greetings_list !== undefined) {
                    auto_greetings_list = new Map(JSON.parse(auto_greetings_list))
                    if (typeof auto_greetings_list[Symbol.iterator] === 'function' && auto_greetings_list.keys() !== undefined) {
                        for (const auto_greeting_id of auto_greetings_list.keys()) {
                            GM.getValue(auto_greeting_id).then((value) => {
                                    if (value !== undefined) {
                                        greetings.set(auto_greeting_id, JSON.parse(value))
                                    }
                                    counter++
                                    if (counter === auto_greetings_list.size) {
                                        create_auto_greeting_buttons()
                                    }
                                }
                            )
                        }
                    }
                } else {
                    auto_greetings_list = new Map()
                    GM.setValue("auto_greetings", JSON.stringify([...auto_greetings_list]))
                }
            }
        )
        return greetings
    }

    function save_auto_greeting() {
        console.log("Save auto_greeting clicked")
        let auto_greeting_name_input = document.getElementById('auto_greeting_name_input').value
        let auto_greeting_text_input = document.querySelectorAll('#joychat_input_text')[0].value
        GM.getValue(10001).then((auto_greeting_id) => {
                if (auto_greeting_id === undefined) {
                    auto_greeting_id = 10002
                }
                let new_auto_greeting = new TextAutoGreeting(auto_greeting_id, auto_greeting_name_input, auto_greeting_text_input)
                console.log(new_auto_greeting)
                GM.setValue(auto_greeting_id, JSON.stringify(new_auto_greeting))
                auto_greetings.set(auto_greeting_id, new_auto_greeting)
                console.log(auto_greetings)
                GM.setValue(10001, auto_greeting_id + 1)
                GM.setValue("auto_greetings", JSON.stringify([...auto_greetings]))
                clear_auto_greeting_buttons()
                create_auto_greeting_buttons()
            }
        )
    }

    function load_auto_greeting() {
        console.log("Load auto_greeting clicked")
        let auto_greeting_name_input = document.getElementById('auto_greeting_name_input').value
        let auto_greeting_id = get_key_for_auto_greeting_name(auto_greeting_name_input)
        if (auto_greeting_id !== -999) {
            document.querySelectorAll('#joychat_input_text')[0].value = auto_greetings.get(auto_greeting_id).auto_greeting_text
        } else {
            console.log('auto_greeting name not found.')
        }
    }

    function delete_auto_greeting() {
        console.log("Delete auto_greeting clicked")
        let auto_greeting_name_input = document.getElementById('auto_greeting_name_input').value
        let auto_greeting_id = get_key_for_auto_greeting_name(auto_greeting_name_input)
        if (auto_greeting_id !== -999) {
            auto_greetings.delete(auto_greeting_id)
            GM.setValue(auto_greeting_id, undefined)
            GM.setValue("auto_greetings", JSON.stringify([...auto_greetings]))
        } else {
            console.log('auto_greeting name not found.')
        }
        clear_auto_greeting_buttons()
        create_auto_greeting_buttons()
    }

    function save_macro() {
        console.log("Save macro clicked")
        let macro_name_input = document.getElementById('macro_name_input').value
        let macro_text_input = document.querySelectorAll('#joychat_input_text')[0].value
        GM.getValue(1).then((macro_id) => {
                if (macro_id === undefined) {
                    macro_id = 2
                }
                let new_macro = new TextMacro(macro_id, macro_name_input, macro_text_input)
                console.log(new_macro)
                GM.setValue(macro_id, JSON.stringify(new_macro))
                macros.set(macro_id, new_macro)
                console.log(macros)
                GM.setValue(1, macro_id + 1)
                GM.setValue("macros", JSON.stringify([...macros]))
                clear_macro_buttons()
                create_macro_buttons()
            }
        )
    }

    function load_macro() {
        console.log("Load macro clicked")
        let macro_name_input = document.getElementById('macro_name_input').value
        let macro_id = get_key_for_macro_name(macro_name_input)
        if (macro_id !== -999) {
            document.querySelectorAll('#joychat_input_text')[0].value = macros.get(macro_id).macro_text
        } else {
            console.log('Macro name not found.')
        }
    }

    function delete_macro() {
        console.log("Delete macro clicked")
        let macro_name_input = document.getElementById('macro_name_input').value
        let macro_id = get_key_for_macro_name(macro_name_input)
        if (macro_id !== -999) {
            macros.delete(macro_id)
            GM.setValue(macro_id, undefined)
            GM.setValue("macros", JSON.stringify([...macros]))
        } else {
            console.log('Macro name not found.')
        }
        clear_macro_buttons()
        create_macro_buttons()
    }

    function add_button(macro, custom_onclick) {
        let macro_button = document.createElement('button')
        macro_button.innerText = macro.name
        macro_button.setAttribute('class', " j-button__content ")
        console.log("Adding button for macro:")
        console.log(macro)
        console.log("Custom onclick:")
        console.log(custom_onclick)
        if (custom_onclick === false) {
            macro_button.addEventListener('click', function () {
                say_macro(macro.macro_text)
            })
        }
        macro_button.id = "macro_button_" + macro.macro_id
        return macro_button
    }

    function say_macro(macro_text) {
        console.log("Say Macro triggered.")
        let joychat_input_box = document.querySelectorAll('#joychat_input_text')[0]
        if (joychat_input_box !== null && joychat_input_box !== undefined) {
            joychat_input_box.value = macro_text;
            let joychat_send_button = document.querySelectorAll('.send')[0]
            if (joychat_send_button !== undefined && joychat_send_button !== null) {
                joychat_send_button.dispatchEvent(new Event('click', {bubbles: true}))
            }
        }
    }

    function get_key_for_macro_name(macro_name) {
        for (let macro_key of macros.keys()) {
            let current_macro = macros.get(macro_key)
            if (current_macro.name === macro_name) {
                return macro_key
            }
        }
        return -999
    }

    function get_key_for_auto_greeting_name(auto_greeting_name) {
        for (let auto_greeting_key of auto_greetings.keys()) {
            let current_auto_greeting = auto_greetings.get(auto_greeting_key)
            if (current_auto_greeting.name === auto_greeting_name) {
                return auto_greeting_key
            }
        }
        return -999
    }

    function convert_editor_to_custom_font() {
        console.log("Convert editor to custom font")
        let joychat_input_box = document.querySelectorAll('#joychat_input_text')[0]
        if (joychat_input_box !== null) {
            let text = joychat_input_box.value;
            console.log(text);
            let words = text.split(' ');
            let converted_text = '';
            for (let word_to_convert of words) {
                if (word_to_convert[0] !== '@') {
                    converted_text += ' ' + convert_string_to_custom_font(word_to_convert)
                } else {
                    converted_text += word_to_convert
                }
            }
            joychat_input_box.value = '';
            joychat_input_box.focus();
            joychat_input_box.value = converted_text;
        }
    }

    function convert_string_to_custom_font(string_to_convert) {
        let converted_string = ''
        for (let character_to_convert of string_to_convert) {
            converted_string += convert_character_to_custom_font(character_to_convert)
        }
        return converted_string
    }

    function convert_character_to_custom_font(character_to_convert) {
        let ascii_code = character_to_convert.codePointAt(0)
        if (ascii_code >= 'a'.codePointAt(0) && ascii_code <= 'z'.codePointAt(0)) {
            ascii_code = ascii_code - 'a'.codePointAt(0) + 26
        } else if (ascii_code >= 'A'.codePointAt(0) && ascii_code <= 'Z'.codePointAt(0)) {
            ascii_code = ascii_code - 'A'.codePointAt(0)
        } else {
            return character_to_convert
        }
        return font_array.slice(ascii_code * 2, ascii_code * 2 + 2)
    }

    function watch_user_list_for_change() {
        let observeDOM = (function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

            return function (obj, callback) {
                if (!obj || obj.nodeType !== 1) return;

                if (MutationObserver) {
                    // define a new observer
                    var mutationObserver = new MutationObserver(callback)

                    // have the observer observe for changes in children
                    mutationObserver.observe(obj, {childList: true, subtree: true})
                    return mutationObserver
                }

                // browser support fallback
                else if (window.addEventListener) {
                    obj.addEventListener('DOMNodeInserted', callback, false)
                    obj.addEventListener('DOMNodeRemoved', callback, false)
                }
            }
        })()
        console.log(document.querySelectorAll('ul.userlist:nth-child(3)')[0])
        observeDOM(document.querySelectorAll('ul.userlist:nth-child(3)')[0], function (m) {
            var addedNodes = [], removedNodes = [];
            m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
            m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes))

            let truly_new = []
            for (let added_node of addedNodes) {
                if (added_node.classList.contains('channel_user_info')) {
                    truly_new.push([added_node, added_node.querySelector('.joychat_user_name').textContent])
                }
            }
            let truly_removed = []
            for (let removed_node of removedNodes) {
                if (removed_node.classList.contains('channel_user_info')) {
                    truly_removed.push([removed_node, removed_node.querySelector('.joychat_user_name').textContent])
                }
            }
            let all_user_names = new Map()
            for (let added_node of truly_new) {
                all_user_names.set(added_node[1], added_node[0])
            }
            for (let removed_node of truly_removed) {
                if (!all_user_names.has(removed_node[1])) {
                    all_user_names.set(removed_node[1], removed_node[0])
                }
            }
            compare_user_lists(all_user_names)
        });
    }

    function compare_user_lists(new_user_list) {
        let existing_users = new Map()
        let new_users = new Map()
        let removed_users = new Map()
        for (let new_user of new_user_list.keys()) {
            if (users.has(new_user)) {
                existing_users.set(new_user, new_user_list.get(new_user))
            } else {
                new_users.set(new_user, new_user_list.get(new_user))
            }
        }
        for (let existing_user of users.keys()) {
            if (!new_user_list.has(existing_user)) {
                removed_users.set(existing_user, users.get(existing_user))
            }
        }
        console.log('Existing users:', existing_users, ' New Users:', new_users, ' Removed Users:', removed_users)
        for (let existing_user of existing_users.keys()) {
            users.set(existing_user, existing_users.get(existing_user))
        }
        for (let new_user of new_users.keys()) {
            users.set(new_user, new_users.get(new_user))
            if (get_key_for_auto_greeting_name(new_user) !== -999) {
                let auto_greeting = auto_greetings.get(get_key_for_auto_greeting_name(new_user)).auto_greeting_text
                let joychat_input_box = document.querySelectorAll('#joychat_input_text')[0]
                joychat_input_box.value = auto_greeting
                let joychat_send_button = document.querySelectorAll('.send')[0]
                joychat_send_button.dispatchEvent(new Event('click', {bubbles: true}))
            }
        }
    }

    // This is necessary for custom emojis. NO messages are saved or persisted in any way.

    function watch_chat_output_for_change() {
        console.log("Watching chat output for change...")
        let observeDOM = (function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

            return function (obj, callback) {
                if (!obj || obj.nodeType !== 1) return;

                if (MutationObserver) {
                    // define a new observer
                    var mutationObserver = new MutationObserver(callback)

                    // have the observer observe for changes in children
                    mutationObserver.observe(obj, {childList: true, subtree: true})
                    return mutationObserver
                }

                // browser support fallback
                else if (window.addEventListener) {
                    obj.addEventListener('DOMNodeInserted', callback, false)
                    obj.addEventListener('DOMNodeRemoved', callback, false)
                }
            }
        })()
        console.log(document.querySelectorAll('.joychat_output'))
        for (let joychat_output of document.querySelectorAll('.joychat_output')) {
            if (!observed_chat_outputs.includes(joychat_output)) {
                observeDOM(joychat_output, function (m) {
                    var addedNodes = [], removedNodes = [];
                    m.forEach(record => record.addedNodes.length & addedNodes.push(...record.addedNodes))
                    m.forEach(record => record.removedNodes.length & removedNodes.push(...record.removedNodes))

                    let truly_new = []
                    for (let added_node of addedNodes) {
                        if (added_node.tagName === 'DIV' && !added_node.classList.contains('njoy_emoji_chat')) {
                            truly_new.push(added_node)
                        }
                    }
                    let truly_removed = []
                    for (let removed_node of removedNodes) {
                        if (removed_node.tagName === 'DIV' && !removed_node.classList.contains('njoy_emoji_chat')) {
                            truly_removed.push(removed_node)
                        }
                    }

                    console.log('Added (chat):', addedNodes, ' Removed (chat): ', removedNodes)
                    handle_chat_message_addition(truly_new);
                    handle_chat_message_removal(truly_removed);
                });
                observed_chat_outputs.push(joychat_output)
            }
        }
    }

    function handle_chat_message_addition(addedNodes) {
        console.log(addedNodes)
        for (let addedNode of addedNodes) {
            let new_div = document.createElement('div')
            // Set new class so later on, dom changes won't cause the observer to fire on our new chat.
            new_div.classList.add("njoy_emoji_chat")
            // Keep old class so we don't overwrite CSS
            new_div.classList.add(addedNode.getAttribute("class"))

            let SAVED_BLOCK_DOM = [];
            console.log(addedNode.childNodes)
            let new_list = addedNode.childNodes;
            console.log(new_list)
            for (let i = 0; i < new_list.length; i++) {
                SAVED_BLOCK_DOM.push(new_list[i]);
            }

            console.log('Added node:', SAVED_BLOCK_DOM)
            for (let childNode of SAVED_BLOCK_DOM) {
                let SAVED_CHILDREN_BLOCK_DOM = [];
                console.log(addedNode.childNodes)
                let new_children_list = childNode.childNodes;
                console.log(new_list)
                for (let i = 0; i < new_children_list.length; i++) {
                    SAVED_CHILDREN_BLOCK_DOM.push(new_children_list[i]);
                }
                console.log('ChildNode:', childNode)
                if (childNode.tagName === 'P') {
                    let new_node = document.createElement('p')
                    for (let childChildNode of SAVED_CHILDREN_BLOCK_DOM) {
                        console.log('ChildChildNode', childChildNode)
                        if (childChildNode.nodeType !== Node.TEXT_NODE) {
                            let computedStyle = window.getComputedStyle(childChildNode)
                            console.log(computedStyle)
                            let new_child_node = childChildNode.cloneNode(true)
                            Array.from(computedStyle).forEach(key => new_child_node.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key)))
                            new_node.appendChild(childChildNode.cloneNode(true))
                        } else {
                            let possible_emoji_children = check_for_njoy_emojis(childChildNode.nodeValue)
                            for (let possible_child of possible_emoji_children) {
                                console.log(possible_child)
                                new_node.appendChild(possible_child)
                            }
                        }
                    }
                    new_div.appendChild(new_node)
                } else {
                    new_div.appendChild(childNode.cloneNode())
                }
            }
            addedNode.replaceWith(new_div)
        }
    }

    function check_for_njoy_emojis(text) {
        let result = []
        let words = text.split(' ');
        let converted_text = '';
        for (let word_to_convert of words) {
            if (word_to_convert.startsWith('#') && word_to_convert.endsWith('#')) {
                result.push(document.createTextNode(converted_text))
                converted_text = ' '
                result.push(create_njoy_emoji(word_to_convert))
            } else {
                converted_text += word_to_convert + ' '
            }
        }
        result.push(document.createTextNode(converted_text))
        return result
    }

    function create_njoy_emoji(emoji_descriptor) {
        let emoji_link
        if (emoji_descriptor.startsWith('#giphy#')) {
            let emoji_giphy_short_link = emoji_descriptor.split('#giphy#')[1].slice(0, -1)
            emoji_link = giphy_url + emoji_giphy_short_link
        } else if (emoji_descriptor.startsWith('#img#')) {
            emoji_link = emoji_descriptor.split('#img#')[1].slice(0, -1)
        } else {
            emoji_link = njoy_emojis.get(emoji_descriptor)
        }
        if (emoji_link !== undefined) {
            let emoji_span = document.createElement('span')
            emoji_span.setAttribute('class', 'smiley')
            let emoji_img = document.createElement('img')
            emoji_img.setAttribute('src', emoji_link)
            emoji_img.setAttribute('title', emoji_descriptor)
            emoji_img.setAttribute('alt', emoji_descriptor)
            emoji_img.onload = function(){resizeImage(this)}
            let emoji_alt_span = document.createElement('span')
            emoji_alt_span.innerText = emoji_descriptor
            emoji_span.appendChild(emoji_img)
            emoji_span.appendChild(emoji_alt_span)
            return emoji_span
        }
    }

    function resizeImage(image_node) {
        console.log('width', image_node.width, 'height', image_node.height)
        console.log('parsed width', parseFloat(image_node.width), 'parsed height', parseFloat(image_node.height))
        let dimensions = calculateAspectRatioFit(parseFloat(image_node.width), parseFloat(image_node.height), IMAGE_MAX_WIDTH, IMAGE_MAX_HEIGHT)
        image_node.style.height = dimensions.height.toString()
        image_node.style.width = dimensions.width.toString()
        image_node.setAttribute('height', dimensions.height.toString())
        image_node.setAttribute('width', dimensions.width.toString())
    }

    /**
     * Conserve aspect ratio of the original region. Useful when shrinking/enlarging
     * images to fit into a certain area.
     *
     * @param {Number} srcWidth width of source image
     * @param {Number} srcHeight height of source image
     * @param {Number} maxWidth maximum available width
     * @param {Number} maxHeight maximum available height
     * @return {Object} { width, height }
     */
    function calculateAspectRatioFit(srcWidth, srcHeight, maxWidth, maxHeight) {
        let ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        console.log('srcWidth:', srcWidth, 'srcHeight:', srcHeight, 'maxWidth', maxWidth, 'maxHeight', maxHeight, 'ratio', ratio)
        return {width: Math.floor(srcWidth * ratio), height: Math.floor(srcHeight * ratio)};
    }

    function handle_chat_message_removal(removedNodes) {
        console.log('lol lmao')
    }

})
();

