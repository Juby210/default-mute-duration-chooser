const { Plugin } = require('powercord/entities')
const { findInReactTree, forceUpdateElement } = require('powercord/util')
const { getAllModules, getModule, getModuleByDisplayName, contextMenu, React } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')

const MenuGroup = require('./components/MuteGroup')
const Settings = require('./components/Settings')
const { durationMsg } = require('./util')

const mod = getModule(['updateChannelOverrideSettings'], false)

module.exports = class DefaultMuteDurationChooser extends Plugin {
    injections = ['dmdc', 'dmdc-temp']

    async startPlugin() {
        powercord.api.settings.registerSettings(this.entityID, {
            category: this.entityID,
            label: 'Default Mute Duration Chooser',
            render: Settings
        })

        const _this = this
        const cm = powercord.pluginManager.get('custom-mute') || powercord.pluginManager.get('custom-mute-master')

        const { MenuCheckboxItem, MenuItem } = await getModule(['MenuGroup', 'MenuItem'])
        const ChannelMuteButton = await getModuleByDisplayName('FluxContainer(ChannelMuteButton)')
        const channelComponents = await getAllModules(m => m.default && m.default.displayName == 'ChannelListTextChannelContextMenu')

        inject('dmdc-temp', ChannelMuteButton.prototype, 'render', (_, res) => {
            if (!res || !res.type.prototype) return res

            inject('dmdc', res.type.prototype, 'render', function (_, res) {
                if (this.props.isMuted) return res

                const { onClick } = res.props
                res.props.onClick = () => _this.mute(this.props.channel, onClick)
                res.props.onContextMenu = e => {
                    contextMenu.openContextMenu(e, () => React.createElement(MenuGroup, this.props))
                }

                return res
            })
            uninject('dmdc-temp')

            return res
        })

        let save = false
        channelComponents.forEach((c, i) => {
            this.injections.push(`dmdc${i}`)
            inject(`dmdc${i}`, c, 'default', (args, res) => {
                const submenu = findInReactTree(res, c => c.id == 'mute-channel')
                if (!submenu) return res
                let forceSave = args[0].__dmdc, id = args[0].channel.id || args[0].__dmdc

                if (!forceSave) {
                    const defaultSettings = this.settings.get(id, this.settings.get('default', { s: -1 }))
                    if (defaultSettings.s != -1) submenu.subtext = 'Default: ' + durationMsg(defaultSettings)
                    const { action } = submenu
                    submenu.action = () => this.mute(args[0].channel, action)

                    submenu.children.push(React.createElement(MenuCheckboxItem, {
                        id: 'dmdc-default',
                        label: 'Set as default duration',
                        checked: save,
                        action: () => {
                            save = !save
                            forceUpdateElement('[role="menu"]')
                        }
                    }))
                }
                submenu.children.filter(e => !Array.isArray(e) && !e.props?.id?.includes('dmdc')).forEach(e => {
                    const { action } = e.props
                    e.props.action = () => {
                        if (save || forceSave) this.settings.set(id, { s: e.key })
                        if (!args[0].__dmdc) return action()
                    }
                })

                // Custom Mute compatibility
                if (cm && findInReactTree(submenu, c => Array.isArray(c) && c.find(e => e.props && e.props.id == 'cmapply'))) {
                    let i = submenu.children.length - 1, cmgroup = submenu.children[i]
                    if (!Array.isArray(cmgroup) || !cmgroup.find(e => e.props && e.props.id == 'cmapply'))
                        i = submenu.children.length - 2
                    submenu.children[i] = cm.customMuteGroup(args[0].channel.guild_id, id, (h, m) => {
                        if (save || forceSave) this.settings.set(id, { h, m, s: cm.getMuteConfig(h, m).mute_config.selected_time_window })
                    }, !args[0].__dmdc)
                }

                if (args[0].__dmdc && id != 'default') submenu.children.push(React.createElement(MenuItem, {
                    action: () => this.settings.delete(id),
                    color: 'colorDanger',
                    id: 'dmdc-remove',
                    label: 'Remove'
                }))

                return res
            })
            c.default.displayName = 'ChannelListTextChannelContextMenu'
        })
    }

    pluginWillUnload() {
        this.injections.forEach(i => uninject(i))
        powercord.api.settings.unregisterSettings(this.entityID)
    }

    getMuteConfig(s) {
        return { muted: true, mute_config: {
            end_time: new Date(Date.now() + s * 1000).toISOString(), selected_time_window: Number(s)
        }}
    }

    mute(channel, org) {
        let s = this.settings.get(channel.id, this.settings.get('default', { s: -1 }))
        if (s.s == -1) return org()
        mod.updateChannelOverrideSettings(channel.guild_id, channel.id, this.getMuteConfig(s.s))
    }
}
