import {
    default as makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath, pathToFileURL } from "url";
import ffmpegPath from 'ffmpeg-static';
import fluentFfmpeg from 'fluent-ffmpeg';

// FFmpeg സെറ്റപ്പ്
fluentFfmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const sessions = new Map();
const commands = new Map();
const SESSION_BASE_PATH = './sessions/';

// --- 🔌 പ്ലഗിൻ ലോഡർ ---
async function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder, { recursive: true });

    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const filePath = pathToFileURL(path.join(pluginFolder, file)).href;
            const { default: command } = await import(filePath);
            if (command && command.name) {
                commands.set(command.name, command);
                console.log(`✅ Loaded Plugin: ${command.name}`);
            }
        } catch (e) {
            console.error(`❌ Error in ${file}:`, e.message);
        }
    }
}

// --- 🤖 ബോട്ട് സ്റ്റാർട്ട് ലോജിക് ---
async function startBot(sessionId) {
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Batman-Bot", "Chrome", "20.0.04"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(`🚀 [${sessionId}] Connected Successfully!`);
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(sessionId);
        }
    });

    // കമാൻഡ് ഹാൻഡ്ലർ
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";
        const prefix = "."; // നിനക്ക് ഇഷ്ടമുള്ള പ്രിഫിക്സ് മാറ്റാം

        if (body.startsWith(prefix)) {
            const args = body.slice(prefix.length).trim().split(/ +/);
            const cmdName = args.shift().toLowerCase();
            const command = commands.get(cmdName);

            if (command) {
                try {
                    await command.execute(sock, m, args);
                } catch (err) {
                    console.error(`Error in ${cmdName}:`, err);
                    await sock.sendMessage(m.key.remoteJid, { text: `❌ Error: ${err.message}` });
                }
            }
        }
    });

    sessions.set(sessionId, sock);
    return sock;
}

// --- 🌐 വെബ് API റൂട്ടുകൾ ---

// പെയറിംഗ് കോഡ് എടുക്കാൻ
app.get("/pair", async (req, res) => {
    let { number } = req.query;
    if (!number) return res.json({ error: "Phone number is required" });
    
    const sessionId = "session_" + number.replace(/\D/g, "");
    try {
        let sock = sessions.get(sessionId) || await startBot(sessionId);
        await new Promise(r => setTimeout(r, 6000));
        const code = await sock.requestPairingCode(number.replace(/\D/g, ""));
        res.json({ sessionId, code });
    } catch (err) {
        res.json({ error: err.message });
    }
});

// ലോഗിൻ ആയ ശേഷം സെഷൻ ഐഡി പേജിൽ കാണിക്കാൻ
app.get("/get-session", (req, res) => {
    const { sessionId } = req.query;
    const credsPath = path.join(SESSION_BASE_PATH, sessionId, 'creds.json');
    
    try {
        if (fs.existsSync(credsPath)) {
            const content = fs.readFileSync(credsPath, 'utf-8');
            const json = JSON.parse(content);
            
            // ലോഗിൻ പൂർത്തിയായെങ്കിൽ മാത്രമേ 'me' ഉണ്ടാകൂ
            if (json.creds && json.creds.me) {
                const base64 = Buffer.from(content).toString('base64');
                return res.json({ success: true, session: base64 });
            }
        }
    } catch (e) {}
    res.json({ success: false });
});

// സെർവർ സ്റ്റാർട്ട്
loadPlugins().then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌍 Batman-Bot Server on port ${PORT}`));
});
