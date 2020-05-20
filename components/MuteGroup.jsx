const { getModuleByDisplayName, React } = require('powercord/webpack')
const { findInReactTree } = require('powercord/util')

module.exports = class MuteGroup extends React.PureComponent {
    render() {
        const ChannelListTextChannelContextMenu = getModuleByDisplayName('ChannelListTextChannelContextMenu', false)
        const o = <ChannelListTextChannelContextMenu {...this.props} />
        const { type } = o
        o.type = (...args) => {
            const res = type(...args)
            res.props.children = findInReactTree(res, c => c.id == 'mute-channel').children
            if (!this.props.channel.id && this.props.__dmdc) res.props.style = {}
            return res
        }
        return o
    }
}
