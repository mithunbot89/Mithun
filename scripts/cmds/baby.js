const axios = require('axios');

const BASE = "https://baby-api-sagor.vercel.app/baby";

module.exports.config = {
  name: "baby",
  version: "7.0.1",
  author: "SaGor",
  countDown: 0,
  role: 0,
  shortDescription: {
    vi: "Baby SIM — thông minh hơn sim simi 💬",
    en: "Baby SIM — smarter than sim simi 💬"
  },
  description: {
    vi: "Trò chuyện, dạy phản hồi và quản lý dữ liệu Baby SIM.",
    en: "Chat, teach replies, and manage Baby SIM data."
  },
  category: "chat",
  usePrefix: true,
  guide: {
    vi: [
      "[tinNhanBatKy]",
      "teach [TinNhanCuaBan] - [PhanHoi1], [PhanHoi2]...",
      "teach react [TinNhanCuaBan] - [react1], [react2]...",
      "remove [TinNhanCuaBan]",
      "rm [TinNhanCuaBan] - [soThuTu]",
      "msg [TinNhanCuaBan]",
      "list",
      "list all",
      "edit [TinNhanCuaBan] - [PhanHoiMoi]",
    ].join("\nOR\n"),
    en: [
      "[anyMessage]",
      "teach [YourMessage] - [Reply1], [Reply2]...",
      "teach react [YourMessage] - [react1], [react2]...",
      "remove [YourMessage]",
      "rm [YourMessage] - [indexNumber]",
      "msg [YourMessage]",
      "list",
      "list all",
      "edit [YourMessage] - [NewReply]",
    ].join("\nOR\n"),
  },
};

function m(data) {
  return data?.data?.choices?.[0]?.message ?? {};
}

async function api_get(url, params) {
  const res = await axios.get(url, { params });
  return res.data;
}

function send(api, event, text) {
  return api.sendMessage(text, event.threadID, event.messageID);
}

function saveReply(info, commandName, senderID, text) {
  if (!info?.messageID) return;
  global.GoatBot.onReply.set(info.messageID, {
    commandName,
    messageID: info.messageID,
    author: senderID,
    lnk: text || "",
  });
}

function pushReply(api, event, commandName, text) {
  return api.sendMessage(text, event.threadID, (err, info) => {
    if (!err) saveReply(info, commandName, event.senderID, text);
  }, event.messageID);
}

