// ==UserScript==
// @name         NJoyChat
// @namespace    https://www.joyclub.de/chat/login/
// @version      Alpha-v21
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
// @require      https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.9.1/math.js
// @run-at       document-idle
// ==/UserScript==

// NOTE: The DarkReader extension significantly messes with the performance. It implements "deepWatchForInlineStyles/attrObserver" which
// will attempt to overwrite the modified animation messages with new colors (Rainbow text is really terrible for this.)
// It is recommended to disable it on the site.

// Old Settings classes

let precomputed_sinebows = new Map()

class TextMacro extends Map {
    constructor(macro_id, name, macro_text) {
        super();
        this.set('macro_id', macro_id)
        this.set('name', name)
        this.set('display_name', name)
        this.set('macro_text', macro_text)
    }

    static fromJSON(json) {
        const text_macro = new TextMacro();

        text_macro.set('macro_id', json.macro_id)
        text_macro.set('name', json.name)
        text_macro.set('display_name', json.display_name)
        text_macro.set('macro_text', json.macro_text)
        return text_macro;
    }

    toJSON() {
        return {
            macro_id: this.get('macro_id'),
            name: this.get('name'),
            display_name: this.get('display_name'),
            macro_text: this.get('macro_text'),
        }
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

// New Settings Classes

function create_settings_container_div(setting) {
    let div_container = document.createElement('div');
    div_container.setting = setting
    div_container.classList.add('nj-no-overflow-container')
    return div_container
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
        settings_item_list.style.top = "2%"
        settings_item_list.style.left = "2%"
        settings_item_list.style.height = '96%'
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
        settings_detail_tab.style.overflowY = "scroll"
        settings_detail_tab.style.top = "2%"
        settings_detail_tab.style.left = "34%"
        settings_detail_tab.style.height = '96%'
        settings_detail_tab.style.width = '64%'
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
        let slide_down_animation = gsap.timeline().set(this.settings_detail_container_div.children, {
            autoAlpha: 0
        }).to(this.settings_detail_container_div.children, {
            autoAlpha: 1,
            duration: 1.5,
            stagger: {
                grid: "auto",
                from: "start",
                axis: "y",
                amount: 1
            }
        })
        this.settings_detail_container_div.hidden = false
        slide_down_animation.play()
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
        let setting_type = setting.get('type')
        if (setting_type === 'boolean') {
            let boolean_setting = new SettingItemDetailsBoolean(setting)
            return [boolean_setting.div_container]
        } else if (setting_type === 'multi_choice') {
            let multi_choice_setting = new SettingItemDetailsMultipleChoice(setting)
            return [multi_choice_setting.div_container]
        } else if (setting_type === 'string') {
            let string_setting = new SettingItemDetailsString(setting)
            return [string_setting.div_container]
        } else if (setting_type === 'section_header') {
            let section_header_setting = new SettingItemDetailsSectionHeader(setting)
            return [section_header_setting.div_container]
        } else if (setting_type === 'multi_choice_img_preview') {
            let multi_choice_image_preview_setting = new SettingItemDetailsMultipleChoiceImagePreview(setting)
            return [multi_choice_image_preview_setting.div_container]
        } else if (setting_type === 'gradient_editor') {
            let gradient_editor = new SettingItemDetailsGradientEditor(setting)
            return [gradient_editor.div_container]
        } else if (setting_type === 'text_editor_macro') {
            let macro_editor = new SettingItemDetailsTextEditor(setting)
            return [macro_editor.div_container]
        }
        let setting_details = document.createElement('p')
        let setting_display_name = setting.get('display_name')
        setting_details.textContent = 'Name: ' + setting_display_name
        return [setting_details]
    }
}

class SettingItemDetailsSectionHeader {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)
        this.divider_top = document.createElement('hr')
        this.divider_top.classList.add('nj-divider')

        this.section_header = document.createElement('p')
        this.section_header.textContent = setting.get('display_name')
        this.section_header.style.textAlign = "center"

        this.divider_bottom = document.createElement('hr')
        this.divider_bottom.classList.add('nj-divider')
        this.div_container.appendChild(this.divider_top)
        this.div_container.appendChild(this.section_header)
        this.div_container.appendChild(this.divider_bottom)
    }

}

class SettingItemDetailsBoolean {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)
        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        this.checkbox = document.createElement('input')
        this.checkbox.type = "checkbox"
        this.checkbox.id = 'settings_checkbox_' + setting.get('name')
        this.checkbox.checked = setting.get('value')
        this.checkbox.addEventListener('click', this.toggle_setting)
        this.checkbox.style.float = 'right'
        this.div_container.appendChild(this.checkbox)
    }


    toggle_setting() {
        this.parentNode.setting.set('value', !this.parentNode.setting.get('value'))
        this.parentNode.firstChild.checked = this.parentNode.setting.get('value')
        this.parentNode.setting.save_setting()
    }

}

class SettingItemDetailsString {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)
        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        this.input = document.createElement('input')
        this.input.id = 'settings_input_' + setting.get('name')
        this.input.value = setting.get('value')
        this.input.addEventListener('input', this.update_setting)
        this.input.style.float = 'right'
        this.div_container.appendChild(this.input)
    }


    update_setting(e) {
        this.parentNode.setting.set('value', e.target.value)
        //this.parentNode.firstChild.checked = this.parentNode.setting.get('value')
        this.parentNode.setting.save_setting()
    }

}

class SettingItemDetailsMultipleChoice {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)

        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        this.select = document.createElement('select')

        for (let possible_value of setting.get('possible_values')) {
            let possible_option_value = document.createElement('option')
            possible_option_value.textContent = possible_value
            if (possible_value === setting.get('value')) {
                possible_option_value.selected = true
            }
            this.select.appendChild(possible_option_value)
        }

        this.select.addEventListener('change', this.toggle_setting)
        this.select.style.float = 'right'
        this.div_container.appendChild(this.select)
    }


    toggle_setting() {
        this.parentNode.setting.set('value', this.value)
        this.parentNode.setting.save_setting()
    }

}

class SettingItemDetailsMultipleChoiceImagePreview {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)

        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        this.emoji_span = document.createElement('span')
        this.emoji_span.setAttribute('class', 'smiley')
        this.emoji_img = document.createElement('img')
        this.emoji_img.setAttribute('src', setting.get('value'))
        this.emoji_img.setAttribute('title', 'matrix')
        this.emoji_img.setAttribute('alt', 'matrix')
        this.emoji_img.onload = function () {
            resizeImage(this, 25, 9999)
        }
        this.emoji_span.appendChild(this.emoji_img)
        this.emoji_span.style.float = 'right'
        this.div_container.emoji_img = this.emoji_img // Keep reference for onchange
        this.div_container.appendChild(this.emoji_span)

        this.select = document.createElement('select')

        for (let possible_value of setting.get('possible_values')) {
            let possible_option_value = document.createElement('option')
            possible_option_value.textContent = possible_value
            if (possible_value === setting.get('value')) {
                possible_option_value.selected = true
            }
            this.select.appendChild(possible_option_value)
        }

        this.select.addEventListener('change', this.toggle_setting)
        this.select.style.float = 'right'
        this.div_container.appendChild(this.select)
    }


    toggle_setting() {
        this.parentNode.setting.set('value', this.value)
        this.parentNode.setting.save_setting()
        this.parentNode.emoji_img.setAttribute('src', this.value)
    }

}

function resizeImage(image_node, height, width) {
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
    return {width: Math.floor(srcWidth * ratio), height: Math.floor(srcHeight * ratio)};
}

