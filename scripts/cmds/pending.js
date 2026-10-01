module.exports = {
 config: {
 name: "pending",
 aliases: [`pen`],
 version: "1.0",
 author: "SaGor",
 countDown: 0,
 role: 2,
 shortDescription: {
 vi: "",
 en: ""
 },
 longDescription: {
 vi: "",
 en: ""
 },
 category: "owner"
 },

langs: {
 en: {
 invaildNumber: " 𝐈𝐍𝐕𝐀𝐋𝐈𝐃 𝐈𝐍𝐏𝐔𝐓\n━━━━━━━━━━━━━━━━━━\n» [%1] 𝐢𝐬 𝐧𝐨𝐭 𝐚 𝐯𝐚𝐥𝐢𝐝 𝐧𝐮𝐦𝐛𝐞𝐫. 𝐏𝐥𝐞𝐚𝐬𝐞 𝐜𝐡𝐞𝐜𝐤 𝐭𝐡𝐞 𝐥𝐢𝐬𝐭 𝐚𝐠𝐚𝐢𝐧.",
      cancelSuccess: " 𝐑𝐄𝐐𝐔𝐄𝐒𝐓 𝐑𝐄𝐉𝐄𝐂𝐓𝐄𝐃\n━━━━━━━━━━━━━━━━━━\n» 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐫𝐞𝐟𝐮𝐬𝐞𝐝 %1 𝐭𝐡𝐫𝐞𝐚𝐝(𝐬).",
      approveSuccess: " 𝐀𝐏𝐏𝐑𝐎𝐕𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒\n━━━━━━━━━━━━━━━━━━\n» 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 𝐚𝐜𝐜𝐞𝐩𝐭𝐞𝐝 %1 𝐭𝐡𝐫𝐞𝐚𝐝(𝐬)!",
      cantGetPendingList: " 𝐄𝐑𝐑𝐎𝐑: 𝐔𝐧𝐚𝐛𝐥𝐞 𝐭𝐨 𝐟𝐞𝐭𝐜𝐡 𝐩𝐞𝐧𝐝𝐢𝐧𝐠 𝐥𝐢𝐬𝐭!",
      returnListPending: " 𝐏𝐄𝐍𝐃𝐈𝐍𝐆 𝐌𝐄𝐒𝐒𝐀𝐆𝐄 𝐑𝐄𝐐𝐔𝐄𝐒𝐓𝐒\n━━━━━━━━━━━━━━━━━━━━\n✨ 𝐓𝐨𝐭𝐚𝐥 𝐏𝐞𝐧𝐝𝐢𝐧𝐠: %1 𝐆𝐫𝐨𝐮𝐩𝐬\n\n%2\n━━━━━━━━━━━━━━━━━━━━\n💡 𝐑𝐞𝐩𝐥𝐲 [𝐧𝐮𝐦𝐛𝐞𝐫] 𝐭𝐨 𝐀𝐩𝐩𝐫𝐨𝐯𝐞\n💡 𝐑𝐞𝐩𝐥𝐲 [𝐜 + 𝐧𝐮𝐦𝐛𝐞𝐫] 𝐭𝐨 𝐑𝐞𝐣𝐞𝐜𝐭",
      returnListClean: "✨ 𝐏𝐄𝐍𝐃𝐈𝐍𝐆 𝐂𝐋𝐄𝐀𝐑 ✨\n━━━━━━━━━━━━━━━━━━━━\n» 𝐍𝐨 𝐩𝐞𝐧𝐝𝐢𝐧𝐠 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐬 𝐟𝐨𝐮𝐧𝐝 𝐚𝐭 𝐭𝐡𝐞 𝐦𝐨𝐦𝐞𝐧𝐭! "
    }
 },

onReply: async function({ api, event, Reply, getLang, commandName, prefix }) {
 if (String(event.senderID) !== String(Reply.author)) return;
 const { body, threadID, messageID } = event;
 var count = 0;

 if (isNaN(body) && body.indexOf("c") == 0 || body.indexOf("cancel") == 0) {
 const index = (body.slice(1, body.length)).split(/\s+/);
 for (const singleIndex of index) {
 console.log(singleIndex);
 if (isNaN(singleIndex) || singleIndex <= 0 || singleIndex > Reply.pending.length) return api.sendMessage(getLang("invaildNumber", singleIndex), threadID, messageID);
 api.removeUserFromGroup(api.getCurrentUserID(), Reply.pending[singleIndex - 1].threadID);
 count+=1;
 }
 return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
 }
 else {
 const index = body.split(/\s+/);
 for (const singleIndex of index) {
 if (isNaN(singleIndex) || singleIndex <= 0 || singleIndex > Reply.pending.length) return api.sendMessage(getLang("invaildNumber", singleIndex), threadID, messageID);
 api.sendMessage(`✨ 𝐁𝐎𝐓 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 ✨\n━━━━━━━━━━━━━━━━━━━━\n🎀 𝐇𝐞𝐥𝐥𝐨 𝐄𝐯𝐞𝐫𝐲𝐨𝐧𝐞! 🎀\n\n(˶ˆᗜˆ˵) 𝐘𝐨𝐮𝐫 𝐠𝐫𝐨𝐮𝐩 𝐡𝐚𝐬 𝐛𝐞𝐞𝐧 𝐚𝐩𝐩𝐫𝐨𝐯𝐞𝐝 𝐛𝐲 𝐦𝐲 𝐌𝐚𝐬𝐭𝐞𝐫.\n\n(˶˃⤙˂˶) 𝐘𝐨𝐮 𝐜𝐚𝐧 𝐧𝐨𝐰 𝐮𝐬𝐞 𝐚𝐥𝐥 𝐦𝐲 𝐜𝐨𝐦𝐦𝐚𝐧𝐝𝐬.\n\nᯓᡣ𐭩 𝐓𝐲𝐩𝐞 ${prefix} 𝐡𝐞𝐥𝐩 𝐭𝐨 𝐬𝐞𝐞 𝐦𝐲 𝐟𝐞𝐚𝐭𝐮𝐫𝐞𝐬.\n━━━━━━━━━━━━━━━━━━━━`, Reply.pending[singleIndex - 1].threadID);
 count+=1;
 }
 return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
 }
},

onStart: async function({ api, event, getLang, commandName }) {
 const { threadID, messageID } = event;

 var msg = "", index = 1;

 try {
 var spam = await api.getThreadList(100, null, ["OTHER"]) || [];
 var pending = await api.getThreadList(100, null, ["PENDING"]) || [];
 } catch (e) { return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID) }

 const list = [...spam, ...pending].filter(group => group.isSubscribed && group.isGroup);

 for (const single of list) msg += `${index++}/ ${single.name}(${single.threadID})\n`;

 if (list.length != 0) return api.sendMessage(getLang("returnListPending", list.length, msg), threadID, (err, info) => {
 global.GoatBot.onReply.set(info.messageID, {
 commandName,
 messageID: info.messageID,
 author: event.senderID,
 pending: list
 })
 }, messageID);
 else return api.sendMessage(getLang("returnListClean"), threadID, messageID);
}
}
