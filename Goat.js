process.on('unhandledRejection', error => console.log(error));
process.on('uncaughtException', error => console.log(error));

const axios = require("axios");
const fs = require("fs-extra");
const google = require("googleapis").google;
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { execSync } = require('child_process');
const log = require('./logger/log.js');
const path = require("path");

process.env.BLUEBIRD_W_FORGOTTEN_RETURN = 0;

function validJSON(pathDir) {
	try {
		if (!fs.existsSync(pathDir))
			throw new Error(`File "${pathDir}" not found`);
		const content = fs.readFileSync(pathDir, "utf8");
		JSON.parse(content);
		return true;
	}
	catch (err) {
		let msgError = err.message;
		throw new Error(msgError);
	}
}

const { NODE_ENV } = process.env;
const dirConfig = path.normalize(`${__dirname}/config.json`);
const dirConfigCommands = path.normalize(`${__dirname}/configCommands.json`);
const dirAccount = path.normalize(`${__dirname}/account.txt`);

for (const pathDir of [dirConfig, dirConfigCommands]) {
	try {
		validJSON(pathDir);
	}
	catch (err) {
		log.error("CONFIG", `Invalid JSON file "${pathDir.replace(__dirname, "")}":\n${err.message.split("\n").map(line => `  ${line}`).join("\n")}\nPlease fix it and restart bot`);
		process.exit(0);
	}
}
const config = require(dirConfig);
if (config.whiteListMode?.whiteListIds && Array.isArray(config.whiteListMode.whiteListIds))
	config.whiteListMode.whiteListIds = config.whiteListMode.whiteListIds.map(id => id.toString());
const configCommands = require(dirConfigCommands);

global.GoatBot = {
	startTime: Date.now() - process.uptime() * 1000,
	commands: new Map(),
	eventCommands: new Map(),
	commandFilesPath: [],
	eventCommandsFilesPath: [],
	aliases: new Map(),
	onFirstChat: [],
	onChat: [],
	onEvent: [],
	onReply: new Map(),
	onReaction: new Map(),
	onAnyEvent: [],
	config,
	configCommands,
	envCommands: {},
	envEvents: {},
	envGlobal: {},
	reLoginBot: function () { },
	Listening: null,
	oldListening: [],
	callbackListenTime: {},
	storage5Message: [],
	fcaApi: null,
	botID: null
};

global.db = {

	allThreadData: [],
	allUserData: [],
	allDashBoardData: [],
	allGlobalData: [],

	threadModel: null,
	userModel: null,
	dashboardModel: null,
	globalModel: null,

	threadsData: null,
	usersData: null,
	dashBoardData: null,
	globalData: null,

	receivedTheFirstMessage: {}

};

global.client = {
	dirConfig,
	dirConfigCommands,
	dirAccount,
	countDown: {},
	cache: {},
	database: {
		creatingThreadData: [],
		creatingUserData: [],
		creatingDashBoardData: [],
		creatingGlobalData: []
	},
	commandBanned: configCommands.commandBanned
};

const utils = require("./utils.js");
global.utils = utils;
const { colors } = utils;

global.temp = {
	createThreadData: [],
	createUserData: [],
	createThreadDataError: [],
	filesOfGoogleDrive: {
		arraybuffer: {},
		stream: {},
		fileNames: {}
	},
	contentScripts: {
		cmds: {},
		events: {}
	}
};

const watchAndReloadConfig = (dir, type, prop, logName) => {
	let lastModified = fs.statSync(dir).mtimeMs;
	let isFirstModified = true;

	fs.watch(dir, (eventType) => {
		if (eventType === type) {
			const oldConfig = global.GoatBot[prop];

			setTimeout(() => {
				try {

					if (isFirstModified) {
						isFirstModified = false;
						return;
					}

					if (lastModified === fs.statSync(dir).mtimeMs) {
						return;
					}
					global.GoatBot[prop] = JSON.parse(fs.readFileSync(dir, 'utf-8'));
					log.success(logName, `Reloaded ${dir.replace(process.cwd(), "")}`);
				}
				catch (err) {
					log.warn(logName, `Can't reload ${dir.replace(process.cwd(), "")}`);
					global.GoatBot[prop] = oldConfig;
				}
				finally {
					lastModified = fs.statSync(dir).mtimeMs;
				}
			}, 200);
		}
	});
};