module.exports.onStart = async function ({ api, event, args, commandName, usersData }) {
  try {
    const raw   = args.join(" ");
    const lower = raw.toLowerCase().trim();
    const uid   = event.senderID;

    if (!args[0]) {
      const rnd = ["Bolo baby 😊", "hum 🤔", "type help baby", "type !baby hi"];
      return send(api, event, rnd[Math.floor(Math.random() * rnd.length)]);
    }

    if (args[0] === "list") {
      if (args[1] === "all") {
        const [rankData, statData] = await Promise.all([
          api_get(`${BASE}/teacher-rank`),
          api_get(`${BASE}/count`),
        ]);
        const rm     = m(rankData);
        const sm     = m(statData);
        const ranked = rm?.topTeachers ?? [];
        const out    = ranked.length
          ? ranked.map(t => `${t.rank}. ${t.name}: ${t.teachCount}`).join("\n")
          : "No teachers yet.";
        return send(api, event,
          `📚 Total QA = ${sm?.totalAsk ?? "?"}\n` +
          `💬 Total Answers = ${sm?.totalAnswer ?? "?"}\n` +
          `👁 Total Hits = ${sm?.totalMessageHits ?? "?"}\n\n` +
          `👑 Top Teachers (${rm?.total ?? ranked.length})\n${out}`
        );
      } else {
        const statData = await api_get(`${BASE}/count`);
        const sm       = m(statData);
        return send(api, event, `📚 Total QA = ${sm?.totalAsk ?? "?"}`);
      }
    }

    if (args[0] === "msg" || args[0] === "message") {
      const key = lower.replace(/^(msg|message)\s*/, "").trim();
      if (!key) return send(api, event, "❌ Format: msg [YourMessage]");
      const data = await api_get(BASE, { list: key });
      const msg  = m(data);
      if (msg?.error) return send(api, event, `❌ ${msg.error}`);
      const answers   = Array.isArray(msg?.answers) && msg.answers.length
        ? msg.answers.join("\n• ")
        : "No answers found.";
      const reactions = Array.isArray(msg?.reactions) && msg.reactions.length
        ? msg.reactions.join(" ")
        : "None";
      return send(api, event,
        `📩 Q: "${msg?.question ?? key}"\n` +
        `💬 Answers:\n• ${answers}\n` +
        `⚡ Reacts: ${reactions}\n` +
        `👁 Hits: ${msg?.messageCount ?? msg?.hitCount ?? "?"}`
      );
    }

    if (args[0] === "remove") {
      const key = lower.replace(/^remove\s*/, "").trim();
      if (!key) return send(api, event, "❌ Format: remove [YourMessage]");
      const data = await api_get(BASE, { remove: key });
      const msg  = m(data);
      return send(api, event, msg?.text ?? msg?.error ?? "Done ✅");
    }

    if (args[0] === "rm" && lower.includes(" - ")) {
      const body       = lower.replace(/^rm\s*/, "").trim();
      const [key, idx] = body.split(" - ");
      if (!key || idx === undefined)
        return send(api, event, "❌ Format: rm [YourMessage] - [indexNumber]");
      const data = await api_get(BASE, { remove: key.trim(), index: idx.trim() });
      const msg  = m(data);
      return send(api, event, msg?.text ?? msg?.error ?? "Done ✅");
    }

    if (args[0] === "edit" && lower.includes(" - ")) {
      const body       = lower.replace(/^edit\s*/, "").trim();
      const [key, val] = body.split(" - ");
      if (!key || !val || val.trim().length < 1)
        return send(api, event, "❌ Format: edit [YourMessage] - [NewReply]");
      const data = await api_get(BASE, { edit: key.trim(), replace: val.trim() });
      const msg  = m(data);
      if (msg?.error) return send(api, event, `❌ ${msg.error}`);
      return send(api, event,
        `✅ ${msg?.text ?? "Edit Done!"}\n` +
        `❓ Q: ${msg?.question ?? key.trim()}\n` +
        `💬 New Answer: ${msg?.newAnswer ?? val.trim()}`
      );
    }

    if (args[0] === "teach" && args[1] === "react" && lower.includes(" - ")) {
      const body       = lower.replace(/^teach\s+react\s*/, "").trim();
      const [key, val] = body.split(" - ");
      if (!key || !val || val.trim().length < 1)
        return send(api, event, "❌ Format: teach react [YourMessage] - [react1],[react2]...");
      const name = (await usersData.getName(uid)) || "Unknown";
      const data = await api_get(BASE, {
        teach: key.trim(), react: val.trim(), senderID: uid, teacher: name,
      });
      const msg = m(data);
      if (msg?.error) return send(api, event, `❌ ${msg.error}`);
      return send(api, event,
        `✅ ${msg?.text ?? "React Teaching Done!"}\n` +
        `❓ Q: ${msg?.question ?? key.trim()}\n` +
        `⚡ React: ${msg?.reaction ?? val.trim()}\n` +
        `👤 Teacher: ${msg?.teacher ?? name}\n` +
        `🔖 Status: ${msg?.status ?? "?"}\n` +
        `📊 Total QA: ${msg?.qaTotal ?? "?"}`
      );
    }

    if (args[0] === "teach" && lower.includes(" - ")) {
      const body       = lower.replace(/^teach\s*/, "").trim();
      const [key, val] = body.split(" - ");
      if (!key || !val || val.trim().length < 1)
        return send(api, event, "❌ Format: teach [YourMessage] - [Reply1],[Reply2]...");
      const name = (await usersData.getName(uid)) || "Unknown";
      const data = await api_get(BASE, {
        teach: key.trim(), reply: val.trim(), senderID: uid, teacher: name,
      });
      const msg = m(data);
      if (msg?.error) return send(api, event, `❌ ${msg.error}`);
      return send(api, event,
        `✅ ${msg?.text ?? "Teaching Done!"}\n` +
        `❓ Q: ${msg?.question ?? key.trim()}\n` +
        `💬 A: ${msg?.answer ?? val.trim()}\n` +
        `👤 Teacher: ${msg?.teacher ?? name}\n` +
        `🔖 Status: ${msg?.status ?? "?"}\n` +
        `📊 Total QA: ${msg?.qaTotal ?? "?"}`
      );
    }

    const data  = await api_get(BASE, { text: lower, senderID: uid, font: 1 });
    const msg   = m(data);
    const reply = msg?.reply ?? msg?.text ?? "...";
    return pushReply(api, event, commandName, reply);

  } catch (e) {
    return api.sendMessage(`❌ Error: ${e.message}`, event.threadID, event.messageID);
  }
};

