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

// FFmpeg Setup
fluentFfmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const sessions = new Map();
const commands = new Map();
const SESSION_BASE_PATH = './sessions/';

// --- 🔌 Plugin Loader ---
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

// --- 🤖 Start Bot Session ---
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
        // പെയറിംഗ് കോഡ് തെറ്റാകാതിരിക്കാൻ ഈ ബ്രൗസർ സെറ്റിംഗ്സ് സഹായിക്കും
        browser: ["Ubuntu", "Chrome", "20.0.04"]
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

    // Message Logic
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        const prefix = "."; 
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const command = commands.get(cmdName);

        if (command) {
            try {
                await command.execute(sock, m, args);
            } catch (err) {
                console.error(err);
            }
        }
    });

    sessions.set(sessionId, sock);
    return sock;
}

// --- 🌐 API Routes ---

app.get("/pair", async (req, res) => {
    let { number } = req.query;
    if (!number) return res.json({ error: "Number missing" });
    
    // പഴയ സെഷൻ ഉണ്ടെങ്കിൽ അത് ക്ലിയർ ചെയ്യുന്നത് പെയറിംഗ് എറർ കുറയ്ക്കും
    const sessionId = "session_" + number.replace(/\D/g, "");
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);
    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    try {
        let sock = await startBot(sessionId);
        
        // പെയറിംഗ് കോഡ് ജനറേറ്റ് ചെയ്യുന്നതിന് മുൻപ് സെർവർ സ്റ്റേബിൾ ആകാൻ 10 സെക്കൻഡ് നൽകുന്നു
        await new Promise(r => setTimeout(r, 10000));
        
        const code = await sock.requestPairingCode(number.replace(/\D/g, ""));
        res.json({ sessionId, code });
    } catch (err) {
        console.error("Pairing Error:", err);
        res.json({ error: "വാട്സാപ്പ് സെർവർ തിരക്കിലാണ്. അല്പസമയത്തിന് ശേഷം വീണ്ടും ശ്രമിക്കൂ." });
    }
});

app.get("/get-session", (req, res) => {
    const { sessionId } = req.query;
    const credsPath = path.join(SESSION_BASE_PATH, sessionId, 'creds.json');
    
    try {
        if (fs.existsSync(credsPath)) {
            const content = fs.readFileSync(credsPath, 'utf-8');
            const json = JSON.parse(content);
            if (json.creds && json.creds.me) {
                const base64 = Buffer.from(content).toString('base64');
                return res.json({ success: true, session: base64 });
            }
        }
    } catch (e) {}
    res.json({ success: false });
});

loadPlugins().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log("🌍 Server Ready on Render"));
});