class SettingItemDetailsGradientEditor {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)
        this.div_container.style.display = 'flex'
        this.div_container.style.flexDirection = 'column'
        this.div_container.style.flex = '1'
        this.div_container.preview_function = this.make_text_sinebow
        this.div_container.id = 'setting_item_detail_gradient_editor_container_' + setting.get('name')

        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        this.div_container.row_container = document.createElement('div')
        this.div_container.row_container.style.display = 'flex'
        this.div_container.row_container.style.flex = '1'
        this.div_container.row_container.id = this.div_container.id + "_row_container"
        this.div_container.rows = []
        for (let i = 0; i < 4; i++) {
            let individual_row_container = document.createElement('div')
            individual_row_container.style.display = 'flex'
            individual_row_container.style.flexDirection = 'row'
            individual_row_container.style.flex = '1'
            individual_row_container.id = this.div_container.row_container.id + '_row_' + i
            this.div_container.rows.push(individual_row_container)
            this.div_container.row_container.appendChild(individual_row_container)
        }
        this.div_container.appendChild(this.div_container.row_container)

        for (let row of this.div_container.rows) {
            let name_container = document.createElement('div')
            name_container.id = row.id + "_name_container"
            name_container.style.flexDirection = 'column'
            name_container.style.display = 'flex'
            name_container.style.flex = 1
            name_container.style.margin = '2px'
            let slider_container = document.createElement('div')
            slider_container.id = row.id + "_slider_container"
            slider_container.style.flexDirection = 'column'
            slider_container.style.display = 'flex'
            slider_container.style.flex = 1
            slider_container.style.margin = '2px'
            let number_input_container = document.createElement('div')
            number_input_container.id = row.id + "_number_input_container"
            number_input_container.style.flexDirection = 'column'
            number_input_container.style.display = 'flex'
            number_input_container.style.flex = 1
            number_input_container.style.margin = '2px'
            row.appendChild(name_container)
            row.appendChild(slider_container)
            row.appendChild(number_input_container)
        }

        let value = setting.get('value')
        let names = ['Frequenz Rot', 'Frequenz Grün', 'Frequenz Blau', 'Phase Rot', 'Phase Grün', 'Phase Blau', 'Amplitude Rot', 'Amplitude Grün', 'Amplitude Blau', 'DC Rot', 'DC Grün', 'DC Blau']
        for (let i = 0; i < value.length - 2; i++) {
            this.create_value_slider(this.div_container.rows[Math.floor(i / 3)], i, '-3.13', '3.13', '0.01', names[i])
        }
        this.div_container.appendChild(this.create_parentless_value_slider(value.length - 2, '0', '2', '0.0001', 'Gradient Repetition'))
        this.div_container.appendChild(this.create_parentless_value_slider(value.length - 1, '1', '30', '0.01', 'Gradient Speed (Seconds)'))
        let demo_div = this.make_text_sinebow('Das hier ist ein Demo Text der lang genug sein muss, um den Farbverlauf wirklich gut darzustellen.', this.div_container.setting.get('value'))
        demo_div.id = 'demo_div_gradient'
        this.div_container.appendChild(demo_div)
        this.demo_refresh_button = document.createElement('button')
        this.demo_refresh_button.innerText = 'Demo neu laden'
        this.demo_refresh_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        this.demo_refresh_button.addEventListener("click", this.update_demo_div)
        this.demo_refresh_button.id = 'update_demo_div'
        this.div_container.appendChild(this.demo_refresh_button)
    }

    update_demo_div() {
        let new_demo_div = this.parentNode.preview_function('Das hier ist ein Demo Text der lang genug sein muss, um den Farbverlauf wirklich gut darzustellen.', this.parentNode.setting.get('value'))
        console.log('Created new demo div with gradient settings', this.parentNode.setting.get('value'))
        console.log('Demo divs (new/old):', new_demo_div, this.parentNode.querySelectorAll('#demo_div_gradient'))
        setTimeout(function () {
            for (let old_demo_div of this.parentNode.querySelectorAll('#demo_div_gradient')) {
                console.log('Removing: ', old_demo_div)
                old_demo_div.t1.kill()
                old_demo_div.innerHTML = ''
                old_demo_div.remove()
                console.log(old_demo_div)
            }
        }, 5000)
        setTimeout(function (new_demo_div) {
            new_demo_div.id = 'demo_div_gradient'
        }, 10000, new_demo_div)

        this.parentNode.appendChild(new_demo_div)
        console.log('Added', new_demo_div)
    }

    create_value_slider(parent, value_index, min, max, step, name) {
        let name_paragraph = document.createElement('p')
        name_paragraph.textContent = name
        name_paragraph.style.margin = '2px'
        name_paragraph.style.flex = 1
        name_paragraph.style.textAlign = 'center'

        let slider = document.createElement('input')
        slider.type = 'range'
        slider.min = min
        slider.max = max
        slider.step = step
        slider.value_index = value_index
        slider.digits = step.substring(2).length
        slider.value = this.div_container.setting.get('value')[value_index]
        slider.style.margin = '2px'
        slider.style.flex = '1'
        slider.style.flex = 1
        slider.addEventListener('change', this.update_number_input_and_value)

        let number_input = document.createElement('input')
        number_input.min = min
        number_input.max = max
        number_input.step = step
        number_input.value_index = value_index
        number_input.digits = step.substring(2).length
        number_input.value = this.div_container.setting.get('value')[value_index]
        number_input.style.margin = '2px'
        number_input.style.flex = 1
        // This will get handled by the flexbox container...
        number_input.style.width = '100%'
        number_input.addEventListener('change', this.update_slider_and_value)

        number_input.slider = slider
        slider.number_input = number_input
        parent.childNodes[0].appendChild(name_paragraph)
        parent.childNodes[1].appendChild(slider)
        parent.childNodes[2].appendChild(number_input)
    }

    create_parentless_value_slider(value_index, min, max, step, name) {
        let value_slider_container = document.createElement('div')
        value_slider_container.style.flex = '1'
        value_slider_container.style.display = 'flex'
        let name_paragraph = document.createElement('p')
        name_paragraph.textContent = name
        name_paragraph.style.margin = '2px'
        name_paragraph.style.width = '33%'
        value_slider_container.appendChild(name_paragraph)
        let slider = document.createElement('input')
        slider.type = 'range'
        slider.min = min
        slider.max = max
        slider.step = step
        slider.value_index = value_index
        slider.digits = step.substring(2).length
        slider.value = this.div_container.setting.get('value')[value_index]
        slider.style.margin = '2px'
        slider.style.flex = '1'
        slider.style.width = '33%'
        slider.addEventListener('change', this.update_number_input_and_value)
        let number_input = document.createElement('input')
        number_input.min = min
        number_input.max = max
        number_input.step = step
        number_input.value_index = value_index
        number_input.digits = step.substring(2).length
        number_input.value = this.div_container.setting.get('value')[value_index]
        number_input.style.margin = '2px'
        number_input.style.flex = '1'
        number_input.style.minWidth = '0'
        number_input.style.width = '33%'
        slider.number_input = number_input
        number_input.slider = slider
        number_input.addEventListener('change', this.update_slider_and_value)
        value_slider_container.appendChild(slider)
        value_slider_container.appendChild(number_input)
        return value_slider_container
    }

    update_slider_and_value() {
        let parent_node = this.parentNode
        while (!(parent_node.setting instanceof Map)) {
            parent_node = parent_node.parentNode
        }
        let currentValue = parent_node.setting.get('value')
        currentValue[this.value_index] = parseFloat(this.value).toFixed(this.digits)
        if (this.slider.value !== this.value) {
            this.slider.value = parseFloat(this.value).toFixed(this.digits)
        }
        parent_node.setting.set('value', currentValue)
        console.log('Set value to:', currentValue)
    }

    update_number_input_and_value() {
        let parent_node = this.parentNode
        while (!(parent_node.setting instanceof Map)) {
            parent_node = parent_node.parentNode
        }
        let currentValue = parent_node.setting.get('value')
        currentValue[this.value_index] = parseFloat(this.value).toFixed(this.digits)
        if (this.number_input.value !== this.value) {
            this.number_input.value = parseFloat(this.value).toFixed(this.digits)
        }
        parent_node.setting.set('value', currentValue)
        console.log('Set value to:', currentValue)
    }

    make_text_sinebow(text_to_rainbowify, gradient_settings) {
        let container_div = document.createElement('span')
        container_div.setAttribute('class', 'rainbow')
        container_div.style.red = 0
        let split = text_to_rainbowify.split("");
        let words = split.reduce(wrapText, container_div);
        let chars = words.children;
        let total = words.children.length;
        let freq1 = parseFloat(gradient_settings[0])
        let freq2 = parseFloat(gradient_settings[1])
        let freq3 = parseFloat(gradient_settings[2])
        let phase1 = parseFloat(gradient_settings[3])
        let phase2 = parseFloat(gradient_settings[4])
        let phase3 = parseFloat(gradient_settings[5])
        let amp1 = parseFloat(gradient_settings[6])
        let amp2 = parseFloat(gradient_settings[7])
        let amp3 = parseFloat(gradient_settings[8])
        let dc1 = parseFloat(gradient_settings[9])
        let dc2 = parseFloat(gradient_settings[10])
        let dc3 = parseFloat(gradient_settings[11])
        let repetition = parseFloat(gradient_settings[12])
        let gradient_speed = parseFloat(gradient_settings[13])
        container_div.t1 = gsap.timeline({repeat: -1, yoyo: true})
            .to(words, {
                red: 255,
                step: 1,
                duration: gradient_speed,
                modifiers: {
                    red: function (x) {
                        let active_sinebow
                        if (precomputed_sinebows.has(gradient_settings.toString())) {
                            active_sinebow = precomputed_sinebows.get(gradient_settings.toString())
                        } else {
                            active_sinebow = new Map()
                            precomputed_sinebows.set(gradient_settings.toString(), active_sinebow)
                            console.log(precomputed_sinebows)
                        }
                        for (let i = 0; i < total; i++) {
                            let index = i + 25 + x * repetition;
                            index = +index.toFixed(2)
                            if (active_sinebow.has(index)) {
                                chars[i].style.color = active_sinebow.get(index);
                            } else {
                                let computed_sinebow = sinebow(freq1, freq2, freq3, phase1, phase2, phase3, amp1, amp2, amp3, dc1, dc2, dc3, index)
                                active_sinebow.set(index, computed_sinebow)
                                chars[i].style.color = computed_sinebow
                            }
                        }
                        return x;
                    }
                }
            });
        container_div.t1.play()
        return container_div
    }
}

