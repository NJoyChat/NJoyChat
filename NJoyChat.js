// ==UserScript==
// @name         NJoyChat
// @namespace    https://www.joyclub.de/chat/login/
// @version      Alpha-v11
// @downloadURL  https://raw.githubusercontent.com/NJoyChat/NJoyChat/master/NJoyChat.js
// @updateURL    https://raw.githubusercontent.com/NJoyChat/NJoyChat/master/NJoyChat.js
// @description  Improves JoyChat with additional utilities.
// @author       NJoyChat Team
// @match        https://www.joyclub.de/chat/login/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.addStyle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/TextPlugin.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/EasePack.min.js
// @run-at       document-idle
// ==/UserScript==

// NOTE: The DarkReader extension significantly messes with the performance. It implements "deepWatchForInlineStyles/attrObserver" which
// will attempt to overwrite the modified animation messages with new colors (Rainbow text is really terrible for this.)
// It is recommended to disable it on the site.

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

class SettingsCollection extends Map {

    constructor(groups) {
        super();
        this.set('groups', groups)
    }

    add_group(group) {
        this.get('groups').set(group.get('name'), group)
    }

    async save_settings() {
        await GM.setValue('settings', JSON.stringify(this))
    }

    toJSON() {
        return {
            groups: Object.fromEntries(this.get('groups')),
        }
    }

    static fromJSON(json) {
        return new SettingsCollection(this.load_settings_collection_from_json(json.groups));
    }

    static load_settings_collection_from_json(json) {
        let settings_collection = new Map(Object.entries(json))
        settings_collection.forEach(function (value, key, map) {
            map.set(key, SettingsGroup.fromJSON(value))
        })
        return settings_collection
    }

}

class SettingsGroup extends Map {

    constructor(name, display_name, settings) {
        super();
        this.set('name', name)
        this.set('display_name', display_name)
        this.set('settings', settings)
        this.set('loaded_settings', new Map())
        //this.load_settings()
    }

    load_settings() {
        for (let setting of this.get('settings')) {
            let loaded_setting = new Setting(setting.get('display_name'), setting.get('display_name'), setting.get('type'), this.get('name'), setting.get('possible_values')[0], setting.get('possible_values'))
            this.get('loaded_settings').set(setting.get('display_name'), loaded_setting)
        }
    }

    add_setting(setting) {
        this.get('loaded_settings').set(setting.get('name'), setting)
    }

    toJSON() {
        return {
            name: this.get('name'),
            display_name: this.get('display_name'),
            settings: this.get('settings'),
            loaded_settings: Object.fromEntries(this.get('loaded_settings'))
        }
    }

    static fromJSON(json) {
        const settings_group = new SettingsGroup();

        settings_group.set('name', json.name)
        settings_group.set('display_name', json.display_name)
        settings_group.set('settings', json.settings)
        settings_group.set('loaded_settings', this.load_settings_group_from_json(json.loaded_settings))
        return settings_group;
    }

    static load_settings_group_from_json(json) {
        let settings = new Map(Object.entries(json))
        settings.forEach(function (value, key, map) {
            map.set(key, Setting.fromJSON(value))
        })
        return settings
    }

}

class Setting extends Map {

    constructor(name, display_name, type, group, default_value, possible_values) {
        super();
        this.set('name', name)
        this.set('display_name', display_name)
        this.set('type', type)
        this.set('group', group)
        this.set('default_value', default_value)
        this.set('value', default_value)
        this.set('possible_values', possible_values)
    }

    toJSON() {
        return {
            name: this.get('name'),
            display_name: this.get('display_name'),
            type: this.get('type'),
            group: this.get('group'),
            default_value: this.get('default_value'),
            value: this.get('value'),
            possible_values: this.get('possible_values'),
        }
    }

    static fromJSON(json) {
        const setting = new Setting();
        setting.set('name', json.name)
        setting.set('display_name', json.display_name)
        setting.set('type', json.type)
        setting.set('group', json.group)
        setting.set('default_value', json.default_value)
        setting.set('value', json.value)
        setting.set('possible_values', json.possible_values)

        return setting
    }

