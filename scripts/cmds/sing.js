const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports = {
	config: {
	name: "sing",
	aliases: ["song", "music"],
	version: "1.0.3",
	author: "SaGor",
	countDown: 5,
	role: 0,
	shortDescription: {
		en: "Search and send song from YouTube"
	},
	longDescription: {
		en: "Search and download music from YouTube"
	},
	category: "music",
	guide: {
		en: "{pn} <song name>"
	}
},

	onStart: async function ({ api, args, message }) {
		if (!args.length)
			return message.reply("❌ Please provide a song name.");

		let waitMsg;

		try {
			waitMsg = await message.reply("Please wait...");

			const search = await yts(args.join(" "));
			const video = search.videos[0];

			if (!video) {
				if (waitMsg?.messageID)
					api.unsendMessage(waitMsg.messageID);
				return message.reply("❌ Song not found.");
			}

			let data = null;

			for (const bitrate of ["192", "128", "64"]) {
				try {
					const res = await axios.get(
						`https://sagor-yt-downloader.vercel.app/sagor?url=${encodeURIComponent(video.url)}&type=audio&bitrate=${bitrate}`,
						{ timeout: 120000 }
					);

					if (res.data?.status === "success" && res.data?.download) {
						data = res.data;
						break;
					}
				}
				catch (_) {}
			}

			if (!data) {
				if (waitMsg?.messageID)
					api.unsendMessage(waitMsg.messageID);
				return message.reply("❌ Audio not available for this song.");
			}

			const filePath = path.join(os.tmpdir(), `sing_${Date.now()}.mp3`);

			const response = await axios({
				url: data.download,
				method: "GET",
				responseType: "stream"
			});

			await new Promise((resolve, reject) => {
				const writer = fs.createWriteStream(filePath);
				response.data.pipe(writer);
				writer.on("finish", resolve);
				writer.on("error", reject);
			});

			if (waitMsg?.messageID)
				api.unsendMessage(waitMsg.messageID);

			await message.reply({
				body: `🎵 ${data.title}
⏱ ${data.duration || "Unknown"}
🎧 ${data.bitrate || "Auto"}`,
				attachment: fs.createReadStream(filePath)
			});

			fs.unlink(filePath, () => {});
		}
		catch (err) {
			if (waitMsg?.messageID)
				api.unsendMessage(waitMsg.messageID).catch(() => {});
			message.reply(`❌ Error: ${err.message}`);
		}
	}
};
