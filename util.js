const { getModule, i18n: { Messages } } = require('powercord/webpack')

const { getChannel } = getModule(['getChannel'], false)
const { getGuild } = getModule(['getGuild'], false)

module.exports.durationMsg = ({ h, m, s }) => {
    if (h || m) return `Custom Mute: ${h} hours(s) and ${m} min(s)`
    switch (Number(s)) {
        case 900:
            return Messages.MUTE_DURATION_15_MINUTES
        case 3600:
            return Messages.MUTE_DURATION_1_HOUR
        case 28800:
            return Messages.MUTE_DURATION_8_HOURS
        case 86400:
            return Messages.MUTE_DURATION_24_HOURS
        default:
            return Messages.MUTE_DURATION_ALWAYS
    }
}

module.exports.getName = channel => {
    const c = getChannel(channel), g = getGuild(c.guild_id)
    return `#${c.name || c.rawRecipients[0].username} (${g ? g.name : 'DM'})`
}