    async load_setting() {
        return await GM.getValue('setting_' + this.get('group') + '_' + this.get('name'), '{"setting_' + this.get('group') + '_' + this.get('name') + '": "' + this.get("default_value") + '"}')
    }


    save_setting() {
        GM.setValue("setting_" + this.get('group') + '_' + this.get('name'), JSON.stringify(this.get('value')))
    }

}

class SettingsMenu {

    constructor(settings_collection) {
        this.settings_window = document.createElement('div')
        this.set_settings_menu_container_style()
        this.settings_window_container = document.getElementById('njoy_settings_window_container')
        this.settings_window_container.appendChild(this.settings_window)
        this.settings_collection = settings_collection
        this.settings_list = ''
        this.settings_item_list = this.create_settings_item_list()
        this.settings_window.appendChild(this.settings_item_list)
        this.settings_detail_tab = this.create_settings_detail_tab()
        this.settings_window.appendChild(this.settings_detail_tab)
        this.load_settings()
    }

    load_settings() {
        console.log('Loading settings...', this.settings_collection)
        console.log(this.settings_collection.get('groups'))
        let iterator
        try {
            iterator = this.settings_collection.get('groups').keys()
        } catch (error) {
            console.error(error);
            iterator = this.settings_collection.get('groups').entries()
            // Expected output: ReferenceError: nonExistentFunction is not defined
            // (Note: the exact output may be browser-dependent)
        }

        for (let settings_group of iterator) {
            new SettingsGroupEntry(this.settings_collection.get('groups').get(settings_group))
        }

    }

    save_settings() {
        GM.setValue('njoy_settings', JSON.stringify(this.settings_groups_list))
    }

    get_test_setting() {
        let test_display_name = ['display_name', 'Regenbogen']
        let mascot_display_name = ['display_name', 'Maskotchen']
        let mascot_possible_values = ['possible_values', ['https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif', 'https://media.tenor.com/fSsxftCb8w0AAAAi/pikachu-running.gif']]
        let test_possible_boolean_values = ['possible_values', [true, false]]
        let test_type_string = ['type', 'multi_choice']
        let test_type_boolean = ['type', 'boolean']
        let test_setting_string = new Map([mascot_display_name, test_type_string, mascot_possible_values])
        let test_setting_boolean = new Map([[test_display_name[0], test_display_name[1] + ' Schrift'], test_type_boolean, test_possible_boolean_values])
        let test_settings = [test_setting_string, test_setting_boolean]
        return test_settings
    }

    set_settings_menu_container_style() {
        this.settings_window.id = 'njoy_settings_window'
        this.settings_window.style.height = "90%"
        this.settings_window.style.width = "90%"
        this.settings_window.style.top = "5%"
        this.settings_window.style.left = "5%"
        this.settings_window.style.position = "absolute"
        this.settings_window.style.background = "#373939"
        this.settings_window.style.color = "#f1f1f1"
        this.settings_window.style.borderColor = "#1b1d1d"
    }

    create_settings_item_list() {
        let settings_item_list = document.createElement('ol')
        settings_item_list.id = 'njoy_settings_list'
        settings_item_list.style.position = "absolute"
        settings_item_list.style.top = "5%"
        settings_item_list.style.left = "5%"
        settings_item_list.style.height = '90%'
        settings_item_list.style.width = '30%'
        settings_item_list.style.background = "#262828"
        settings_item_list.style.color = "#f1f1f1"
        settings_item_list.style.borderColor = "#1b1d1d"
        return settings_item_list
    }

    create_settings_detail_tab() {
        let settings_detail_tab = document.createElement('div')
        settings_detail_tab.id = "njoy_settings_detail_tab"
        settings_detail_tab.style.position = "absolute"
        settings_detail_tab.style.top = "5%"
        settings_detail_tab.style.left = "40%"
        settings_detail_tab.style.height = '90%'
        settings_detail_tab.style.width = '50%'
        settings_detail_tab.style.background = "#262828"
        settings_detail_tab.style.color = "#f1f1f1"
        settings_detail_tab.style.borderColor = "#1b1d1d"
        return settings_detail_tab
    }

}

