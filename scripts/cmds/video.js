const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs-extra");
const path = require("path");

const CACHE_DIR = path.join(__dirname, "cache");

const API_BASE = process.env.SAGOR_API_BASE || "https://sagor-yt-downloader.vercel.app";

module.exports = {
    config: {
        name: "video",
        aliases: ["ytvideo"],
        version: "1.0.4",
        author: "SaGor",
        countDown: 5,
        role: 0,
        shortDescription: {
            vi: "Tìm kiếm & tải video YouTube",
            en: "Search & download YouTube video"
        },
        description: {
            vi: "Tìm kiếm video YouTube và tải xuống bằng cách trả lời với một số.",
            en: "Search YouTube videos and download by replying with a number."
        },
        category: "media",
        guide: {
            vi: "{pn} <từ khóa>",
            en: "{pn} <search>"
        }
    },

    langs: {
        en: {
            noArgs: "⚠️ Please enter a search keyword.",
            noResult: "❌ No videos found.",
            invalid: "⚠️ Invalid selection.",
            downloading: "⏳ Downloading...",
            failed: "❌ Failed to download video."
        }
    },

    onStart: async function ({
        api,
        event,
        args,
        commandName,
        getLang
    }) {
        const react = (emoji) =>
            api.setMessageReaction(emoji, event.messageID, () => {}, true);

        try {
            if (!args.length)
                return api.sendMessage(
                    getLang("noArgs"),
                    event.threadID,
                    event.messageID
                );

            react("🔍");

            const search = await yts(args.join(" "));
            const videos = search.videos.slice(0, 5);

            if (!videos.length) {
                react("❌");
                return api.sendMessage(
                    getLang("noResult"),
                    event.threadID,
                    event.messageID
                );
            }

            let body = "🎬 YOUTUBE VIDEO LIST\n\n";

            for (let i = 0; i < videos.length; i++) {
                body += `${i + 1}. ${videos[i].title}\n`;
                body += `⏱ ${videos[i].timestamp}\n\n`;
            }

            body += "👉 Reply with a number (1-5)";

            const attachments = [];

            for (const video of videos) {
                try {
                    const img = await axios({
                        url: video.thumbnail,
                        method: "GET",
                        responseType: "stream"
                    });
                    attachments.push(img.data);
                } catch {}
            }

            api.sendMessage(
                {
                    body,
                    attachment: attachments
                },
                event.threadID,
                (err, info) => {
                    if (err) return;

                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: event.senderID,
                        videos
                    });
                }
            );
        } catch {
            react("❌");
        }
    },

    onReply: async function ({
        api,
        event,
        Reply,
        getLang
    }) {
        const react = (emoji) =>
            api.setMessageReaction(emoji, event.messageID, () => {}, true);

        try {
            if (event.senderID !== Reply.author) return;

            const index = parseInt(String(event.body).trim(), 10);

            if (
                isNaN(index) ||
                index < 1 ||
                index > Reply.videos.length
            ) {
                react("⚠️");
                return api.sendMessage(
                    getLang("invalid"),
                    event.threadID,
                    event.messageID
                );
            }

            react("⏳");

            global.GoatBot.onReply.delete(Reply.messageID);

            try {
                api.unsendMessage(Reply.messageID);
            } catch {}

            const video = Reply.videos[index - 1];

            const qualities = ["1080", "720", "480", "360", "144"];

            let data = null;
            let download = null;

            for (const quality of qualities) {
                try {
                    const res = await axios.get(
                        `${API_BASE}/sagor`,
                        {
                            params: {
                                url: video.url,
                                type: "video",
                                quality
                            },
                            timeout: 90000
                        }
                    );

                    if (
                        res.data &&
                        res.data.status === "success" &&
                        res.data.download
                    ) {
                        data = res.data;
                        download = data.download;
                        break;
                    }
                } catch {}
            }

            if (!download) {
                react("❌");
                return api.sendMessage(
                    getLang("failed"),
                    event.threadID,
                    event.messageID
                );
            }

            await fs.ensureDir(CACHE_DIR);

            const cache = path.join(CACHE_DIR, `${Date.now()}.mp4`);

            const stream = await axios({
                url: download,
                method: "GET",
                responseType: "stream"
            });

            await new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(cache);
                stream.data.pipe(writer);
                writer.on("finish", resolve);
                writer.on("error", reject);
            });

            await api.sendMessage(
                {
                    body:
`🎬 ${data.title}

📺 Quality: ${data.quality}
⏱ Duration: ${data.duration}s`,
                    attachment: fs.createReadStream(cache)
                },
                event.threadID,
                () => {
                    fs.remove(cache).catch(() => {});
                }
            );

            react("✅");
        } catch (err) {
            console.log(err);
            react("❌");
            api.sendMessage(
                getLang("failed"),
                event.threadID,
                event.messageID
            );
        }
    }
};
