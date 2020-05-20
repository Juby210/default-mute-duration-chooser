const { Plugin } = require('powercord/entities')
const { findInReactTree } = require('powercord/util')
const { getAllModules, getModule, getModuleByDisplayName, contextMenu, React } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')
// const ContextMenu = require('powercord/components/ContextMenu')

const MenuGroup = require('./components/MuteGroup')
const Settings = require('./components/Settings')

module.exports = class DefaultMuteDurationChooser extends Plugin {
    injections = ['dmdc']

    async startPlugin() {
        this.registerSettings('dmdc', 'Default Mute Duration Chooser', Settings)

        const cm = powercord.pluginManager.get('custom-mute') || powercord.pluginManager.get('custom-mute-master')
        const icm = await getModule(['isMuted'])
        const mod = await getModule(['updateNotificationSettings'])

        const { MenuItem } = await getModule(['MenuGroup', 'MenuItem'])
        const ChannelMuteButton = await getModuleByDisplayName('FluxContainer(ChannelMuteButton)')
        const channelComponents = await getAllModules(m => m.default && m.default.displayName == 'ChannelListTextChannelContextMenu')

        inject('dmdc', ChannelMuteButton.prototype, 'render', (_, res) => {
            if (res.props.isMuted) return res
            return React.createElement('div', {
                onClick: async () => {
                    let s = this.settings.get(res.props.channel.id)
                    if (!s) s = this.settings.get('default', { s: -1 })
                    if (s.s == -1) return
                    do await new Promise(r => setTimeout(r, 250))
                    while (!icm.isChannelMuted(res.props.channel.guild_id, res.props.channel.id))
                    mod.updateChannelOverrideSettings(res.props.channel.guild_id, res.props.channel.id, this.getMuteConfig(s.s))
                },
                onContextMenu: e => {
                    contextMenu.openContextMenu(e, () => React.createElement(MenuGroup, res.props))
                },
                ...res.props
            }, res)
        })

        channelComponents.forEach((c, i) => {
            this.injections.push(`dmdc${i}`)
            inject(`dmdc${i}`, c, 'default', (args, res) => {
                const submenu = findInReactTree(res, c => c.id == 'mute-channel')
                if (!submenu) return res
                let save = args[0].__dmdc, id = args[0].channel.id || args[0].__dmdc
                // doesn't work
                // if (!save) submenu.children.push(ContextMenu.renderRawItems([{
                //     type: 'checkbox',
                //     name: 'Set as default duration',
                //     onToggle: () => save = !save
                // }]))
                submenu.children.forEach(e => {
                    if (Array.isArray(e)) return
                    const { action } = e.props
                    e.props.action = () => {
                        if (save) this.settings.set(id, { s: e.key })
                        if (!args[0].__dmdc) return action()
                    }
                })

                // Custom Mute compatibility
                if (cm && findInReactTree(submenu, c => Array.isArray(c) && c.find(e => e.props && e.props.id == 'cmapply'))) {
                    let i = submenu.children.length - 1, cmgroup = submenu.children[i]
                    if (!Array.isArray(cmgroup) || !cmgroup.find(e => e.props && e.props.id == 'cmapply'))
                        i = submenu.children.length - 2
                    submenu.children[i] = cm.customMuteGroup(args[0].channel.guild_id, id, (h, m) => {
                        if (save) this.settings.set(id, { h, m, s: cm.getMuteConfig(h, m).mute_config.selected_time_window })
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

    pluginWillUnload = () => this.injections.forEach(i => uninject(i))

    getMuteConfig(s) {
        return { muted: true, mute_config: {
            end_time: new Date(Date.now() + s * 1000).toISOString(), selected_time_window: Number(s)
        }}
    }
}