class SettingsGroupEntry {
    constructor(setting) {
        this.settings_group = setting
        console.log(setting)
        this.setting_group_display_name = this.settings_group.get('display_name')
        this.settings_list = document.getElementById('njoy_settings_list')
        this.settings_detail_tab_container = document.getElementById("njoy_settings_detail_tab")

        // Create activate button and set necessary styles
        this.activate_button = document.createElement('button')
        this.activate_button.innerText = this.setting_group_display_name
        this.activate_button.setAttribute('class', " nj-button__content ")
        this.activate_button.style.display = "block"
        this.activate_button.style.width = "100%"
        this.activate_button.classList.add('nsecondary')
        this.activate_button.classList.add('nj-button')

        // Create detail tab for group
        this.settings_detail_tab = new SettingsGroupDetails(this.settings_group)

        // Link activate button to detail tab
        this.activate_button.settings_detail_tab = this.settings_detail_tab
        this.settings_detail_tab_container.appendChild(this.settings_detail_tab.settings_detail_container_div)
        this.activate_button.addEventListener('click', this.set_detail_tab_for_setting_to_primary)
        this.settings_list.appendChild(this.activate_button)
    }

    set_detail_tab_for_setting_to_primary(event) {
        event.currentTarget.settings_detail_tab.set_settings_item_details_to_primary()
    }
}

class SettingsGroupDetails {

    constructor(settings_group) {
        this.setting = settings_group
        this.settings_detail_tab = document.getElementById('njoy_settings_detail_tab')
        this.settings_detail_container_div = document.createElement('div')
        this.settings_detail_container_div.hidden = true
        this.create_details_for_settings_in_group()
    }

    set_settings_item_details_to_primary() {
        for (let child of this.settings_detail_tab.children) {
            if (child.hidden === false) {
                child.hidden = true
            }
        }
        this.settings_detail_container_div.hidden = false
    }

    create_details_for_settings_in_group() {
        for (let setting of this.setting.get('loaded_settings').keys()) {
            let possible_children = this.create_details_for_setting(this.setting.get('loaded_settings').get(setting))
            for (let possible_child of possible_children) {
                this.settings_detail_container_div.appendChild(possible_child)
            }
        }
    }

    create_details_for_setting(setting) {
        let setting_details = document.createElement('p')
        let setting_display_name = setting.get('display_name')
        let setting_type = setting.get('type')
        setting_details.textContent = 'Name: ' + setting_display_name
        if (setting_type === 'boolean') {
            let boolean_setting = new SettingItemDetailsBoolean(setting)
            return [setting_details, boolean_setting.div_container]
        } else if (setting_type === 'multi_choice') {
            let multi_choice_setting = new SettingItemDetailsMultipleChoice(setting)
            return [setting_details, multi_choice_setting.div_container]
        }
        return [setting_details]
    }
}

class SettingItemDetailsBoolean {

    constructor(setting) {
        this.div_container = document.createElement('div');
        this.div_container.setting = setting
        this.checkbox = document.createElement('input')
        this.checkbox.type = "checkbox"
        this.checkbox.id = 'settings_checkbox_' + setting.get('name')
        this.checkbox.checked = setting.get('value')
        this.checkbox.addEventListener('click', this.toggle_setting)
        this.div_container.appendChild(this.checkbox)
    }


    toggle_setting() {
        this.parentNode.setting.set('value', !this.parentNode.setting.get('value'))
        this.parentNode.firstChild.checked = this.parentNode.setting.get('value')
        this.parentNode.setting.save_setting()
    }

}

class SettingItemDetailsMultipleChoice {

    constructor(setting) {
        this.div_container = document.createElement('div');
        this.div_container.setting = setting
        this.select = document.createElement('select')

        for (let possible_value of setting.get('possible_values')) {
            let possible_option_value = document.createElement('option')
            possible_option_value.textContent = possible_value
            if (possible_value === setting.get('value')){
                possible_option_value.selected = true
            }
            this.select.appendChild(possible_option_value)
        }

        this.select.addEventListener('change', this.toggle_setting)
        this.div_container.appendChild(this.select)
    }


