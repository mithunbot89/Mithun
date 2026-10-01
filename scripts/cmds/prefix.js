module.exports = {
  config: {
    name: "prefix",
    aliases: ["pre"],
    version: "1.0",
    author: "SaGor",
    countDown: 5,
    role: 0,
    shortDescription: "Show bot prefix",
    longDescription: "Displays the current system prefix.",
    category: "system",
    guide: "{pn}"
  },

  onStart: async function ({ message, event, prefix }) {
    return message.reply(
      `╭──『 BOT PREFIX 』
│ 🌸 System Prefix: ${prefix}
╰──────────────`
    );
  }
};