module.exports.onReply = async function ({ api, event, Reply, commandName }) {
  try {
    if (event.type !== "message_reply") return;
    const body = (event.body || "").toLowerCase().trim();
    if (!body || !isNaN(body)) return;

    global.GoatBot.onReply.delete(Reply.messageID);

    const data  = await api_get(BASE, { text: body, senderID: event.senderID, font: 1 });
    const msg   = m(data);
    const reply = msg?.reply ?? msg?.text ?? "...";

    api.sendMessage(reply, event.threadID, (err, info) => {
      if (!err) saveReply(info, commandName, event.senderID, reply);
    }, event.messageID);

  } catch (err) {
    api.sendMessage(`❌ Error: ${err.message}`, event.threadID, event.messageID);
  }
};

module.exports.onChat = async function ({ api, event, commandName }) {
  try {
    const body = (event.body || "").toLowerCase().trim();

    const TRIGGERS = ["bby", "bot", "বেবি", "বট"];
    const trigger  = TRIGGERS.find(t => body.startsWith(t));
    if (!trigger) return;

    const text = body.slice(trigger.length).trim();

    if (!text) {
      const msgs = [
    "বেশি bot Bot করলে leave নিবো কিন্তু😒😒",
    "শুনবো না😼 তুমি আমার বস সাগর কে প্রেম করাই দাও নাই🥺পচা তুমি🥺",
    "আমি আবাল দের সাথে কথা বলি না,ok😒",
    "এতো ডেকো না,প্রেম এ পরে যাবো তো🙈",
    "Bolo Babu, তুমি কি আমার বস সাগর কে ভালোবাসো? 🙈💋",
    "বার বার ডাকলে মাথা গরম হয়ে যায় কিন্তু😑",
    "হ্যা বলো😒, তোমার জন্য কি করতে পারি😐😑?",
    "এতো ডাকছিস কেন?গালি শুনবি নাকি? 🤬",
    "I love you janu🥰",
    "আরে Bolo আমার জান ,কেমন আছো?😚",
    "আজ বট বলে অসম্মান করছি,😰😿",
    "Hop beda😾,Boss বল boss😼",
    "চুপ থাক ,নাই তো তোর দাত ভেগে দিবো কিন্তু",
    "আমাকে না ডেকে মেয়ে হলে বস সাগর এর ইনবক্সে চলে যা 🌚😂",
    "আমাকে বট না বলে , বস সাগর কে জানু বল জানু 😘",
    "বার বার Disturb করছিস কোনো😾,আমার জানুর সাথে ব্যাস্ত আছি😋",
    "আরে বলদ এতো ডাকিস কেন🤬",
    "আমাকে ডাকলে ,আমি কিন্তু কিস করে দিবো😘",
    "আমারে এতো ডাকিস না আমি মজা করার mood এ নাই এখন😒",
    "হ্যাঁ জানু , এইদিক এ আসো কিস দেই🤭 😘",
    "দূরে যা, তোর কোনো কাজ নাই, শুধু bot bot করিস 😉😋🤣",
    "তোর কথা তোর বাড়ি কেউ শুনে না ,তো আমি কোনো শুনবো ?🤔😂",
    "আমাকে ডেকো না,আমি বস সাগর এর সাথে ব্যাস্ত আছি",
    "কি হলো , মিস্টেক করচ্ছিস নাকি🤣",
    "বলো কি বলবা, সবার সামনে বলবা নাকি?🤭🤏",
    "জান মেয়ে হলে বস সাগর এর ইনবক্সে চলে যাও 😍🫣💕",
    "কালকে দেখা করিস তো একটু 😈",
    "হা বলো, শুনছি আমি 😏",
    "আর কত বার ডাকবি ,শুনছি তো",
    "হুম বলো কি বলবে😒",
    "বলো কি করতে পারি তোমার জন্য",
    "আমি তো অন্ধ কিছু দেখি না🐸 😎",
    "আরে বোকা বট না জানু বল জানু😌",
    "বলো জানু 🌚",
    "তোর কি চোখে পড়ে না আমি ব্যাস্ত আছি😒",
    "হুম জান তোমার ওই খানে উম্মহ😑😘",
    "আহ শুনা আমার তোমার অলিতে গলিতে উম্মাহ😇😘",
    "jang hanga korba😒😬",
    "হুম জান তোমার অইখানে উম্মমাহ😷😘",
    "আসসালামু আলাইকুম বলেন আপনার জন্য কি করতে পারি..!🥰",
    "ভালোবাসার নামক আবলামি করতে চাইলে বস সাগর এর ইনবক্সে গুতা দিন ~🙊😘🤣",
    "আমাকে এতো না ডেকে বস সাগর এর কে একটা গফ দে 🙄",
    "আমাকে এতো না ডেকছ কেন ভলো টালো বাসো নাকি🤭🙈",
    "🌻🌺💚-আসসালামু আলাইকুম ওয়া রাহমাতুল্লাহ-💚🌺🌻",
    "আমি এখন বস সাগর এর সাথে বিজি আছি আমাকে ডাকবেন না-😕😏 ধন্যবাদ-🤝🌻",
    "আমাকে না ডেকে আমার বস সাগর কে একটা জি এফ দাও-😽🫶🌺",
    "ঝাং থুমালে আইলাপিউ পেপি-💝😽",
    "উফফ বুঝলাম না এতো ডাকছেন কেনো-😤😡😈",
    "জান তোমার বান্ধবী রে আমার বস সাগর এর হাতে তুলে দিবা-🙊🙆‍♂",
    "আজকে আমার মন ভালো নেই তাই আমারে ডাকবেন না-😪🤧",
    "ঝাং 🫵থুমালে য়ামি রাইতে পালুপাসি উম্মম্মাহ-🌺🤤💦",
    "চুনা ও চুনা আমার বস সাগর এর হবু বউ রে কেও দেকছো খুজে পাচ্ছি না😪🤧😭",
    "স্বপ্ন তোমারে নিয়ে দেখতে চাই তুমি যদি আমার হয়ে থেকে যাও-💝🌺🌻",
    "জান হাঙ্গা করবা-🙊😝🌻",
    "তোদের জন্য একটুও শান্তি নাই! শুধু ডিস্টার্ব করিস 😿",
    "জান মেয়ে হলে চিপায় আসো বস সাগর এর থেকে অনেক ভালোবাসা শিখছি তোমার জন্য-🙊🙈😽",
    "ইসস এতো ডাকো কেনো লজ্জা লাগে তো-🙈🖤🌼",
    "আমার বস সাগর এর পক্ষ থেকে তোমারে এতো এতো ভালোবাসা-🥰😽🫶 আমার বস সাগর ইসলামে'র জন্য দোয়া করবেন-💝💚🌺🌻",
    "- ভালোবাসা নামক আব্লামি করতে মন চাইলে আমার বস সাগর এর ইনবক্স চলে যাও-🙊🥱👅 🌻",
    "আমার জান তুমি শুধু আমার আমি তোমারে ৩৬৫ দিন ভালোবাসি-💝🌺😽",
    "কিরে প্রেম করবি তাহলে বস সাগর এর ইনবক্সে গুতা দে 😘🤌",
    "জান আমার বস সাগর কে বিয়ে করবা-🙊😘🥳",
      ];
      return api.sendMessage(
        msgs[Math.floor(Math.random() * msgs.length)],
        event.threadID,
        (err, info) => {
          if (!err) saveReply(info, commandName, event.senderID, "");
        },
        event.messageID
      );
    }

    const data  = await api_get(BASE, { text: text, senderID: event.senderID, font: 1 });
    const msg   = m(data);
    const reply = msg?.reply ?? msg?.text ?? "...";

    api.sendMessage(reply, event.threadID, (err, info) => {
      if (!err) saveReply(info, commandName, event.senderID, reply);
    }, event.messageID);

  } catch (err) {
    api.sendMessage(`❌ Error: ${err.message}`, event.threadID, event.messageID);
  }
};