watchAndReloadConfig(dirConfigCommands, 'change', 'configCommands', 'CONFIG COMMANDS');
watchAndReloadConfig(dirConfig, 'change', 'config', 'CONFIG');

global.GoatBot.envGlobal = global.GoatBot.configCommands.envGlobal;
global.GoatBot.envCommands = global.GoatBot.configCommands.envCommands;
global.GoatBot.envEvents = global.GoatBot.configCommands.envEvents;

const getText = global.utils.getText;

if (config.autoRestart) {
	const time = config.autoRestart.time;
	if (!isNaN(time) && time > 0) {
		utils.log.info("AUTO RESTART", getText("Goat", "autoRestart1", utils.convertTime(time, true)));
		setTimeout(() => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		}, time);
	}
	else if (typeof time == "string" && time.match(/^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/gmi)) {
		utils.log.info("AUTO RESTART", getText("Goat", "autoRestart2", time));
		const cron = require("node-cron");
		cron.schedule(time, () => {
			utils.log.info("AUTO RESTART", "Restarting...");
			process.exit(2);
		});
	}
}

(async () => {

	try {
		const { gmailAccount } = config.credentials;
		const { email, clientId, clientSecret, refreshToken } = gmailAccount;
		if (clientId && clientSecret && refreshToken) {
			const OAuth2 = google.auth.OAuth2;
			const OAuth2_client = new OAuth2(clientId, clientSecret);
			OAuth2_client.setCredentials({ refresh_token: refreshToken });
			let accessToken;
			try {
				accessToken = await OAuth2_client.getAccessToken();
			}
			catch (err) {
				throw new Error(getText("Goat", "googleApiTokenExpired"));
			}
			const transporter = nodemailer.createTransport({
				host: 'smtp.gmail.com',
				service: 'Gmail',
				auth: {
					type: 'OAuth2',
					user: email,
					clientId,
					clientSecret,
					refreshToken,
					accessToken
				}
			});

			async function sendMail({ to, subject, text, html, attachments }) {
				const transporter = nodemailer.createTransport({
					host: 'smtp.gmail.com',
					service: 'Gmail',
					auth: {
						type: 'OAuth2',
						user: email,
						clientId,
						clientSecret,
						refreshToken,
						accessToken
					}
				});
				const mailOptions = {
					from: email,
					to,
					subject,
					text,
					html,
					attachments
				};
				const info = await transporter.sendMail(mailOptions);
				return info;
			}

			global.utils.sendMail = sendMail;
			global.utils.transporter = transporter;
		}
		else {
			utils.log.warn("MAIL", "Gmail credentials not set in config.json — email-sending features are disabled. This does not affect normal bot operation.");
		}
	}
	catch (err) {
		utils.log.warn("MAIL", `Could not set up Gmail sending, email features will be unavailable: ${err.message}`);
	}

	try {
		const { data: { version } } = await axios.get("https://raw.githubusercontent.com/ntkhang03/Goat-Bot-V2/main/package.json");
		const currentVersion = require("./package.json").version;
		if (compareVersion(version, currentVersion) === 1)
			utils.log.master("NEW VERSION", getText(
				"Goat",
				"newVersionDetected",
				colors.gray(currentVersion),
				colors.hex("#eb6a07", version),
				colors.hex("#eb6a07", "node update")
			));
	}
	catch (err) {
		utils.log.warn("CHECK VERSION", `Could not check for a new version (skipping): ${err.message}`);
	}

	try {
		const parentIdGoogleDrive = await utils.drive.checkAndCreateParentFolder("SagorBot");
		utils.drive.parentID = parentIdGoogleDrive;
	}
	catch (err) {
		utils.log.warn("GOOGLE DRIVE", `Could not initialize the Google Drive folder, Drive features will be unavailable: ${err.message}`);
	}

	require(`./bot/login/login.js`);
})();

function compareVersion(version1, version2) {
	const v1 = version1.split(".");
	const v2 = version2.split(".");
	for (let i = 0; i < 3; i++) {
		if (parseInt(v1[i]) > parseInt(v2[i]))
			return 1;
		if (parseInt(v1[i]) < parseInt(v2[i]))
			return -1;
	}
	return 0;
}