    toggle_setting() {
        this.parentNode.setting.set('value', this.value)
        this.parentNode.setting.save_setting()
    }

}


(async () => {
    'use strict';

    GM.addStyle(".nj-button__content {text-align: center; font-size: 14px; font-weight: bold; padding: 8px 24px; margin: 2px 2px 2px 2px; font-family: JC-ProximaNovaSoft, Verdana, Arial, Helvetica, sans-serif; align-items: center; line-height: 1;}");
    GM.addStyle(".nsecondary {background: #45484a; color: #f1f1f1; border-color: #515455;}");
    GM.addStyle(".nj-button {white-space: nowrap; cursor: pointer; box-sizing: border-box; border: 2px; border-radius: 8px;}")
    GM.addStyle(".nj-focus {z-index: 9999; position: absolute; backdrop-filter: blur(2px); width: 100%; height: 100%;}")

    gsap.registerPlugin(ScrollTrigger)
    gsap.registerPlugin(TextPlugin)
    let font_array = '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃'
    let njoy_emojis = new Map([['#test#', 'https://forumstatic.oneplusmobile.com/opforum-gl/upload/image/app/thread/20230204/2780603194562714301/1258923422265114625/1258923422265114625.gif']])
    let giphy_url = "https://giphy.com/gifs/"
    let IMAGE_MAX_WIDTH = 250
    let IMAGE_MAX_HEIGHT = 250
    let SCROLLBACK_BUFFER = 50
    let freq = Math.PI * 2 / 100; // TODO Possibly make this global or a config value?
    let objects_to_load = ['macros', 'greetings', 'settings']
    let settings = await load_settings()
    let macros = load_text_macros()
    let auto_greetings = load_auto_greetings()
    let observed_chat_outputs = []
    let observed_j_buttons = []
    let users = new Map()
    let settings_menu

    waitForKeyElements(".toolbar", start_running)
    waitForKeyElements("ul.userlist:nth-child(3)", watch_user_list_for_change)
    waitForKeyElements(".joychat_output", watch_chat_output_for_change)
    waitForKeyElements(".send", watch_for_send_button_submit)

    function start_running() {
        console.log('Test. Ich weiß, was ich tue, und das hier ist in keinster Art und Weise bösartig. Bitte kontaktieren Sie mich, falls meine Aktivitäten zu Problemen führen.')
        let toolbar = document.querySelectorAll('.toolbar')[0]
        if (toolbar !== null) {
            create_settings_window()
            settings_menu = new SettingsMenu(settings)
            create_container_divs()
            create_animation_buttons()
            create_function_buttons()
            create_macro_admin_buttons()
            create_auto_greeting_admin_buttons()
            watch_for_textarea_submit()

        }
    }

    function create_close_and_save_settings_button(){
        let hide_settings_button = document.createElement('button')
        hide_settings_button.innerText = 'settings'
        hide_settings_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        hide_settings_button.addEventListener("click", toggle_settings_window)
        hide_settings_button.id = 'hide_settings_window_button'
        document.getElementById('njoy_settings_window').appendChild(hide_settings_button)
    }

    async function load_settings() {
        let loaded_settings = await GM.getValue('settings')
        let settings_collection
        if (loaded_settings === undefined) {
            settings_collection = new SettingsCollection(new Map())
            let general_settings_group = new SettingsGroup('general', 'General', undefined)
            let scrollback_buffer_setting = new Setting('scrollback_buffer', 'Scrollback Buffer Amount', 'String', general_settings_group.get('name'), '50', ['50', '100', '150', 'Infinite'])
            general_settings_group.add_setting(scrollback_buffer_setting)
            let appearance_settings_group = new SettingsGroup('appearance', 'Appearance', undefined)
            let maskotchen_setting = new Setting('Maskotchen', 'Maskotchen', 'multi_choice', appearance_settings_group.get('name'), 'https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif', ['https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif', 'https://media.tenor.com/fSsxftCb8w0AAAAi/pikachu-running.gif'])
            appearance_settings_group.add_setting(maskotchen_setting)
            let maskotchen_enabled_setting = new Setting('maskotchen_enabled', 'Maskotchen An/Aus', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(maskotchen_enabled_setting)
            let rainbow_font_setting = new Setting('rainbow_message', 'Regenbogen Schrift', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(rainbow_font_setting)
            let macro_settings_group = new SettingsGroup('macros', 'Macros', undefined)
            let auto_greet_settings_group = new SettingsGroup('auto_greet', 'Auto-Greet', undefined)
            settings_collection.add_group(general_settings_group)
            settings_collection.add_group(appearance_settings_group)
            settings_collection.add_group(macro_settings_group)
            settings_collection.add_group(auto_greet_settings_group)
        } else {
            settings_collection = SettingsCollection.fromJSON(JSON.parse(loaded_settings))
        }
        console.log(settings_collection)
        //console.log(JSON.stringify(settings_collection))
        return settings_collection
    }

    function create_settings_window() {
        let settings_window_container = document.createElement('div')
        settings_window_container.id = 'njoy_settings_window_container'
        let joychat_main_window = document.body
        settings_window_container.style.zIndex = "9999"
        settings_window_container.style.backdropFilter = "blur(4px)"
        settings_window_container.style.position = "absolute"
        settings_window_container.style.width = "100%"
        settings_window_container.style.height = "100%"
        settings_window_container.hidden = true
        joychat_main_window.appendChild(settings_window_container)
    }

    async function toggle_settings_window() {
        let settings_window_container = document.querySelector('#njoy_settings_window_container')
        if (settings_window_container.hidden) {
            settings_window_container.hidden = false
        } else {
            await settings.save_settings()
            settings = await load_settings()
            settings_window_container.remove()
            create_settings_window()
            settings_menu = new SettingsMenu(settings)
            create_close_and_save_settings_button()
        }
    }

    function create_animation_buttons() {
        let container_div = document.getElementById('njoy_animation_buttons_container')
        container_div.hidden = !settings.get('groups').get('appearance').get('loaded_settings').get('maskotchen_enabled').get('value');
        let stitch_span = document.createElement('span')
        let stitch_img_span = document.createElement('span')
        stitch_img_span.style.display = 'block'

        stitch_span.style.display = "block"
        stitch_span.setAttribute('class', 'smiley')
        let stitch_img = document.createElement('img')
        stitch_img.setAttribute('src', settings.get('groups').get('appearance').get('loaded_settings').get('Maskotchen').get('value'))

        //https://media.tenor.com/fSsxftCb8w0AAAAi/pikachu-running.gif
        // https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif
        stitch_img.setAttribute('title', 'stitch_running')
        stitch_img.style.display = "block"
        stitch_img.setAttribute('alt', 'stitch_running')
        stitch_img.onload = function () {
            resizeImage(this, 50, 50);
        }

        stitch_img_span.style.left = "5%"

        let t1 = gsap.timeline({repeat: -1})
            .to(stitch_img_span, {
                duration: 5,
                xPercent: 95
            })
            .set(stitch_img_span, {
                scaleX: -1,
                xPercent: -5,
            })
            .to(stitch_img_span, {
                duration: 5,
                xPercent: -95
            })
            .set(stitch_img_span, {
                scaleX: 1,
                xPercent: 5,
            })
        ;
        t1.play()

        stitch_img_span.appendChild(stitch_img)
        stitch_span.appendChild(stitch_img_span)

        container_div.appendChild(stitch_span)
    }

    function create_container_divs() {
        let parent_container = document.createElement('div')
        parent_container.style.marginBottom = "6px"
        parent_container.id = "njoy_parent_container"
        let function_buttons_container = document.createElement('div')
        function_buttons_container.id = "njoy_function_buttons_container"
        let animation_buttons_container = document.createElement('div')
        animation_buttons_container.id = "njoy_animation_buttons_container"
        animation_buttons_container.style.width = '100%'
        animation_buttons_container.style.height = '50px'
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

        //parent_container.appendChild(animation_buttons_container)
        document.querySelector('#joychat_statusbar').style.display = 'flex'
        document.querySelector('#joychat_statusbar').style.height = '50px'
        document.querySelector('.statusbar_general').replaceWith(animation_buttons_container)
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
        let load_button = add_button(auto_greeting_load_button, true)
        let delete_button = add_button(auto_greeting_delete_button, true)
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
        conversion_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        conversion_button.addEventListener("click", convert_editor_to_custom_font)
        conversion_button.id = 'test_button_for_me'
        document.getElementById('njoy_function_buttons_container').appendChild(conversion_button)
        let show_settings_button = document.createElement('button')
        show_settings_button.innerText = 'settings'
        show_settings_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        show_settings_button.addEventListener("click", toggle_settings_window)
        show_settings_button.id = 'show_settings_window_button'
        document.getElementById('njoy_function_buttons_container').appendChild(show_settings_button)
        create_close_and_save_settings_button()
        let show_macro_admin_button = document.createElement('button')
        show_macro_admin_button.innerText = 'Toggle Macro Admin.'
        show_macro_admin_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        show_macro_admin_button.addEventListener("click", toggle_macro_admin_container_visibility)
        show_macro_admin_button.id = 'toggle_macro_admin_button'
        document.getElementById('njoy_settings_window').appendChild(show_macro_admin_button)
        let show_auto_greet_admin_button = document.createElement('button')
        show_auto_greet_admin_button.innerText = 'Toggle Auto-greet Admin.'
        show_auto_greet_admin_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        show_auto_greet_admin_button.addEventListener("click", toggle_auto_greet_admin_container_visibility)
        show_auto_greet_admin_button.id = 'toggle_auto_greet_admin_button'
        document.getElementById('njoy_settings_window').appendChild(show_auto_greet_admin_button)
    }

    function create_macro_admin_buttons() {
        let macro_save_button = new TextMacro(-1, "Save", undefined)
        let macro_load_button = new TextMacro(-2, "Load", undefined)
        let macro_delete_button = new TextMacro(-3, "Delete", undefined)
        let macro_name_input = document.createElement('input')
        macro_name_input.id = "macro_name_input"
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_save_button, true))
        document.getElementById('macro_button_-1').addEventListener('click', save_macro)
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_load_button, true))
        document.getElementById('macro_button_-2').addEventListener('click', load_macro)
        document.getElementById('njoy_macro_admin_buttons_container').appendChild(add_button(macro_delete_button, true))
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
                                        objects_to_load = objects_to_load.filter(item => item !== 'macros')
                                        if (objects_to_load.length === 0) {
                                            start_running()
                                        }
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
                                        objects_to_load = objects_to_load.filter(item => item !== 'greetings')
                                        if (objects_to_load.length === 0) {
                                            start_running()
                                        }
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
        macro_button.setAttribute('class', " nj-button__content ")
        macro_button.classList.add('nsecondary')
        macro_button.classList.add('nj-button')
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
                    mutationObserver.observe(obj, {childList: true, subtree: false})
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
                    if (m[0].target.children.length >= SCROLLBACK_BUFFER) {
                        m[0].target.removeChild(m[0].target.firstChild)
                    }
                });
                observed_chat_outputs.push(joychat_output)
            }
        }
    }

    function handle_chat_message_addition(addedNodes) {
        for (let addedNode of addedNodes) {
            let new_div = document.createElement('div')
            // Set new class so later on, dom changes won't cause the observer to fire on our new chat.
            new_div.classList.add("njoy_emoji_chat")
            // Keep old class so we don't overwrite CSS
            for (let old_class of addedNode.getAttribute("class").split(' ')) {
                new_div.classList.add(old_class)
            }

            let SAVED_BLOCK_DOM = [];
            let new_list = addedNode.childNodes;
            for (let i = 0; i < new_list.length; i++) {
                SAVED_BLOCK_DOM.push(new_list[i]);
            }

            for (let childNode of SAVED_BLOCK_DOM) {
                let SAVED_CHILDREN_BLOCK_DOM = [];
                let new_children_list = childNode.childNodes;
                for (let i = 0; i < new_children_list.length; i++) {
                    SAVED_CHILDREN_BLOCK_DOM.push(new_children_list[i]);
                }
                if (childNode.tagName === 'P') {
                    let new_node = document.createElement('p')
                    for (let childChildNode of SAVED_CHILDREN_BLOCK_DOM) {
                        console.log('ChildChildNode', childChildNode)
                        if (childChildNode.nodeType !== Node.TEXT_NODE) {
                            let computedStyle = window.getComputedStyle(childChildNode)
                            let new_child_node = childChildNode.cloneNode(true)
                            Array.from(computedStyle).forEach(key => new_child_node.style.setProperty(key, computedStyle.getPropertyValue(key), computedStyle.getPropertyPriority(key)))
                            new_node.appendChild(childChildNode.cloneNode(true))
                        } else {
                            let possible_emoji_children = check_for_njoy_emojis(childChildNode.nodeValue)
                            for (let possible_child of possible_emoji_children[0]) {
                                if (possible_child.nodeType !== Node.TEXT_NODE) {
                                    new_node.appendChild(possible_child)
                                } else {
                                    //new_node.appendChild(possible_child.nodeValue)
                                    if (possible_emoji_children[1].length !== 0) {
                                        if (possible_emoji_children[1][0] === 69) {
                                            new_node.appendChild(make_text_sinebow(possible_child.nodeValue))
                                        } else {
                                            new_node.appendChild(possible_child)
                                        }
                                    } else {
                                        new_node.appendChild(possible_child)
                                    }

                                }
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
        let text_and_control_spaces = process_control_spaces(text)
        text = text_and_control_spaces[0]
        let control_spaces = text_and_control_spaces[1]
        console.log('Control spaces...', control_spaces)
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
        return [result, control_spaces]
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
            emoji_img.onload = function () {
                resizeImage(this, IMAGE_MAX_HEIGHT, IMAGE_MAX_WIDTH)
            }
            let emoji_alt_span = document.createElement('span')
            emoji_alt_span.innerText = emoji_descriptor
            emoji_span.appendChild(emoji_img)
            emoji_span.appendChild(emoji_alt_span)
            return emoji_span
        }
    }

    function resizeImage(image_node, height, width) {
        console.log('width', image_node.width, 'height', image_node.height)
        console.log('parsed width', parseFloat(image_node.width), 'parsed height', parseFloat(image_node.height))
        let dimensions = calculateAspectRatioFit(parseFloat(image_node.width), parseFloat(image_node.height), width, height)
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

    let zero_control_space = 8203
    let one_control_space = 8204
    let control_space_start_character = 8239
    let control_space_separator_character = 8205

    function process_control_spaces(message) {
        console.log(message)
        if (message.endsWith(' ')) {
            message = message.slice(0, -1)
        }
        console.log(message.length)
        console.log('charcodes...')
        for (let i = 0; i < message.length; i++) {
            console.log(message.charCodeAt(i), message.charAt(i))
        }
        if (message.split(String.fromCharCode(control_space_start_character)).slice(-1)[0] !== undefined && message.split(String.fromCharCode(control_space_start_character)).length === 2) {
            let all_control_spaces = split_control_spaces(get_control_space_from_message(message))
            let converted_numbers = []
            for (let control_spaces of all_control_spaces) {
                converted_numbers.push(convert_control_spaces_to_numbers(control_spaces))
            }
            return [message.split(String.fromCharCode(control_space_start_character))[0], converted_numbers]
        } else {
            console.log("No control spaces found...")
            return [message, []]
        }
    }

    function get_control_space_from_message(message) {
        return message.split(String.fromCharCode(control_space_start_character)).slice(-1)[0]
    }

    function split_control_spaces(all_control_spaces) {
        return all_control_spaces.split(String.fromCharCode(control_space_separator_character))
    }

    function convert_control_spaces_to_numbers(control_spaces) {
        let bitstring = ''
        for (let i = 0; i < control_spaces.length; i++) {
            if (control_spaces.charCodeAt(i) === zero_control_space) {
                bitstring += '0'
            } else if (control_spaces.charCodeAt(i) === one_control_space) {
                bitstring += '1'
            }
        }
        return parseInt(bitstring, 2)
    }

    function convert_number_array_to_control_spaces(numbers_to_convert) {
        let control_space_strings = []
        for (let number of numbers_to_convert) {
            let number_string = number.toString(2)
            control_space_strings.push(convert_number_to_control_spaces(number_string))
        }
        return control_space_strings
    }

    function convert_number_to_control_spaces(number_as_binary_string) {
        let control_space_string = ''
        for (let i = 0; i < number_as_binary_string.length; i++) {
            if (number_as_binary_string.charAt(i) === '0') {
                control_space_string += String.fromCharCode(zero_control_space)
            } else if (number_as_binary_string.charAt(i) === '1') {
                control_space_string += String.fromCharCode(one_control_space)
            }
        }
        return control_space_string
    }

    function assign_control_spaces_to_values() {

    }

    function watch_for_textarea_submit() {
        document.querySelectorAll('#joychat_input_text')[0].addEventListener("keydown", watch_for_textarea_enter_submit)

    }

    function watch_for_textarea_enter_submit(e) {
        if (e.keyCode === 13) {
            pre_submit_modifications()
        }
    }

    function watch_for_send_button_submit() {
        let j_buttons = document.querySelectorAll('.send')
        for (let j_button of j_buttons) {
            if (!observed_j_buttons.includes(j_button)) {
                j_button.addEventListener('click', pre_submit_modifications, true)
                observed_j_buttons.push(j_button)
            }
        }
    }


    function pre_submit_modifications() {
        let config_values = []

        if (settings.get('groups').get('appearance').get('loaded_settings').get('rainbow_message').get('value')) {
            config_values.push(69)
        }
        let control_spaces = convert_number_array_to_control_spaces(config_values)
        let final_control_space_string = String.fromCharCode(control_space_start_character)
        for (let control_space of control_spaces) {
            final_control_space_string += control_space
            final_control_space_string += String.fromCharCode(control_space_separator_character)
        }
        final_control_space_string = final_control_space_string.slice(0, -1)
        document.querySelectorAll('#joychat_input_text')[0].value += final_control_space_string
        console.log("Pre submit modifications done.")
    }

    // Utility Functions

    function make_text_sinebow(text_to_rainbowify) {
        let container_div = document.createElement('span')
        container_div.setAttribute('class', 'rainbow')
        container_div.style.red = 0
        let split = text_to_rainbowify.split("");
        let words = split.reduce(wrapText, container_div);
        let chars = words.children;
        let total = words.children.length;
        let t1 = gsap.timeline({repeat: -1, yoyo: true})
            .to(words, {
                red: 255,
                duration: 5,
                modifiers: {
                    red: function (x) {
                        for (let i = 0; i < total; i++) {
                            let index = i + 25 + x * 0.4;
                            chars[i].style.color = sinebow(freq, freq, freq, 0, 2, 4, index);
                        }
                        return x;
                    }
                }
            });
        t1.play()
        //setTimeout(animate, 2000, words, chars, total)
        return container_div
    }

    function animate(words, chars, total) {
        let t1 = gsap.timeline({repeat: -1})
            .set(words, {red: 0})
            .to(words, {
                red: 255,
                duration: 5,
                modifiers: {
                    red: function (x) {
                        for (let i = 0; i < total; i++) {
                            let index = i + 25 + x * 0.4;
                            chars[i].style.color = sinebow(freq, freq, freq, 0, 2, 4, index);
                        }
                        return x;
                    }
                }
            });
        t1.play()

    }

    function create_animated_button() {
        let button = document.createElement('button')
        button.onclick
    }

    function wrapText(parent, letter, i) {
        let span = document.createElement("span");
        span.textContent = letter;
        span.style.color = sinebow(freq, freq, freq, 0, 2, 4, i + 25);
        parent.appendChild(span);
        return parent;
    }

    function sinebow(freq1, freq2, freq3, phase1, phase2, phase3, i) {
        let width = 127;
        let center = 128;

        let r = Math.sin(freq1 * i + phase1) * width + center;
        let g = Math.sin(freq2 * i + phase2) * width + center;
        let b = Math.sin(freq3 * i + phase3) * width + center;

        return `rgb(${r >> 0},${g >> 0},${b >> 0})`;
    }

})
();

