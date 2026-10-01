const Canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");

const W = 1536, H = 1024;
const SCALE = 2;

const ASSET_DIR = path.join(__dirname, "assets");
const FONT_DIR = path.join(ASSET_DIR, "font");
const AVATAR_PATH = path.join(ASSET_DIR, "image", "avatar.png");

function safeRegisterFont(file, family) {
  const p = path.join(FONT_DIR, file);
  if (fs.existsSync(p)) Canvas.registerFont(p, { family });
}
safeRegisterFont("BeVietnamPro-Bold.ttf", "BVP-Bold");
safeRegisterFont("BeVietnamPro-SemiBold.ttf", "BVP-SemiBold");
safeRegisterFont("BeVietnamPro-Regular.ttf", "BVP-Regular");

const FONT_BOLD = "BVP-Bold, sans-serif";
const FONT_SEMI = "BVP-SemiBold, sans-serif";
const FONT_REG  = "BVP-Regular, sans-serif";

const COLOR = {
  bg: "#07060f",
  bgPanel: "rgba(15,15,30,0.55)",
  border: "rgba(120,120,180,0.25)",
  white: "#f1f2f6",
  gray: "#8b8fa3",
  grayDim: "#5c6079",
  purple: "#a855f7",
  purpleLight: "#c084fc",
  blue: "#38bdf8",
  cyan: "#22d3ee",
  green: "#4ade80",
  pink: "#f472b6",
  yellow: "#facc15",
};

module.exports.config = {
  name: "uptime",
  aliases: ["upt", "up"],
  version: "4.0.0",
  author: "SaGor",
  countDown: 5,
  role: 0,
  shortDescription: { vi: "Xem thời gian hoạt động của bot (dạng ảnh)", en: "Check bot uptime (image card)" },
  description: { vi: "Hiển thị thời gian hoạt động và thông tin hệ thống của bot dưới dạng ảnh.", en: "Displays bot uptime and system info as a styled image card." },
  category: "system",
  guide: { vi: "{pn}", en: "{pn}" }
};

function formatUptime(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return { days, hours, minutes, seconds };
}