function wrapText(parent, letter, i) {
    let span = document.createElement("span");
    span.textContent = letter;
    span.style.color = sinebow(1, 1, 1, 0, 2, 4, i + 25);
    parent.appendChild(span);
    return parent;
}

function sinebow(freq1, freq2, freq3, phase1, phase2, phase3, amp1, amp2, amp3, dc1, dc2, dc3, i) {
    let width = 127;
    let center = 128;
    let r = Math.sin(Math.cos((freq1 * i + phase1)) * amp1 + dc1) * width + center;
    let g = Math.sin(Math.cos((freq2 * i + phase2)) * amp2 + dc2) * width + center;
    let b = Math.sin(Math.cos((freq3 * i + phase3)) * amp3 + dc3) * width + center;
    return `rgb(${r >> 0},${g >> 0},${b >> 0})`;
}

class SettingItemDetailsTextEditor {

    constructor(setting) {
        this.div_container = create_settings_container_div(setting)
        this.div_container.style.display = 'flex'
        this.div_container.style.flexDirection = 'column'
        this.div_container.style.flex = '1'
        this.div_container.id = 'setting_item_detail_text_editor_container_' + setting.get('name')

        let setting_details = document.createElement('p')
        setting_details.textContent = setting.get('display_name') + ':'
        setting_details.style.float = 'left'
        this.div_container.appendChild(setting_details)

        let macros = setting.get('value')
        let loaded_macros = []
        for (let macro of macros) {
            loaded_macros.push(TextMacro.fromJSON(JSON.parse(macro)))
        }

        this.select = document.createElement('select')

        if (loaded_macros.length === 0) {
            let new_macro_option = document.createElement('option')
            new_macro_option.textContent = ''
            new_macro_option.value_index = -2
            this.select.appendChild(new_macro_option)
        } else {
            for (let i = 0; i < loaded_macros.length; i++) {
                let possible_option_value = document.createElement('option')
                possible_option_value.textContent = loaded_macros[i].get('display_name')
                possible_option_value.value_index = i
                this.select.appendChild(possible_option_value)
            }
        }

        let new_macro_option = document.createElement('option')
        new_macro_option.textContent = 'Create New Macro'
        new_macro_option.value_index = -1
        this.select.appendChild(new_macro_option)

        this.select.addEventListener('change', this.toggle_setting)
        this.select.style.float = 'right'
        this.div_container.select = this.select
        // Pass function references to child elements in an insane way because javascript chose violence.
        this.div_container.set_editor_fields = this.set_editor_fields
        this.div_container.clear_editor_fields = this.clear_editor_fields
        this.div_container.appendChild(this.select)

        this.delete_macro_button = document.createElement('button')
        this.delete_macro_button.textContent = 'Delete Macro'
        this.delete_macro_button.setAttribute('class', " nj-button__content nsecondary nj-button")
        this.delete_macro_button.addEventListener('click', this.delete_macro)
        this.div_container.appendChild(this.delete_macro_button)

        this.div_container.appendChild(this.create_macro_editor())
    }

    create_macro_editor() {
        let macro_editor_container = document.createElement('div')
        macro_editor_container.id = this.div_container.id + '_macro_editor_container'
        macro_editor_container.style.display = 'flex'
        macro_editor_container.style.flex = 1
        macro_editor_container.style.flexDirection = 'column'

        let macro_id_editor = document.createElement('input')
        macro_id_editor.id = macro_editor_container.id + '_id_editor'
        macro_id_editor.macro_field = 'macro_id'
        macro_id_editor.style.display = 'flex'
        macro_id_editor.addEventListener('change', this.update_macro_field)
        macro_editor_container.appendChild(this.create_label_input_container("Macro ID", macro_id_editor))

        let macro_name_editor = document.createElement('input')
        macro_name_editor.id = macro_editor_container.id + '_name_editor'
        macro_name_editor.macro_field = 'name'
        macro_name_editor.style.display = 'flex'
        macro_name_editor.addEventListener('change', this.update_macro_field)
        macro_editor_container.appendChild(this.create_label_input_container('Macro Name', macro_name_editor))

        let macro_display_name_editor = document.createElement('input')
        macro_display_name_editor.id = macro_editor_container.id + '_display_name_editor'
        macro_display_name_editor.macro_field = 'display_name'
        macro_display_name_editor.style.display = 'flex'
        macro_display_name_editor.addEventListener('change', this.update_macro_field)
        macro_editor_container.appendChild(this.create_label_input_container('Macro Display Name', macro_display_name_editor))

        let macro_text_editor = document.createElement('input')
        macro_text_editor.id = macro_editor_container.id + '_macro_text_editor'
        macro_text_editor.macro_field = 'macro_text'
        macro_text_editor.style.display = 'flex'
        macro_text_editor.addEventListener('change', this.update_macro_field)
        macro_editor_container.appendChild(this.create_label_input_container('Macro Text Editor', macro_text_editor))

        return macro_editor_container
    }

