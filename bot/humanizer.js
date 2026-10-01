const MIN_THREAD_GAP_MS = 2500;
const MAX_PER_MINUTE = 20;
const TYPING_MIN_MS = 1200;
const TYPING_MAX_MS = 3800;
const MAX_EXTRA_WAIT_MS = 30000;

function rand(min, max) {
  return min + Math.random() * (max - min);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = function humanizeApi(api) {
  if (!api || typeof api.sendMessage !== "function") return api;
  if (api.sendMessage.__humanized) return api;

  const origSend = api.sendMessage.bind(api);
  const lastSendAt = new Map();
  const threadQueue = new Map();
  const sendTimes = [];

  function typing(threadID, on) {
    try {
      const fn = api.sendTypingIndicator || api.typing;
      if (typeof fn === "function") fn.call(api, String(threadID), !!on);
    } catch (e) {  }
  }

  function pruneWindow(now) {
    while (sendTimes.length && sendTimes[0] <= now - 60000) sendTimes.shift();
  }

  async function runSend(msg, threadID, cb, hasCb, replyTo) {
    const tid = String(threadID);
    const now = Date.now();

    const gapWait = Math.max(0, MIN_THREAD_GAP_MS - (now - (lastSendAt.get(tid) || 0)));

    pruneWindow(now);
    let rateWait = 0;
    if (sendTimes.length >= MAX_PER_MINUTE) {
      rateWait = Math.min(MAX_EXTRA_WAIT_MS, Math.max(0, sendTimes[0] + 60000 - now));
    }

    const delay = Math.round(Math.max(gapWait, rateWait) + rand(TYPING_MIN_MS, TYPING_MAX_MS));

    typing(tid, true);
    await sleep(delay);
    typing(tid, false);

    const t = Date.now();
    lastSendAt.set(tid, t);
    pruneWindow(t);
    sendTimes.push(t);

    return new Promise((resolve) => {
      const done = (err, info) => {
        if (hasCb) { try { cb(err, info); } catch (e) {} }
        resolve(info);
      };
      try {
        const r = origSend(msg, threadID, done, replyTo);
        if (r && typeof r.then === "function") r.catch(() => {});
      } catch (e) {
        done(e);
      }
    });
  }

  function wrapped(msg, threadID, callback, replyToMessage) {

    let cb = callback;
    let replyTo = replyToMessage;
    if (typeof callback === "string" && !replyTo) {
      replyTo = callback;
      cb = undefined;
    }
    const hasCb = typeof cb === "function";
    const tid = String(threadID);

    const prev = threadQueue.get(tid) || Promise.resolve();
    const task = prev.then(() => runSend(msg, threadID, cb, hasCb, replyTo));
    threadQueue.set(tid, task.catch(() => {}));
    if (threadQueue.size > 1000) {
      const oldest = threadQueue.keys().next().value;
      threadQueue.delete(oldest);
    }
    return task;
  }

  wrapped.__humanized = true;
  api.sendMessage = wrapped;
  return api;
};