function formatDate(date) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = date.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}, ${date.getFullYear()}  •  ${h}:${mm} ${ampm}`;
}

function formatMB(mb) {
  const n = Number(mb);
  if (n >= 1024) return `${(n / 1024).toFixed(1)} GB`;
  return `${Math.round(n)} MB`;
}

function sampleCpuPercent() {
  return new Promise((resolve) => {
    const start = process.cpuUsage();
    const startTime = process.hrtime.bigint();
    setTimeout(() => {
      const diff = process.cpuUsage(start);
      const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
      const usedMs = (diff.user + diff.system) / 1000;
      const percent = (usedMs / elapsedMs) * 100 / os.cpus().length;
      resolve(Math.min(100, Math.max(0, percent)));
    }, 150);
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof r === "number") r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

function panel(ctx, x, y, w, h, r, opts = {}) {
  const { border = COLOR.border, glow = null, fill = COLOR.bgPanel } = opts;
  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 18;
  }
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.restore();
}

function text(ctx, str, x, y, { font, color, align = "left", baseline = "alphabetic", letterSpacing = 0 }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = letterSpacing ? "left" : align;
  ctx.textBaseline = baseline;
  if (!letterSpacing) {
    ctx.fillText(str, x, y);
    return ctx.measureText(str).width;
  }

  let totalWidth = 0;
  for (const ch of str) totalWidth += ctx.measureText(ch).width + letterSpacing;
  let startX = x;
  if (align === "center") startX = x - totalWidth / 2;
  else if (align === "right") startX = x - totalWidth;
  let cx = startX;
  for (const ch of str) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + letterSpacing;
  }
  return totalWidth;
}

function gradientText(ctx, str, x, y, font, colorStops, align = "left") {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  const w = ctx.measureText(str).width;
  let gx0 = x, gx1 = x + w;
  if (align === "center") { gx0 = x - w / 2; gx1 = x + w / 2; }
  else if (align === "right") { gx0 = x - w; gx1 = x; }
  const grad = ctx.createLinearGradient(gx0, 0, gx1, 0);
  colorStops.forEach(([stop, color]) => grad.addColorStop(stop, color));
  ctx.fillStyle = grad;
  ctx.fillText(str, x, y);
  return w;
}

function dot(ctx, x, y, r, color, glow) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function iconBadge(ctx, x, y, size, color, drawFn) {
  roundRectPath(ctx, x, y, size, size, size * 0.28);
  ctx.fillStyle = color.replace(")", ",0.15)").replace("rgb", "rgba");
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexToRgba(color, 0.14);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = hexToRgba(color, 0.45);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.6, size * 0.055);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawFn(ctx, size * 0.5);
  ctx.restore();
}

function iconPlain(ctx, x, y, size, color, drawFn) {

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1.4, size * 0.09);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawFn(ctx, size * 0.5);
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const Icons = {
  check: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.45, 0);
    ctx.lineTo(-s * 0.1, s * 0.4);
    ctx.lineTo(s * 0.5, -s * 0.45);
    ctx.stroke();
  },
  clock: (ctx, s) => {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -s * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.3, s * 0.12); ctx.stroke();
  },
  node: (ctx, s) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(a) * s * 0.6, py = Math.sin(a) * s * 0.6;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    text(ctx, "JS", 0, s * 0.28, { font: `bold ${Math.round(s * 0.6)}px ${FONT_BOLD}`, color: ctx.fillStyle, align: "center" });
  },
  platform: (ctx, s) => {
    roundRectPath(ctx, -s * 0.55, -s * 0.55, s * 1.1, s * 1.1, s * 0.15);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.05); ctx.lineTo(s * 0.55, -s * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, s * 0.55); ctx.stroke();
  },
  memory: (ctx, s) => {
    roundRectPath(ctx, -s * 0.5, -s * 0.5, s, s, s * 0.15);
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(-s * 0.5, i * s * 0.28); ctx.lineTo(-s * 0.7, i * s * 0.28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.5, i * s * 0.28); ctx.lineTo(s * 0.7, i * s * 0.28); ctx.stroke();
    }
  },
  cpu: (ctx, s) => {
    roundRectPath(ctx, -s * 0.4, -s * 0.4, s * 0.8, s * 0.8, s * 0.1);
    ctx.stroke();
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.moveTo(i * s * 0.4, -s * 0.2); ctx.lineTo(i * s * 0.6, -s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i * s * 0.4, s * 0.2); ctx.lineTo(i * s * 0.6, s * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s * 0.2, i * s * 0.4); ctx.lineTo(-s * 0.2, i * s * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.2, i * s * 0.4); ctx.lineTo(s * 0.2, i * s * 0.6); ctx.stroke();
    }
  },
  wifi: (ctx, s) => {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, s * 0.35, s * (0.25 + i * 0.22), Math.PI * 1.25, Math.PI * 1.75);
      ctx.stroke();
    }
    dot(ctx, 0, s * 0.35, s * 0.08, ctx.strokeStyle, 0);
  },
  refresh: (ctx, s) => {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.5, -Math.PI * 0.15, Math.PI * 1.3); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.42, -s * 0.35); ctx.lineTo(s * 0.55, -s * 0.05); ctx.lineTo(s * 0.22, -s * 0.15);
    ctx.closePath(); ctx.fill();
  },
  terminal: (ctx, s) => {
    text(ctx, ">_", 0, s * 0.3, { font: `bold ${Math.round(s)}px ${FONT_BOLD}`, color: ctx.fillStyle, align: "center" });
  },
  code: (ctx, s) => {
    text(ctx, "</>", 0, s * 0.28, { font: `bold ${Math.round(s * 0.85)}px ${FONT_BOLD}`, color: ctx.fillStyle, align: "center" });
  },
  bars: (ctx, s) => {
    ctx.lineWidth *= 1.6;
    ctx.beginPath(); ctx.moveTo(-s * 0.45, s * 0.35); ctx.lineTo(-s * 0.45, s * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, s * 0.35); ctx.lineTo(0, -s * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.45, s * 0.35); ctx.lineTo(s * 0.45, -s * 0.5); ctx.stroke();
  },
  shield: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.45, -s * 0.3);
    ctx.lineTo(s * 0.45, s * 0.1);
    ctx.quadraticCurveTo(s * 0.45, s * 0.5, 0, s * 0.6);
    ctx.quadraticCurveTo(-s * 0.45, s * 0.5, -s * 0.45, s * 0.1);
    ctx.lineTo(-s * 0.45, -s * 0.3);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.18, 0); ctx.lineTo(-s * 0.02, s * 0.18); ctx.lineTo(s * 0.28, -s * 0.18); ctx.stroke();
  },
  link: (ctx, s) => {
    ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.15, s * 0.32, s * 0.2, -Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(s * 0.15, s * 0.15, s * 0.32, s * 0.2, -Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
  },
  globe: (ctx, s) => {
    ctx.beginPath(); ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.25, s * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.55, 0); ctx.lineTo(s * 0.55, 0); ctx.stroke();
  },
  database: (ctx, s) => {
    ctx.beginPath(); ctx.ellipse(0, -s * 0.35, s * 0.5, s * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.35); ctx.lineTo(-s * 0.5, s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.35); ctx.lineTo(s * 0.5, s * 0.35); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.5, s * 0.18, 0, 0, Math.PI); ctx.stroke();
  },
  heart: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.45);
    ctx.bezierCurveTo(-s * 0.7, -s * 0.05, -s * 0.35, -s * 0.65, 0, -s * 0.18);
    ctx.bezierCurveTo(s * 0.35, -s * 0.65, s * 0.7, -s * 0.05, 0, s * 0.45);
    ctx.closePath();
    ctx.fill();
  },
  crown: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, s * 0.35);
    ctx.lineTo(-s * 0.5, -s * 0.05);
    ctx.lineTo(-s * 0.22, s * 0.15);
    ctx.lineTo(0, -s * 0.4);
    ctx.lineTo(s * 0.22, s * 0.15);
    ctx.lineTo(s * 0.5, -s * 0.05);
    ctx.lineTo(s * 0.5, s * 0.35);
    ctx.closePath();
    ctx.fill();
  },
  calendar: (ctx, s) => {
    roundRectPath(ctx, -s * 0.5, -s * 0.4, s, s * 0.9, s * 0.12);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.12); ctx.lineTo(s * 0.5, -s * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.55); ctx.lineTo(-s * 0.22, -s * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.22, -s * 0.55); ctx.lineTo(s * 0.22, -s * 0.3); ctx.stroke();
  },
  lightning: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.55);
    ctx.lineTo(-s * 0.32, s * 0.08);
    ctx.lineTo(-s * 0.02, s * 0.08);
    ctx.lineTo(-s * 0.12, s * 0.55);
    ctx.lineTo(s * 0.32, -s * 0.1);
    ctx.lineTo(s * 0.02, -s * 0.1);
    ctx.closePath();
    ctx.fill();
  },
};

async function buildCard({ uptimeStr, up, nodeVersion, platformStr, memMB, totalMemMB, cpuPercent, ping, aliveShare, startedDate, cmdCount, eventCount }) {
  const canvas = Canvas.createCanvas(W * SCALE, H * SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

    const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0a0916");
  bgGrad.addColorStop(0.5, "#07060f");
  bgGrad.addColorStop(1, "#0a0714");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = "#a855f7";
  for (let gx = 20; gx < W; gx += 28) {
    for (let gy = 20; gy < H; gy += 28) {
      ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  const glowTL = ctx.createRadialGradient(0, 0, 0, 0, 0, 420);
  glowTL.addColorStop(0, "rgba(168,85,247,0.16)");
  glowTL.addColorStop(1, "rgba(168,85,247,0)");
  ctx.fillStyle = glowTL; ctx.fillRect(0, 0, 500, 500);

  const glowBR = ctx.createRadialGradient(W, H, 0, W, H, 460);
  glowBR.addColorStop(0, "rgba(56,189,248,0.14)");
  glowBR.addColorStop(1, "rgba(56,189,248,0)");
  ctx.fillStyle = glowBR; ctx.fillRect(W - 500, H - 500, 500, 500);

  ctx.save();
  ctx.fillStyle = "rgba(168,85,247,0.5)";
  for (let i = 0; i < 8; i++) {
    ctx.beginPath(); ctx.arc(18, 160 + i * 16, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(56,189,248,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(W - 18, 110 + i * 14);
    ctx.lineTo(W - 8, 110 + i * 14);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(244,114,182,0.28)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  [[40, 980, 130, 890], [70, 1000, 160, 910]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  ctx.restore();

    dot(ctx, 78, 66, 6, COLOR.purple, 12);
  let hx = 100;
  hx += text(ctx, "SAGORBOT", hx, 74, { font: `bold 34px ${FONT_BOLD}`, color: COLOR.white });
  text(ctx, " V2", hx, 74, { font: `bold 34px ${FONT_BOLD}`, color: COLOR.purpleLight });
  text(ctx, "SYSTEM UPTIME", 100, 102, { font: `15px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 3 });

  const pillW = 350, pillX = W - 66 - pillW, pillY = 46;
  panel(ctx, pillX, pillY, pillW, 44, 22, { border: hexToRgba(COLOR.cyan, 0.5), glow: hexToRgba(COLOR.cyan, 0.25) });
  iconPlain(ctx, pillX + 26, pillY + 22, 16, COLOR.cyan, Icons.refresh);
  text(ctx, "SYSTEM STATUS:", pillX + 46, pillY + 28, { font: `15px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 1 });
  text(ctx, "ONLINE", pillX + 206, pillY + 28, { font: `bold 16px ${FONT_BOLD}`, color: COLOR.green });
  dot(ctx, pillX + pillW - 32, pillY + 22, 6, COLOR.green, 10);

    const LX = 66, LY = 120, LW = 714, LH = 610;
  panel(ctx, LX, LY, LW, LH, 24, { border: hexToRgba(COLOR.purple, 0.35), glow: hexToRgba(COLOR.blue, 0.12) });

  ctx.save();
  ctx.strokeStyle = "rgba(56,189,248,0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(LX + LW - 40, LY); ctx.lineTo(LX + LW, LY); ctx.lineTo(LX + LW, LY + 40); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(LX + LW, LY + LH - 40); ctx.lineTo(LX + LW, LY + LH); ctx.lineTo(LX + LW - 40, LY + LH); ctx.stroke();
  ctx.restore();

  const avCX = LX + 168, avCY = LY + 210, avR = 108;
  const ringGrad = ctx.createLinearGradient(avCX - avR, avCY - avR, avCX + avR, avCY + avR);
  ringGrad.addColorStop(0, COLOR.purple);
  ringGrad.addColorStop(1, COLOR.blue);
  ctx.save();
  ctx.shadowColor = COLOR.purple;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(avCX, avCY, avR, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = ringGrad;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avCX, avCY, avR - 8, 0, Math.PI * 2);
  ctx.clip();
  if (fs.existsSync(AVATAR_PATH)) {
    const av = await Canvas.loadImage(AVATAR_PATH);
    ctx.drawImage(av, avCX - avR + 8, avCY - avR + 8, (avR - 8) * 2, (avR - 8) * 2);
  } else {
    ctx.fillStyle = "#0e0d1a";
    ctx.fillRect(avCX - avR, avCY - avR, avR * 2, avR * 2);
    text(ctx, "GOAT", avCX, avCY + 10, { font: `bold 26px ${FONT_BOLD}`, color: COLOR.purpleLight, align: "center" });
  }
  ctx.restore();
  dot(ctx, avCX + avR - 30, avCY - avR + 30, 9, COLOR.green, 12);

  const TX = LX + 336;
  let ty = LY + 92;
  let tw = text(ctx, "SAGORBOT", TX, ty, { font: `bold 46px ${FONT_BOLD}`, color: COLOR.white });
  text(ctx, " V2", TX + tw, ty, { font: `bold 46px ${FONT_BOLD}`, color: COLOR.purpleLight });
  text(ctx, "ULTIMATE DISCORD/FACEBOOK BOT", TX, ty + 30, { font: `14px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 2 });

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath(); ctx.moveTo(TX, ty + 48); ctx.lineTo(TX + 320, ty + 48); ctx.stroke();
  ctx.restore();

  iconBadge(ctx, TX, ty + 66, 34, COLOR.cyan, Icons.check);
  text(ctx, "VERIFIED BOT", TX + 44, ty + 88, { font: `bold 16px ${FONT_SEMI}`, color: COLOR.cyan, letterSpacing: 1 });

  text(ctx, `"Built with Passion, Powered by Code."`, TX, ty + 132, { font: `italic 15px ${FONT_REG}`, color: COLOR.gray });
  let sgAttrW = text(ctx, "— SaGor", TX, ty + 158, { font: `15px ${FONT_SEMI}`, color: COLOR.purpleLight });
  iconPlain(ctx, TX + sgAttrW + 18, ty + 152, 18, COLOR.purple, Icons.heart);

  const upY = LY + 400;
  iconBadge(ctx, LX + 32, upY, 24, COLOR.purple, Icons.clock);
  text(ctx, "BOT UPTIME", LX + 68, upY + 17, { font: `15px ${FONT_SEMI}`, color: COLOR.white, letterSpacing: 2 });

  gradientText(ctx, uptimeStr, LX + 32, upY + 88, `bold 62px ${FONT_BOLD}`,
    [[0, COLOR.purpleLight], [0.5, "#a78bfa"], [1, COLOR.blue]]);

  text(ctx, "The bot has been online and running smoothly.", LX + 32, upY + 122, { font: `16px ${FONT_REG}`, color: COLOR.gray });

    const RX = LX + LW + 22, RW = W - 66 - RX;
  const OVY = LY, OVH = 390;
  panel(ctx, RX, OVY, RW, OVH, 20, { border: hexToRgba(COLOR.cyan, 0.35), glow: hexToRgba(COLOR.cyan, 0.1) });

  iconBadge(ctx, RX + 30, OVY + 28, 26, COLOR.cyan, Icons.bars);
  text(ctx, "SYSTEM OVERVIEW", RX + 68, OVY + 47, { font: `bold 19px ${FONT_BOLD}`, color: COLOR.white });
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.moveTo(RX + 30, OVY + 68); ctx.lineTo(RX + RW - 30, OVY + 68); ctx.stroke();
  ctx.restore();

  const statRows = [
    [
      { icon: Icons.node, color: COLOR.green, label: "NODE.JS", value: nodeVersion },
      { icon: Icons.platform, color: COLOR.blue, label: "PLATFORM", value: platformStr },
    ],
    [
      { icon: Icons.memory, color: COLOR.purple, label: "MEMORY USAGE", value: `${formatMB(memMB)} / ${formatMB(totalMemMB)}` },
      { icon: Icons.cpu, color: COLOR.pink, label: "CPU USAGE", value: `${cpuPercent.toFixed(1)}%`, bar: cpuPercent / 100 },
    ],
    [
      { icon: Icons.wifi, color: COLOR.blue, label: "PING", value: ping, bar: null },
      { icon: Icons.refresh, color: COLOR.cyan, label: "UPTIME PERCENT", value: `${aliveShare.toFixed(2)}%`, bar: aliveShare / 100 },
    ],
  ];

  const colX = [RX + 30, RX + RW / 2 + 10];
  const colW = RW / 2 - 44;
  statRows.forEach((row, ri) => {
    const rowY = OVY + 100 + ri * 96;
    row.forEach((item, ci) => {
      const x = colX[ci];
      iconBadge(ctx, x, rowY, 46, item.color, item.icon);
      text(ctx, item.label, x + 58, rowY + 18, { font: `13px ${FONT_SEMI}`, color: item.color, letterSpacing: 1 });
      text(ctx, item.value, x + 58, rowY + 40, { font: `20px ${FONT_SEMI}`, color: COLOR.white });
      if (item.bar !== undefined && item.bar !== null) {
        const barY = rowY + 50, barW = colW - 58;
        roundRectPath(ctx, x + 58, barY, barW, 4, 2);
        ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
        roundRectPath(ctx, x + 58, barY, Math.max(6, barW * item.bar), 4, 2);
        ctx.fillStyle = item.color; ctx.fill();
      }
    });
  });

    const CEY = OVY + OVH + 18, CEH = 195;
  panel(ctx, RX, CEY, RW, CEH, 20, { border: hexToRgba(COLOR.purple, 0.3), glow: hexToRgba(COLOR.purple, 0.1) });

  iconBadge(ctx, RX + 30, CEY + 28, 26, COLOR.yellow, Icons.lightning);
  text(ctx, "COMMANDS & EVENTS", RX + 68, CEY + 47, { font: `bold 19px ${FONT_BOLD}`, color: COLOR.white });

  const boxW = RW / 2 - 44, boxH = 100, boxY = CEY + 66;
  const box1X = RX + 28, box2X = RX + RW / 2 + 8;

  panel(ctx, box1X, boxY, boxW, boxH, 16, { border: hexToRgba(COLOR.purple, 0.4), fill: hexToRgba(COLOR.purple, 0.06) });
  iconBadge(ctx, box1X + 20, boxY + 26, 48, COLOR.purple, Icons.terminal);
  text(ctx, String(cmdCount), box1X + 88, boxY + 46, { font: `bold 30px ${FONT_BOLD}`, color: "#e9d5ff" });
  text(ctx, "COMMANDS", box1X + 88, boxY + 70, { font: `13px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 1 });

  panel(ctx, box2X, boxY, boxW, boxH, 16, { border: hexToRgba(COLOR.cyan, 0.4), fill: hexToRgba(COLOR.cyan, 0.06) });
  iconBadge(ctx, box2X + 20, boxY + 26, 48, COLOR.cyan, Icons.code);
  text(ctx, String(eventCount), box2X + 88, boxY + 46, { font: `bold 30px ${FONT_BOLD}`, color: "#bae6fd" });
  text(ctx, "EVENTS", box2X + 88, boxY + 70, { font: `13px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 1 });

    const FBY = LY + LH + 16, FBH = 88, FBX = 66, FBW = W - 132;
  panel(ctx, FBX, FBY, FBW, FBH, 18, { border: "rgba(255,255,255,0.08)" });

  const features = [
    { icon: Icons.shield, color: COLOR.purple, label: "ANTI-SPAM", sub: "PROTECTED" },
    { icon: Icons.link, color: COLOR.cyan, label: "ANTI-LINK", sub: "ENABLED" },
    { icon: Icons.bars, color: COLOR.green, label: "RANK SYSTEM", sub: "ACTIVE" },
    { icon: Icons.globe, color: COLOR.yellow, label: "MULTI-LANGUAGE", sub: "SUPPORTED" },
    { icon: Icons.database, color: COLOR.pink, label: "DATABASE", sub: "CONNECTED" },
    { icon: Icons.clock, color: COLOR.blue, label: "AUTO TASKS", sub: "RUNNING" },
  ];
  const segW = FBW / features.length;
  features.forEach((f, i) => {
    const segX = FBX + i * segW;
    const iconX = segX + 26, iconY = FBY + FBH / 2 - 18;
    iconBadge(ctx, iconX, iconY, 36, f.color, f.icon);
    text(ctx, f.label, iconX + 48, FBY + FBH / 2 - 6, { font: `bold 14px ${FONT_SEMI}`, color: f.color });
    text(ctx, f.sub, iconX + 48, FBY + FBH / 2 + 14, { font: `13px ${FONT_REG}`, color: COLOR.gray, letterSpacing: 0.5 });
    if (i > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.moveTo(segX, FBY + 16); ctx.lineTo(segX, FBY + FBH - 16); ctx.stroke();
      ctx.restore();
    }
  });

    const FY = FBY + FBH + 22, FH = 118;
  panel(ctx, FBX, FY, FBW, FH, 18, { border: "rgba(255,255,255,0.06)" });

  iconBadge(ctx, FBX + 26, FY + 24, 34, COLOR.yellow, Icons.crown);
  text(ctx, "DEVELOPED BY", FBX + 72, FY + 36, { font: `13px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 1 });
  let sgx = FBX + 72;
  sgx += text(ctx, "SaGor", sgx, FY + 62, { font: `bold 22px ${FONT_BOLD}`, color: COLOR.purpleLight });
  iconBadge(ctx, sgx + 8, FY + 46, 20, COLOR.cyan, Icons.check);
  text(ctx, "PASSION | CODE | INNOVATION", FBX + 72, FY + 88, { font: `12px ${FONT_SEMI}`, color: COLOR.purple, letterSpacing: 1 });

  const qW = 560, qX = FBX + FBW / 2 - qW / 2, qY = FY + 24, qH = 56;
  panel(ctx, qX, qY, qW, qH, 28, { border: hexToRgba(COLOR.purple, 0.3) });
  text(ctx, `"We don't just build bots, we build experiences."`, qX + qW / 2, qY + qH / 2 + 5, { font: `italic 15px ${FONT_REG}`, color: COLOR.gray, align: "center" });

  iconBadge(ctx, FBX + FBW / 2 - 12, FY + FH - 34, 24, COLOR.grayDim, Icons.code);

  const ruX = FBX + FBW - 300;
  iconBadge(ctx, ruX, FY + 24, 34, COLOR.purple, Icons.calendar);
  text(ctx, "UPTIME SINCE", ruX + 46, FY + 36, { font: `13px ${FONT_SEMI}`, color: COLOR.gray, letterSpacing: 1 });
  text(ctx, formatDate(startedDate), ruX + 46, FY + 62, { font: `bold 18px ${FONT_SEMI}`, color: COLOR.white });

  return canvas;
}

module.exports.onStart = async function ({ api, event }) {
  const up = formatUptime(process.uptime());
  const uptimeStr = `${up.days}D ${up.hours}H ${up.minutes}M ${up.seconds}S`;
  const cpuPercent = await sampleCpuPercent();
  const mem = process.memoryUsage();
  const memMB = (mem.rss / 1024 / 1024).toFixed(0);
  const totalMemMB = (os.totalmem() / 1024 / 1024).toFixed(0);

  let ping = "N/A";
  if (event?.timestamp) {
    const diff = Date.now() - Number(event.timestamp);
    if (diff >= 0 && diff < 60000) ping = `${diff}ms`;
  }

  const osUp = os.uptime();
  const aliveShare = osUp > 0 ? Math.min(100, (process.uptime() / osUp) * 100) : 100;
  const startedDate = new Date(Date.now() - process.uptime() * 1000);

  const cmdCount = global.GoatBot?.commands?.size ?? 0;
  const eventCount = global.GoatBot?.eventCommands?.size ?? 0;

  const canvas = await buildCard({
    uptimeStr, up,
    nodeVersion: process.version,
    platformStr: `${os.type()} ${os.arch()}`,
    memMB, totalMemMB,
    cpuPercent, ping, aliveShare,
    startedDate, cmdCount, eventCount
  });

  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `uptime_${Date.now()}.png`);
  await fs.writeFile(filePath, canvas.toBuffer("image/png"));

  await api.sendMessage(
    {
      body: `🤖 SagorBot — Uptime: ${up.days}d ${up.hours}h ${up.minutes}m ${up.seconds}s`,
      attachment: fs.createReadStream(filePath)
    },
    event.threadID,
    () => { fs.remove(filePath).catch(() => {}); },
    event.messageID
  );
};