    create_label_input_container(label_name, input) {
        let label_input_container = document.createElement('div')
        label_input_container.style.display = 'flex'
        label_input_container.style.flex = '1'
        label_input_container.style.flexDirection = 'row'
        let label = document.createElement('label')
        label.setAttribute('for', input.id)
        label.innerText = label_name
        label.style.display = 'flex'
        label.style.flex = '1'
        label_input_container.appendChild(label)
        label_input_container.appendChild(input)
        return label_input_container
    }

    update_macro_field() {
        let parentNode = this.parentNode.parentNode.parentNode;
        let current_value = parentNode.setting.get('value')
        let macro_to_change = TextMacro.fromJSON(JSON.parse(current_value[parentNode.select.selectedOptions[0].value_index]))
        macro_to_change.set(this.macro_field, this.value)
        current_value[parentNode.select.selectedOptions[0].value_index] = JSON.stringify(macro_to_change)
        parentNode.setting.set('value', current_value)
    }

    set_editor_fields(macro, container_id) {
        let macro_editor_container = document.getElementById(container_id)
        for (let child of macro_editor_container.childNodes) {
            child.childNodes[1].value = macro.get(child.childNodes[1].macro_field)
        }
    }

    clear_editor_fields(container_id){
        console.log(container_id)
        let macro_editor_container = document.getElementById(container_id)
        for (let child of macro_editor_container.childNodes) {
            child.childNodes[1].value = ''
        }
    }

    delete_macro() {
        let current_value = this.parentNode.setting.get('value')
        let select = this.parentNode.select;
        let current_value_index = select.selectedOptions[0].value_index
        if (current_value_index !== -2 && current_value_index !== -1) { // Don't delete the placeholder node. This is handled by create new macro automatically.
            current_value.splice(current_value_index, 1)
            if (current_value.length === 0) { // Create placeholder node so create new macro can fire 'on change'
                let new_macro_option = document.createElement('option')
                new_macro_option.textContent = ''
                new_macro_option.value_index = -2
                select.firstChild.before(new_macro_option)
                this.parentNode.clear_editor_fields(this.parentNode.id + '_macro_editor_container')
            } else {
                this.parentNode.set_editor_fields(TextMacro.fromJSON(JSON.parse(current_value[0])), this.parentNode.id + '_macro_editor_container')
            }
            select.selectedOptions[0].remove()
            select.firstChild.selected = true
            let new_numbering = 0
            for (let child of select.children) {
                if (child.value_index !== -1 && child.value_index !== -2) {
                    child.value_index = new_numbering
                    new_numbering += 1
                }
            }
            this.parentNode.setting.set('value', current_value)
        }
    }

    toggle_setting() {
        let current_value = this.parentNode.setting.get('value')
        let value_index = this.selectedOptions[0].value_index
        let text_macro
        if (value_index === -1) {
            if (current_value.length === 0) {
                this.removeChild(this.firstChild)
            }
            text_macro = new TextMacro(current_value.length + 1, 'New Macro #' + (current_value.length + 1), 'Insert your macro text here.')
            current_value.push(JSON.stringify(text_macro))
            this.parentNode.setting.set('value', current_value)
            let possible_option_value = document.createElement('option')
            possible_option_value.textContent = text_macro.get('display_name')
            possible_option_value.value_index = current_value.length - 1
            this.lastChild.before(possible_option_value)
            this.selectedOptions[0].selected = false
            possible_option_value.selected = true
        } else {
            text_macro = TextMacro.fromJSON(JSON.parse(current_value[value_index]))
        }
        this.parentNode.set_editor_fields(text_macro, this.parentNode.id + '_macro_editor_container')
    }


}

