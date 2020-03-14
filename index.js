const { Plugin } = require('powercord/entities')
const { getModule, getModuleByDisplayName, contextMenu, React } = require('powercord/webpack')
const { inject, uninject } = require('powercord/injector')
const { Button, Checkbox } = require('powercord/components/ContextMenu')

const Settings = require('./Settings')

module.exports = class DefaultMuteDurationChooser extends Plugin {
    async startPlugin() {
        this.registerSettings('dmdc', 'Default Mute Duration Chooser', Settings)
        const cm = powercord.pluginManager.get('custom-mute')
        const mod = await getModule(['updateNotificationSettings'])
        const cc = await getModule(['itemToggle', 'checkbox'])

        const ChannelMuteButton = await getModuleByDisplayName('FluxContainer(ChannelMuteButton)')
        const ChannelTimedMuteGroup = await getModule(m => m.default && m.default.displayName == 'ChannelTimedMuteGroup')

        inject('dmdc', ChannelMuteButton.prototype, 'render', (_, res) => {
            if (res.props.isMuted) return res
            return React.createElement('div', {
                onClick: () => {
                    let s = this.settings.get(res.props.channel.id)
                    if (!s) s = this.settings.get('default', { s: -1 })
                    if (s.s == -1) return
                    mod.updateChannelOverrideSettings(res.props.channel.guild_id, res.props.channel.id, this.getMuteConfig(s.s))
                },
                onContextMenu: e => {
                    contextMenu.openContextMenu(e, () => React.createElement('div', { className: cc.contextMenu },
                        React.createElement(ChannelTimedMuteGroup.default, { channel: res.props.channel })))
                }
            }, res)
        })

        inject('dmdc-group', ChannelTimedMuteGroup, 'default', (args, res) => {
            let save = args[0].__dmdc
            if (res.props.children.length > 4) res.props.children = [ res.props.children ]
            if (!save) res.props.children.push(React.createElement(Checkbox, {
                name: 'Set as default duration',
                onToggle: () => save = !save
            }))
            res.props.children[0].forEach(e => {
                const { action } = e.props
                e.props.action = () => {
                    if (save) this.settings.set(args[0].channel.id, { s: e.key })
                    if (!args[0].__dmdc) return action()
                }
            })
            if (res.props.children[1] && cm) { // Custom Mute compatibility
                let h = 0, m = 0, cg = res.props.children[1].props.children
                if (cg) {
                    cg[0].props.onValueChange = val => h = Math.round(val)
                    cg[1].props.onValueChange = val => m = Math.round(val)
                    cg[2].props.onClick = () => {
                        if (!h && !m) return
                        if (save) this.settings.set(args[0].channel.id,
                            { h, m, s: cm.getMuteConfig(h, m).mute_config.selected_time_window })
                        if (!args[0].__dmdc)
                            mod.updateChannelOverrideSettings(args[0].channel.guild_id, args[0].channel.id, cm.getMuteConfig(h, m))
                    }
                }
            }
            if (args[0].__dmdc && args[0].channel.id != 'default') res.props.children.push(React.createElement(Button, {
                name: 'Remove',
                highlight: '#f04747',
                seperate: true,
                onClick: () => this.settings.delete(args[0].channel.id)
            }))

            return res
        })
        ChannelTimedMuteGroup.default.displayName = 'ChannelTimedMuteGroup'
    }

    pluginWillUnload() {
        uninject('dmdc')
        uninject('dmdc-group')
    }

    getMuteConfig(s) {
        return { muted: true, mute_config: {
            end_time: new Date(Date.now() + s * 1000).toISOString(), selected_time_window: Number(s)
        }}
    }
}