if (config.dashBoard && config.dashBoard.enable) {
	if (!config.dashBoard.token || typeof config.dashBoard.token !== "string" || config.dashBoard.token.length < 16) {
		log.warn("DASHBOARD", "config.dashBoard.enable is true but config.dashBoard.token is missing or too short (min 16 chars). The dashboard will NOT start until you set a strong random token in config.json.");
	}
	else {
		const express = require("express");
		const rateLimit = require("express-rate-limit");
		const app = express();
		app.use(express.json({ limit: "256kb" }));

		const host = config.dashBoard.host || "127.0.0.1";
		const port = config.dashBoard.port || (Math.floor(Math.random() * 50000) + 10000);
		const dashboardToken = config.dashBoard.token;

		function timingSafeTokenMatch(a, b) {
			const bufA = Buffer.from(String(a || ""));
			const bufB = Buffer.from(String(b || ""));
			if (bufA.length !== bufB.length) return false;
			try {
				return crypto.timingSafeEqual(bufA, bufB);
			}
			catch {
				return false;
			}
		}

		function requireToken(req, res, next) {
			const provided = req.get("x-dashboard-token") || req.query.token;
			if (!provided || !timingSafeTokenMatch(provided, dashboardToken)) {
				return res.status(401).json({ error: "Unauthorized: missing or invalid dashboard token" });
			}
			next();
		}

		const apiLimiter = rateLimit({
			windowMs: 60 * 1000,
			max: 20,
			standardHeaders: true,
			legacyHeaders: false
		});

		app.get('/', requireToken, (req, res) => {
			res.sendFile(__dirname + '/public/index.html');
		});

		app.get('/appstate', requireToken, (req, res) => {
			res.sendFile(__dirname + '/public/appstate.html');
		});

		app.get("/api/stats", requireToken, apiLimiter, (req, res) => {
			const os = require('os');
			const uptime = process.uptime();
			const hours = Math.floor(uptime / 3600);
			const minutes = Math.floor((uptime % 3600) / 60);

			res.json({
				cpu: (os.loadavg()[0] * 100 / os.cpus().length).toFixed(2),
				memoryUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
				memoryTotal: Math.round(os.totalmem() / 1024 / 1024),
				freeMem: Math.round(os.freemem() / 1024 / 1024),
				uptime: `${hours}h ${minutes}m`,
				platform: os.platform(),
				nodeVersion: process.version,
				arch: os.arch(),
				cpuCores: os.cpus().length
			});
		});

		app.post("/api/restart", requireToken, apiLimiter, (req, res) => {
			res.json({ message: "Bot is restarting..." });
			setTimeout(() => {
				process.exit(2);
			}, 1000);
		});

		app.post("/api/appstate", requireToken, apiLimiter, (req, res) => {
			const { appstate } = req.body;
			if (!appstate) {
				return res.status(400).json({ error: "Appstate is required" });
			}

			let parsed;
			try {
				parsed = typeof appstate === "string" ? JSON.parse(appstate) : appstate;
			}
			catch {
				return res.status(400).json({ error: "Appstate must be valid JSON" });
			}
			if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(item => item && typeof item === "object" && "key" in item && "value" in item)) {
				return res.status(400).json({ error: "Appstate must be a JSON array of cookie objects with key/value fields" });
			}

			const content = JSON.stringify(parsed, null, 2);
			require('fs').writeFile('account.txt', content, (err) => {
				if (err) {
					console.error("Error saving appstate:", err);
					return res.status(500).json({ error: "Failed to save appstate" });
				}

				res.json({ success: true });

				log.info("DASHBOARD", "Restarting system after appstate update...");
				setTimeout(() => {
					process.exit(2);
				}, 1000);
			});
		});

		app.listen(port, host, () => {
			log.info("DASHBOARD", `Local dashboard listening on http://${host}:${port} (token required)`);
			if (host !== "127.0.0.1" && host !== "localhost") {
				log.warn("DASHBOARD", `Dashboard is bound to "${host}", which may be reachable from outside this machine. Only do this if you understand the risk, and keep the token secret.`);
			}
		});
	}
}