(async () => {
        'use strict';

        // Add CSS Styles before anything else to ensure they are always available
        GM.addStyle(".nj-button__content {text-align: center; font-size: 14px; font-weight: bold; padding: 8px 24px; margin: 2px 2px 2px 2px; font-family: JC-ProximaNovaSoft, Verdana, Arial, Helvetica, sans-serif; align-items: center; line-height: 1;}");
        GM.addStyle(".nsecondary {background: #45484a; color: #f1f1f1; border-color: #515455;}");
        GM.addStyle(".nj-button {white-space: nowrap; cursor: pointer; box-sizing: border-box; border: 2px; border-radius: 8px;}")
        GM.addStyle(".nj-focus {z-index: 9999; position: absolute; backdrop-filter: blur(2px); width: 100%; height: 100%;}")
        GM.addStyle(".nj-divider {border-top: 3px solid #bbb; border-radius: 5px}")
        GM.addStyle(".nj-no-overflow-container {overflow: hidden; margin: 1%}")

        gsap.registerPlugin(ScrollTrigger)
        gsap.registerPlugin(TextPlugin)
        let font_array = '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃'
        let njoy_emojis = new Map([['#test#', 'https://forumstatic.oneplusmobile.com/opforum-gl/upload/image/app/thread/20230204/2780603194562714301/1258923422265114625/1258923422265114625.gif']])
        let giphy_url = "https://giphy.com/gifs/"
        let IMAGE_MAX_WIDTH = 250
        let IMAGE_MAX_HEIGHT = 250
        let freq = Math.PI * 2 / 100; // TODO Possibly make this global or a config value?
        let username_self = undefined
        let emoji_list = ["",
            "//cfnimg.joyclub.de/smile/g.gif",
            "https://thumbs.gfycat.com/BrilliantRespectfulIndianpangolin.webp",
            "//cfnimg.joyclub.de/smile/fiesgrins.gif",
            "//cfnimg.joyclub.de/smile/zwinker.gif",
            "//cfnimg.joyclub.de/smile/fiesgrins.gif",
            "//cfnimg.joyclub.de/smile/lach.gif",
            "//cfnimg.joyclub.de/smile/juhu.gif",
            "//cfnimg.joyclub.de/smile/heul.gif",
            "//cfnimg.joyclub.de/smile/flenn.gif",
            "//cfnimg.joyclub.de/smile/taetschel.gif",
            "//cfnimg.joyclub.de/smile/liebhab.gif",
            "//cfnimg.joyclub.de/smile/herz.gif",
            "//cfnimg.joyclub.de/smile/love.gif",
            "//cfnimg.joyclub.de/smile/herz3.gif",
            "//cfnimg.joyclub.de/smile/herz4.gif",
            "//cfnimg.joyclub.de/smile/love3.gif",
            "//cfnimg.joyclub.de/smile/kuschel.gif",
            "//cfnimg.joyclub.de/smile/bunny.gif",
            "//cfnimg.joyclub.de/smile/dd.gif",
            "//cfnimg.joyclub.de/smile/fessel.gif",
            "//cfnimg.joyclub.de/smile/paddle.gif",
            "//cfnimg.joyclub.de/smile/spank.gif",
            "//cfnimg.joyclub.de/smile/engel.gif",
            "//cfnimg.joyclub.de/smile/hexe.gif",
            "//cfnimg.joyclub.de/smile/opa.gif",
            "//cfnimg.joyclub.de/smile/oma.gif",
            "//cfnimg.joyclub.de/smile/jedi.gif",
            "//cfnimg.joyclub.de/smile/jedi2.gif",
            "//cfnimg.joyclub.de/smile/yoda.gif",
            "//cfnimg.joyclub.de/smile/teufel.gif",
            "//cfnimg.joyclub.de/smile/gaehn.gif",
            "//cfnimg.joyclub.de/smile/zzz.gif",
            "//cfnimg.joyclub.de/smile/gehirnschnecke.gif",
            "//cfnimg.joyclub.de/smile/schweig.gif",
            "//cfnimg.joyclub.de/smile/einhorn.gif",
            "//cfnimg.joyclub.de/smile/fancycat.gif",
            "//cfnimg.joyclub.de/smile/pegasus.gif",
            "https://cdn-icons-png.flaticon.com/512/1494/1494976.png",
            "//cfnimg.joyclub.de/smile/matrix.gif"]
        let objects_to_load = ['macros', 'greetings', 'settings']
        let settings = await load_settings()
        let SCROLLBACK_BUFFER = parseInt(settings.get('groups').get('general').get('loaded_settings').get('scrollback_buffer').get('value'))
        //let macros = load_text_macros()
        //let auto_greetings = load_auto_greetings()
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
                create_macro_buttons()
                //create_auto_greeting_admin_buttons()
                watch_for_textarea_submit()
            }
        }

        function create_close_and_save_settings_button() {
            let hide_settings_button = document.createElement('button')
            hide_settings_button.innerText = 'Einstellungen'
            hide_settings_button.setAttribute('class', " nj-button__content nsecondary nj-button")
            hide_settings_button.addEventListener("click", toggle_settings_window)
            hide_settings_button.id = 'hide_settings_window_button'
            document.getElementById('njoy_settings_window').appendChild(hide_settings_button)
        }

        async function load_settings() {
            let loaded_settings = await GM.getValue('settings')
            let settings_collection
            if (loaded_settings === undefined) {
                settings_collection = create_default_settings()
            } else {
                settings_collection = SettingsCollection.fromJSON(JSON.parse(loaded_settings))
                compare_settings(create_default_settings(), settings_collection)
            }
            console.log(settings_collection)
            //console.log(JSON.stringify(settings_collection))
            return settings_collection
        }

        function compare_settings(original_settings, settings_to_compare) {
            compare_settings_node(original_settings, settings_to_compare, original_settings, settings_to_compare, original_settings, settings_to_compare, undefined)
        }

        function compare_settings_node(original_settings, settings_to_compare, original_node_parent, active_compare_parent, active_original_node, active_compare_node, key) {
            if (active_original_node instanceof Map) {
                for (let original_key of active_original_node.keys()) {
                    if (active_compare_node.has(original_key)) {
                        //console.log('Was map and had key. Recursing deeper: ', active_original_node, original_key)
                        compare_settings_node(original_settings, settings_to_compare, active_original_node, active_compare_node, active_original_node.get(original_key), active_compare_node.get(original_key), original_key)
                    } else {
                        //console.log("Was map and didn't have key. Copying...", original_key, active_original_node.get(original_key))
                        active_compare_node.set(original_key, active_original_node.get(original_key))
                    }
                }
                // The order of map entries depends on insertion order. If we inserted a new key, it will be added to the end.
                // We restore the structure of the original map by first copying to a buffer map, clearing, and then reinserting
                // in the correct order of the original map (whose keys should all be within our new map). This has the added
                // benefit of pruning the old map of any superfluous keys.
                let buffer_map = new Map()
                for (let compare_key of active_compare_node.keys()) {
                    buffer_map.set(compare_key, active_compare_node.get(compare_key))
                }
                active_compare_node.clear()
                for (let original_key of active_original_node.keys()) {
                    active_compare_node.set(original_key, buffer_map.get(original_key))
                }
            } else {
                if (active_original_node === active_compare_node) {
                    //console.log('Same value', active_original_node)
                } else {
                    //console.log('Values differed', active_original_node, active_compare_node)
                    if (key !== 'value') {
                        //console.log("Key wasn't 'value', so we're overwriting.", key, original_node_parent.get(key))
                        active_compare_parent.set(key, original_node_parent.get(key))
                    }
                }
            }

        }

        function create_default_settings() {
            let settings_collection = new SettingsCollection(new Map())
            let general_settings_group = new SettingsGroup('general', 'Allgemein', undefined)
            let chat_setting_header = new Setting('chat_setting_header', 'Chat Einstellungen', 'section_header', general_settings_group.get('name'), 'Chat Einstellungen', ['Chat Einstellungen'])
            general_settings_group.add_setting(chat_setting_header)
            let scrollback_buffer_setting = new Setting('scrollback_buffer', 'Gleichzeitig angezeigte Nachrichten', 'string', general_settings_group.get('name'), '50', ['50', '100', '150', 'Infinite'])
            general_settings_group.add_setting(scrollback_buffer_setting)
            let appearance_settings_group = create_default_appearance_group_settings()
            let macro_settings_group = new SettingsGroup('macros', 'Macros', undefined)
            let macro_editor_setting = new Setting('macro_editor_setting', 'Macro Editor', 'text_editor_macro', macro_settings_group.get('name'), [], [])
            macro_settings_group.add_setting(macro_editor_setting)
            let auto_greet_settings_group = new SettingsGroup('auto_greet', 'Auto-Begrüßung', undefined)
            settings_collection.add_group(general_settings_group)
            settings_collection.add_group(appearance_settings_group)
            settings_collection.add_group(macro_settings_group)
            settings_collection.add_group(auto_greet_settings_group)
            return settings_collection
        }

        function create_default_appearance_group_settings() {
            let appearance_settings_group = new SettingsGroup('appearance', 'Darstellung', undefined)
            let maskotchen_header = new Setting('maskotchen_header', 'Maskotchen Einstellungen', 'section_header', appearance_settings_group.get('name'), 'Maskotchen Einstellungen', ['Maskotchen Einstellungen'])
            appearance_settings_group.add_setting(maskotchen_header)
            let maskotchen_setting = new Setting('Maskotchen', 'Maskotchen', 'multi_choice_img_preview', appearance_settings_group.get('name'), 'https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif', ['https://media.tenor.com/nRbxbNMYMF0AAAAi/stitch-run.gif', 'https://media.tenor.com/fSsxftCb8w0AAAAi/pikachu-running.gif', '//cfnimg.joyclub.de/smile/pegasus.gif', '//cfnimg.joyclub.de/smile/einhorn.gif'])
            appearance_settings_group.add_setting(maskotchen_setting)
            let maskotchen_enabled_setting = new Setting('maskotchen_enabled', 'Maskotchen An/Aus', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(maskotchen_enabled_setting)
            let font_header = new Setting('font_header', 'Schrift Einstellungen', 'section_header', appearance_settings_group.get('name'), 'Schrift Einstellungen', ['Schrift Einstellungen'])
            appearance_settings_group.add_setting(font_header)
            let rainbow_font_setting = new Setting('rainbow_message', 'Farbverlauf Schrift An/Aus', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(rainbow_font_setting)
            let rainbow_font_disable_globally_setting = new Setting('disable_rainbow_message_globally', 'Farbverlauf Schrift An/Aus (Global)', 'boolean', appearance_settings_group.get('name'), false, [true, false])
            appearance_settings_group.add_setting(rainbow_font_disable_globally_setting)
            let rainbow_font_disable_externally_setting = new Setting('disable_rainbow_message_externally', 'Farbverlauf Schrift An/Aus (Andere)', 'boolean', appearance_settings_group.get('name'), false, [true, false])
            appearance_settings_group.add_setting(rainbow_font_disable_externally_setting)
            let custom_font_setting = new Setting('custom_font_message', 'Schnörkel Schrift', 'boolean', appearance_settings_group.get('name'), false, [true, false])
            appearance_settings_group.add_setting(custom_font_setting)
            let gradient_editor_message = new Setting('gradient_editor_message_setting', 'Farbverlauf Editor Nachricht', 'gradient_editor', appearance_settings_group.get('name'), [0.49, -0.51, -0.32, 1.59, 0.67, 0.59, 1.53, -0.69, 0.05, 0.25, 0.20, 0.06, 0.19087628, 15.50], [0.49, -0.51, -0.32, 1.59, 0.67, 0.59, 1.53, -0.69, 0.05, 0.25, 0.20, 0.06, 0.19087628, 0.19087628])
            appearance_settings_group.add_setting(gradient_editor_message)
            let username_header = new Setting('username_header', 'Username Einstellungen', 'section_header', appearance_settings_group.get('name'), 'Username Einstellungen', ['Username Einstellungen'])
            appearance_settings_group.add_setting(username_header)
            let rainbow_user_name = new Setting('username_rainbow', 'Farbverlauf Username An/Aus', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(rainbow_user_name)
            let rainbow_username_disable_globally_setting = new Setting('disable_rainbow_username_globally', 'Farbverlauf Username An/Aus (Global)', 'boolean', appearance_settings_group.get('name'), false, [true, false])
            appearance_settings_group.add_setting(rainbow_username_disable_globally_setting)
            let rainbow_username_disable_externally_setting = new Setting('disable_rainbow_username_externally', 'Farbverlauf Username An/Aus (Andere)', 'boolean', appearance_settings_group.get('name'), false, [true, false])
            appearance_settings_group.add_setting(rainbow_username_disable_externally_setting)
            let gradient_editor_username = new Setting('gradient_editor_username_setting', 'Farbverlauf Editor Username', 'gradient_editor', appearance_settings_group.get('name'), [0.49, -0.51, -0.32, 1.59, 0.67, 0.59, 1.53, -0.69, 0.05, 0.25, 0.20, 0.06, 0.19087628, 15.50], [0.49, -0.51, -0.32, 1.59, 0.67, 0.59, 1.53, -0.69, 0.05, 0.25, 0.20, 0.06, 0.19087628, 0.19087628])
            appearance_settings_group.add_setting(gradient_editor_username)
            let username_picture_setting = new Setting('username_picture', 'Username Icon An/Aus', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(username_picture_setting)
            let username_picture_replace_gender_setting = new Setting('username_picture_replace_gender', 'Username Icon Statt Geschlecht', 'boolean', appearance_settings_group.get('name'), true, [true, false])
            appearance_settings_group.add_setting(username_picture_replace_gender_setting)
            let username_picture_choice_setting = new Setting('username_picture_choice', 'Username Icon Wahl', 'multi_choice_img_preview', appearance_settings_group.get('name'), "", emoji_list)
            appearance_settings_group.add_setting(username_picture_choice_setting)

            return appearance_settings_group
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
                let slide_down_animation = gsap.timeline().set(settings_window_container, {
                    autoAlpha: 0
                }).to(settings_window_container, {
                    autoAlpha: 1,
                    duration: 1,
                })
                slide_down_animation.play()
            } else {
                await settings.save_settings()
                settings = await load_settings()

                let slide_down_animation = gsap.timeline().set(settings_window_container, {
                    autoAlpha: 1
                }).to(settings_window_container, {
                    autoAlpha: 0,
                    duration: 1,
                })
                await slide_down_animation.play().then(() => {
                    settings_window_container.remove()
                })
                create_settings_window()
                settings_menu = new SettingsMenu(settings)
                create_close_and_save_settings_button()
                clear_macro_buttons()
                create_macro_buttons()
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
            parent_container.appendChild(macro_buttons_container)
            parent_container.appendChild(auto_greet_admin_buttons_container)
            parent_container.appendChild(auto_greet_buttons_container)
            let toolbar = document.querySelectorAll('.toolbar')[0]
            if (toolbar !== null) {
                toolbar.after(parent_container)
            }
        }

        function create_macro_buttons() {
            for (const macro of settings.get('groups').get('macros').get('loaded_settings').get('macro_editor_setting').get('value')) {
                if (document.getElementById("njoy_macro_buttons_container") !== undefined && document.getElementById("njoy_macro_buttons_container") !== null) {
                    document.getElementById("njoy_macro_buttons_container").appendChild(add_button(TextMacro.fromJSON(JSON.parse(macro)), false))
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
            //document.getElementById('njoy_function_buttons_container').appendChild(conversion_button)
            let show_settings_container = document.createElement('div')
            show_settings_container.setAttribute('class', 'fl_r')
            show_settings_container.style.boxSizing = 'border-box'
            show_settings_container.style.alignSelf = 'stretch'
            show_settings_container.style.marginTop = '0px'
            show_settings_container.style.marginBottom = '0px'
            show_settings_container.style.height = "100%"
            let show_settings_button = document.createElement('button')
            show_settings_button.innerText = 'Einstellungen'
            show_settings_button.setAttribute('class', " nj-button__content nsecondary nj-button")
            show_settings_button.addEventListener("click", toggle_settings_window)
            show_settings_button.id = 'show_settings_window_button'

            show_settings_container.appendChild(show_settings_button)
            document.querySelector('div.bell_switch').parentNode.appendChild(show_settings_container)
            document.querySelector('div.bell_switch').parentNode.insertBefore(document.querySelector('div.bell_switch'), show_settings_container)
            //document.getElementById('njoy_function_buttons_container').appendChild(show_settings_button)
            create_close_and_save_settings_button()
            let show_auto_greet_admin_button = document.createElement('button')
            show_auto_greet_admin_button.innerText = 'Toggle Auto-greet Admin.'
            show_auto_greet_admin_button.setAttribute('class', " nj-button__content nsecondary nj-button")
            show_auto_greet_admin_button.addEventListener("click", toggle_auto_greet_admin_container_visibility)
            show_auto_greet_admin_button.id = 'toggle_auto_greet_admin_button'
            document.getElementById('njoy_function_buttons_container').appendChild(show_auto_greet_admin_button)
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

        function add_button(macro, custom_onclick) {
            let macro_button = document.createElement('button')
            macro_button.innerText = macro.get('name')
            macro_button.setAttribute('class', " nj-button__content ")
            macro_button.classList.add('nsecondary')
            macro_button.classList.add('nj-button')
            console.log("Adding button for macro:")
            console.log(macro)
            console.log("Custom onclick:")
            console.log(custom_onclick)
            if (custom_onclick === false) {
                macro_button.addEventListener('click', function () {
                    say_macro(macro.get('macro_text'))
                })
            }
            macro_button.id = "macro_button_" + macro.get('macro_id')
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
                let special_characters = ['*', '@', '#']
                for (let word_to_convert of words) {
                    if (!special_characters.includes(word_to_convert[0]) && !special_characters.includes(word_to_convert[word_to_convert.length - 1])) {
                        converted_text += ' ' + convert_string_to_custom_font(word_to_convert)
                    } else {
                        converted_text += ' ' + word_to_convert
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
                        handle_chat_message_addition(truly_new)
                        handle_chat_message_removal(truly_removed);
                        if (m[0].target.children.length >= SCROLLBACK_BUFFER) {
                            m[0].target.removeChild(m[0].target.firstChild)
                        }
                    });
                    observed_chat_outputs.push(joychat_output)
                }
            }
        }

        function handle_chat_message_addition(added_nodes) {
            for (let added_node of added_nodes) {
                let actual_chat_content = added_node.querySelector('p')
                let new_chat_content = document.createElement('p')
                let control_codes = undefined
                let lucky_punch = process_control_spaces(actual_chat_content.childNodes[actual_chat_content.childNodes.length - 1].nodeValue)
                console.log('Lucky punch! ', lucky_punch)
                if (lucky_punch[1].length === 0) {
                    // didn't find control spaces on first try, keep digging.
                    for (let i = actual_chat_content.childNodes.length - 1; i >= 0; i--) {
                        let message = actual_chat_content.childNodes[i]
                        if (message.nodeType !== Node.TEXT_NODE) {
                            new_chat_content.appendChild(message)
                            new_chat_content.insertBefore(message, new_chat_content.firstChild)
                        } else {
                            let text = message.nodeValue
                            if (control_codes === undefined) {
                                let text_and_control_spaces = process_control_spaces(text)
                                text = text_and_control_spaces[0]
                                if (text_and_control_spaces[1].length !== 0) {
                                    control_codes = text_and_control_spaces[1]
                                }
                            }
                            let possible_emoji_children = check_for_njoy_emojis(text)
                            for (let possible_child of possible_emoji_children) {
                                if (possible_child.nodeType !== Node.TEXT_NODE) {
                                    new_chat_content.appendChild(possible_child)
                                    new_chat_content.insertBefore(possible_child, new_chat_content.firstChild)
                                } else {
                                    //new_node.appendChild(possible_child.nodeValue)
                                    if (control_codes !== undefined && control_codes.length !== 0) {
                                        if (control_codes[0] === 69) {
                                            let rainbow_text = make_text_sinebow(possible_child.nodeValue)
                                            new_chat_content.appendChild(rainbow_text)
                                            new_chat_content.insertBefore(rainbow_text, new_chat_content.firstChild)
                                        } else {
                                            new_chat_content.appendChild(possible_child)
                                            new_chat_content.insertBefore(possible_child, new_chat_content.firstChild)
                                        }
                                    } else {
                                        new_chat_content.appendChild(possible_child)
                                        new_chat_content.insertBefore(possible_child, new_chat_content.firstChild)
                                    }
                                }
                            }
                        }
                    }
                } else {
                    console.log('found spaces')
                    // found control spaces on first try.
                    actual_chat_content.childNodes[actual_chat_content.childNodes.length - 1].nodeValue = lucky_punch[0]
                    control_codes = lucky_punch[1]
                    let individual_control_codes = split_control_codes(control_codes)
                    let control_code_map = new Map()
                    control_code_map.set(1, first_control_code)
                    control_code_map.set(2, second_control_code_handling)
                    control_code_map.set(3, text_control_code_handler)
                    control_code_map.set(4, chat_message_header_username_icon_control_code_handler)
                    control_code_map.set(5, chat_message_header_rainbow_user_name_control_code_handler)
                    for (let i = actual_chat_content.childNodes.length - 1; i >= 0; i--) {
                        let message = actual_chat_content.childNodes[i]

                        for (let control_code in individual_control_codes) {
                            console.log('checking control code', individual_control_codes[control_code][0])
                            console.log('control code map has control code: ', control_code_map.has(individual_control_codes[control_code][0]))
                            if (control_code_map.has(individual_control_codes[control_code][0])) {
                                message = control_code_map.get(individual_control_codes[control_code][0])(message, individual_control_codes[control_code].slice(2, individual_control_codes[control_code].length))
                            }
                        }
                        new_chat_content.appendChild(message)
                        new_chat_content.insertBefore(message, new_chat_content.firstChild)
                    }

                }
                actual_chat_content.replaceWith(new_chat_content)
            }
        }

/////////////////////////////////////////// HANDLERS ///////////////////////////////////////////////////////////////////

        function first_control_code(message, options) {
            console.log('First control code handler: ', message, options)
            return message
        }

        function second_control_code_handling(message, options) {
            console.log('Second control code handler: ', message, options)
            return message
        }

        function text_control_code_handler(message, options) {
            let gradient_settings = parse_gradient_options(options)
            console.log('Text control handler:', message, options)
            if (message.nodeType !== Node.TEXT_NODE) {
                console.log('Text control handler invoked on non text node. Returning.')
                return message
            }

            if (settings.get('groups').get('appearance').get('loaded_settings').get('disable_rainbow_message_globally').get('value')) {

            } else if (settings.get('groups').get('appearance').get('loaded_settings').get('disable_rainbow_message_externally').get('value')) {
                if (extract_user_from_message(message) === extract_user_from_user_list()) {
                    message = make_text_sinebow(message.nodeValue, gradient_settings)
                }
            } else {
                message = make_text_sinebow(message.nodeValue, gradient_settings)
            }

            return message
        }

        function extract_user_from_message(message) {
            return message.parentNode.querySelector('.user > strong').textContent
        }

        function extract_user_from_user_list() {
            if (username_self === undefined) {
                username_self = document.querySelector('li.isme > div.channel_user_info > span.joychat_user_name').innerText
            }
            return username_self
        }

        function chat_message_header_username_icon_control_code_handler(message, options) {
            if (message.classList === undefined || !message.classList.contains('user')) {
                return message
            }
            let gender_icon = message.querySelector('strong > j-gender-icon')

            let emoji_span = document.createElement('span')
            emoji_span.setAttribute('class', 'smiley')
            let emoji_img = document.createElement('img')
            emoji_img.setAttribute('src', emoji_list.at(options[0]))
            emoji_img.setAttribute('title', 'matrix')
            emoji_img.setAttribute('alt', 'matrix')
            emoji_img.onload = function () {
                resizeImage(this, 25, 9999)
            }
            emoji_span.style.marginLeft = '5px'
            emoji_span.appendChild(emoji_img)
            if (settings.get('groups').get('appearance').get('loaded_settings').get('username_picture_replace_gender').get('value')) {
                gender_icon.parentNode.replaceChild(emoji_span, gender_icon)
            } else {
                gender_icon.parentNode.appendChild(emoji_span)
                gender_icon.parentNode.insertBefore(emoji_span, gender_icon)
            }

            return message
        }

        function chat_message_header_rainbow_user_name_control_code_handler(message, options) {
            let gradient_settings = parse_gradient_options(options)
            console.log(options)
            if (message.classList === undefined || !message.classList.contains('user')) {
                return message
            }

            if (settings.get('groups').get('appearance').get('loaded_settings').get('disable_rainbow_username_globally').get('value')) {

            } else if (settings.get('groups').get('appearance').get('loaded_settings').get('disable_rainbow_username_externally').get('value')) {
                if (extract_user_from_message(message) === extract_user_from_user_list()) {
                    let rainbow_user_name = make_text_sinebow(message.querySelector('strong').textContent, gradient_settings)
                    message.querySelector('strong').firstChild.replaceWith(rainbow_user_name)
                }
            } else {
                let rainbow_user_name = make_text_sinebow(message.querySelector('strong').textContent, gradient_settings)
                message.querySelector('strong').firstChild.replaceWith(rainbow_user_name)
            }
            return message
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

        function handle_chat_message_removal(removedNodes) {
            console.log('lol lmao', removedNodes)
        }

        function parse_gradient_options(options) {
            let all_numbers = []
            let current_number = ''
            for (let number of options) {
                if (number === 998) {
                    current_number += '-'
                } else if (number === 999) {
                    current_number += '.'
                } else if (number === 1000) {
                    all_numbers.push(parseFloat(current_number))
                    current_number = ''
                } else {
                    current_number += number
                }
            }
            return all_numbers
        }

        function encode_gradient_options(options) {
            let encoded_options = []
            for (let number of options) {
                if (number.toString().indexOf('.') === -1) {
                    if (number.toString().startsWith('-')) {
                        encoded_options.push(998)
                        encoded_options.push(Math.abs(number))
                    } else {
                        encoded_options.push(number)
                    }
                    encoded_options.push(999)
                    encoded_options.push(0)
                    encoded_options.push(1000)
                } else {
                    let integer_string = number.toString().substring(0, number.toString().indexOf('.'))
                    if (integer_string.startsWith('-')) {
                        integer_string = integer_string.substring(1)
                        encoded_options.push(998)
                    }
                    let integer_portion = parseInt(integer_string)
                    encoded_options.push(integer_portion)
                    encoded_options.push(999)

                    let decimal_string = number.toString().substring(number.toString().indexOf('.') + 1)
                    while (decimal_string.startsWith('0')) {
                        encoded_options.push(0)
                        decimal_string = decimal_string.substring(1)
                    }
                    let decimal_portion = parseInt(decimal_string)

                    encoded_options.push(decimal_portion)
                    encoded_options.push(1000)
                }
            }
            return encoded_options
        }

        let zero_control_space = 8203
        let one_control_space = 8204
        let control_space_start_character = 8239
        let control_space_separator_character = 8205

        function process_control_spaces(message) {
            console.log(message)
            while (message.startsWith(' ')) {
                message = message.slice(1, message.length)
            }
            while (message.endsWith(' ')) {
                message = message.slice(0, message.length - 1)
            }
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

        function split_control_codes(control_codes) {
            let split_control_codes = []
            for (let i = 0; i < control_codes.length;) {
                let length = control_codes[i + 1]
                split_control_codes.push(control_codes.slice(i, i + 2 + length))
                i += 2 + length
            }
            return split_control_codes
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

            if (settings.get('groups').get('appearance').get('loaded_settings').get('custom_font_message').get('value')) {
                convert_editor_to_custom_font()
            }
            if (settings.get('groups').get('appearance').get('loaded_settings').get('rainbow_message').get('value')) {
                config_values.push(3)
                let encoded_gradient_options = encode_gradient_options(settings.get('groups').get('appearance').get('loaded_settings').get('gradient_editor_message_setting').get('value'))
                config_values.push(encoded_gradient_options.length)
                for (let encoded_option of encoded_gradient_options) {
                    config_values.push(encoded_option)
                }
            }
            if (settings.get('groups').get('appearance').get('loaded_settings').get('username_picture').get('value')) {
                config_values.push(4)
                config_values.push(1)
                config_values.push(emoji_list.indexOf(settings.get('groups').get('appearance').get('loaded_settings').get('username_picture_choice').get('value')))
            }
            if (settings.get('groups').get('appearance').get('loaded_settings').get('username_rainbow').get('value')) {
                config_values.push(5)
                let encoded_gradient_options = encode_gradient_options(settings.get('groups').get('appearance').get('loaded_settings').get('gradient_editor_username_setting').get('value'))
                config_values.push(encoded_gradient_options.length)
                for (let encoded_option of encoded_gradient_options) {
                    config_values.push(encoded_option)
                }
            }
            let control_spaces = convert_number_array_to_control_spaces(config_values)
            let final_control_space_string = String.fromCharCode(control_space_start_character)
            for (let control_space of control_spaces) {
                final_control_space_string += control_space
                final_control_space_string += String.fromCharCode(control_space_separator_character)
            }
            final_control_space_string = final_control_space_string.slice(0, -1)
            final_control_space_string = ' ' + final_control_space_string
            document.querySelectorAll('#joychat_input_text')[0].value += final_control_space_string
            console.log("Pre submit modifications done.")
        }

// Utility Functions

        function make_text_sinebow(text_to_rainbowify, gradient_settings) {
            let container_div = document.createElement('span')
            container_div.setAttribute('class', 'rainbow')
            container_div.style.red = 0
            let split = text_to_rainbowify.split("");
            let words = split.reduce(wrapText, container_div);
            let chars = words.children;
            let total = words.children.length;
            let freq1 = gradient_settings[0]
            let freq2 = gradient_settings[1]
            let freq3 = gradient_settings[2]
            let phase1 = gradient_settings[3]
            let phase2 = gradient_settings[4]
            let phase3 = gradient_settings[5]
            let amp1 = gradient_settings[6]
            let amp2 = gradient_settings[7]
            let amp3 = gradient_settings[8]
            let dc1 = gradient_settings[9]
            let dc2 = gradient_settings[10]
            let dc3 = gradient_settings[11]
            let repetition = gradient_settings[12]
            let gradient_speed = gradient_settings[13]
            console.log('Gradient Settings decoded:', gradient_settings)
            let t1 = gsap.timeline({repeat: -1, yoyo: true})
                .to(words, {
                    red: 255,
                    step: 1,
                    duration: gradient_speed,
                    modifiers: {
                        red: function (x) {
                            let active_sinebow
                            if (precomputed_sinebows.has(gradient_settings.toString())) {
                                active_sinebow = precomputed_sinebows.get(gradient_settings.toString())
                            } else {
                                active_sinebow = new Map()
                                precomputed_sinebows.set(gradient_settings.toString(), active_sinebow)
                                console.log(precomputed_sinebows)
                            }
                            for (let i = 0; i < total; i++) {
                                let index = i + 25 + x * repetition;
                                index = +index.toFixed(2)
                                if (active_sinebow.has(index)) {
                                    chars[i].style.color = active_sinebow.get(index);
                                } else {
                                    let computed_sinebow = sinebow(freq1, freq2, freq3, phase1, phase2, phase3, amp1, amp2, amp3, dc1, dc2, dc3, index)
                                    active_sinebow.set(index, computed_sinebow)
                                    chars[i].style.color = computed_sinebow
                                }
                            }
                            return x;
                        }
                    }
                });
            t1.play()
            return container_div
        }

        function palette(t) {
            let dc_offset = math.matrix([0.098, 0.058, 1.268]) // DC Offset
            let amp = math.matrix([0.152, 0.843, 0.411]) // AMP
            let frequency = math.matrix([3.358, 0.672, -1.778]) // Freq
            let phase = math.matrix([-1.052, -0.718, -2.873]) // Phase
            let c_times_t = math.dotMultiply(frequency, t)
            let plus_d = math.add(c_times_t, phase)
            let intermediate_vector = math.dotMultiply(plus_d, 6.28318)
            return math.add(dc_offset, math.multiply(amp, math.matrix([math.subset(intermediate_vector, math.index([0])), math.subset(intermediate_vector, math.index([1])), math.subset(intermediate_vector, math.index([2]))])))
        }

        function palette_to_rgb_string(palette) {
            let r = math.subset(palette, math.index([0]))
            let g = math.subset(palette, math.index([1]))
            let b = math.subset(palette, math.index([2]))
            return `rgb(${r >> 0},${g >> 0},${b >> 0})`
        }

    }

)
();

