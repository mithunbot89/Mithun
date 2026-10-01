const createFuncMessage = global.utils.message;
const handlerCheckDB = require("./handlerCheckData.js");

module.exports = (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) => {
	const handlerEvents = require(process.env.NODE_ENV == 'development' ? "./handlerEvents.dev.js" : "./handlerEvents.js")(api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData);

	return async function (event) {

		if (
			global.GoatBot.config.antiInbox == true &&
			(event.senderID == event.threadID || event.userID == event.senderID || event.isGroup == false) &&
			(event.senderID || event.userID || event.isGroup == false)
		)
			return;

		const message = createFuncMessage(api, event);

		await handlerCheckDB(usersData, threadsData, event);
		const handlerChat = await handlerEvents(event, message);
		if (!handlerChat)
			return;
		if(global.GoatBot.config?.approval){
	   const approvedtid = await globalData.get("approved", "data", {});
			if (!approvedtid.approved) {
				approvedtid.approved = [];
				await globalData.set("approved", approvedtid, "data");
			}
if (!approvedtid.approved.includes(event.threadID)) return;
	}
		const {
			onAnyEvent, onFirstChat, onStart, onChat,
			onReply, onEvent, handlerEvent, onReaction,
			typ, presence, read_receipt
		} = handlerChat;

		onAnyEvent();
		switch (event.type) {
			case "message":
			case "message_reply":
			case "message_unsend":
				onFirstChat();
				onStart();
				onChat();
				onReply();
				break;
			case "event":
				handlerEvent();
				onEvent();
				break;
			case "message_reaction":
				onReaction();
				{

					const reactBy = global.GoatBot.config?.reactBy || {};
					const del = Array.isArray(reactBy.delete) ? reactBy.delete : [];
					const kick = Array.isArray(reactBy.kick) ? reactBy.kick : [];
					const adminBot = global.GoatBot.config?.adminBot || [];

					if (event.reaction && del.includes(event.reaction)) {
						if (event.senderID === api.getCurrentUserID()) {
							if (adminBot.includes(event.userID)) {
								api.unsendMessage(event.messageID, event.threadID);
							}
						}
					}
					if (event.reaction && kick.includes(event.reaction)) {
						if (adminBot.includes(event.userID)) {
				api.removeUserFromGroup(event.senderID, event.threadID, (err) => { if (err) return console.log(err) });
					}
				}
				}
				break;
			case "typ":
				typ();
				break;
			case "presence":
				presence();
				break;
			case "read_receipt":
				read_receipt();
				break;

			default:
				break;
		}
	};
};
