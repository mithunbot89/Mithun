const axios = require("axios");

module.exports = {
	config: {
		name: "imgur",
		version: "3.0.0",
		author: "SAGOR",
		countDown: 5,
		role: 0,
		shortDescription: {
			en: "Upload media to Imgur"
		},
		description: {
			en: "Upload replied image, video or GIF to Imgur using Sagor API"
		},
		category: "utility",
		guide: {
			en: "Reply to an image, video or GIF and use {pn}"
		}
	},

	langs: {
		en: {
			noAttachment: "Please reply to an image, video or GIF.",
			uploading: "Please wait...",
			uploadFailed: "Upload failed. Please try again.",
			noLink: "mgur link was not found.",
			error: "Error: %1"
		}
	},

	onStart: async function ({
		api,
		message,
		event,
		getLang
	}) {
		try {
			const attachment = event.messageReply?.attachments?.[0];

			if (!attachment) {
				return message.reply(getLang("noAttachment"));
			}

			const loadingInfo = await new Promise((resolve) => {
				api.sendMessage(
					getLang("uploading"),
					event.threadID,
					(err, info) => {
						resolve(err ? null : info);
					}
				);
			});

			try {
				const apiUrl =
					"https://sagor-apis-nx.vercel.app/sagor/imgur?url=" +
					encodeURIComponent(attachment.url);

				const res = await axios.get(apiUrl, {
					timeout: 60000
				});

				if (loadingInfo?.messageID) {
					try {
						api.unsendMessage(loadingInfo.messageID);
					} catch (_) {}
				}

				if (
					!res.data ||
					res.data.status !== "success"
				) {
					return message.reply(
						getLang("uploadFailed")
					);
				}

				const data = res.data.data;

				if (!data?.link) {
					return message.reply(
						getLang("noLink")
					);
				}

				return message.reply(data.link);

			} catch (err) {

				if (loadingInfo?.messageID) {
					try {
						api.unsendMessage(
							loadingInfo.messageID
						);
					} catch (_) {}
				}

				return message.reply(
					getLang("error", err.message)
				);
			}

		} catch (err) {
			return message.reply(
				getLang("error", err.message)
			);
		}
	}
};