const fs = require("fs");
const dns = require("dns").promises;
const { downloadVideo } = require("sagor-video-downloader");

const MAX_LINKS_PER_MESSAGE = 3;
const THREAD_COOLDOWN_MS = 10 * 1000;
const lastRunByThread = new Map();

function isPrivateOrLocalIP(ip) {
    if (ip.includes(":")) {

        return ip === "::1" || /^fe80:/i.test(ip) || /^f[cd][0-9a-f]{2}:/i.test(ip);
    }
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0) return true;
    return false;
}

async function isSafeExternalUrl(urlStr) {
    let url;
    try {
        url = new URL(urlStr);
    }
    catch {
        return false;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    try {
        const records = await dns.lookup(url.hostname, { all: true });
        if (!records.length) return false;
        return records.every(r => !isPrivateOrLocalIP(r.address));
    }
    catch {
        return false;
    }
}

module.exports = {
    config: {
        name: "autodown",
        version: "1.3",
        author: "SAGOR",
        countDown: 5,
        role: 0,
        shortDescription: "Auto-download & send videos silently",
        category: "media",
    },

    onStart: async function () {},

    onChat: async function ({ api, event }) {

        const threadID = event.threadID;
        const messageID = event.messageID;
        const message = event.body || "";

        const linkMatches = message.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatches) return;

        const now = Date.now();
        const lastRun = lastRunByThread.get(threadID) || 0;
        if (now - lastRun < THREAD_COOLDOWN_MS) return;
        lastRunByThread.set(threadID, now);

        const uniqueLinks = [...new Set(linkMatches)].slice(0, MAX_LINKS_PER_MESSAGE);

        api.setMessageReaction("⏳", messageID, threadID, () => {}, true);

        let successCount = 0;
        let failCount = 0;

        for (const url of uniqueLinks) {
            try {

                if (!(await isSafeExternalUrl(url))) {
                    failCount++;
                    continue;
                }

                const { title, filePath } = await downloadVideo(url);

                if (!filePath || !fs.existsSync(filePath)) throw new Error();

                const stats = fs.statSync(filePath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                if (fileSizeInMB > 25) {
                    fs.unlinkSync(filePath);
                    failCount++;
                    continue;
                }

                await api.sendMessage(
                    {
                        body:
`📥 ᴠɪᴅᴇᴏ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ
━━━━━━━━━━━━━━━
🎬 ᴛɪᴛʟᴇ: ${title || "Video File"}
📦 sɪᴢᴇ: ${fileSizeInMB.toFixed(2)} MB
━━━━━━━━━━━━━━━`,
                        attachment: fs.createReadStream(filePath)
                    },
                    threadID
                );

                fs.unlinkSync(filePath);
                successCount++;

            } catch (err) {
                failCount++;
            }
        }

        const finalReaction =
            successCount > 0 && failCount === 0 ? "✅" :
            successCount > 0 ? "⚠️" : "❌";

        api.setMessageReaction(finalReaction, messageID, threadID, () => {}, true);
    }
};
