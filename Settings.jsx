const { getModule, React } = require('powercord/webpack')
const { Category, TextInput } = require('powercord/components/settings')

const { durationMsg, getName } = require('./util')

const { getChannel } = getModule(['getChannel'], false)

module.exports = class Settings extends React.Component {
    constructor(props) {
        super(props)
        this.state = {}
    }

    render() {
        const { default: ChannelTimedMuteGroup } = getModule(m => m.default && m.default.displayName == 'ChannelTimedMuteGroup', false)
        return <>
            <Category
                name='Default duration'
                description={ 'Selected: ' + durationMsg(this.props.getSetting('default', { s: -1 })) }
                opened={ this.state.default }
                onChange={ () => this.setState({ default: !this.state.default }) }
            >
                <ChannelTimedMuteGroup channel={{ id: 'default', getGuildId: () => {} }} __dmdc={ true } />
            </Category>
            <TextInput
                style={ this.state.inputerr ? { borderColor: '#f04747' } : {} }
                note={ this.state.inputerr ? (<span style={{ color: '#f04747' }}>Invalid channel</span>) : '' }
                onChange={ val => {
                    if (!getChannel(val)) return this.setState({ inputerr: true })
                    this.setState({ inputerr: false })
                    this.props.updateSetting(val, { s: -1 })
                }}
            >Channel id</TextInput>
            { Object.keys(this.props.settings).filter(k => k != 'default').map(k =>
                getChannel(k) ? <Category
                    name={ getName(k) }
                    description={ 'Selected: ' + durationMsg(this.props.getSetting(k, { s: -1 })) }
                    opened={ this.state[k] }
                    onChange={ () => this.setState({ [k]: !this.state[k] }) }
                >
                    <ChannelTimedMuteGroup channel={{ id: k, getGuildId: () => {} }} __dmdc={ true } />
                </Category> : null
            ) } 
        </>
    }
}
