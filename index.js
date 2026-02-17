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

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const sessions = new Map();
const commands = new Map(); 
const SESSION_BASE_PATH = './sessions/';
const PREFIX = '.'; 

// --- 🔌 Plugin Loader ---
async function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginFolder)) fs.mkdirSync(pluginFolder);

    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));
    for (const file of files) {
        try {
            const filePath = pathToFileURL(path.join(pluginFolder, file)).href;
            const { default: command } = await import(filePath);
            if (command && command.name) {
                commands.set(command.name, command);
                console.log(`✅ Loaded: ${command.name}`);
            }
        } catch (e) {
            console.error(`❌ Error loading ${file}:`, e);
        }
    }
}

// --- 🤖 Start Bot Session ---
async function startBot(sessionId) {
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    sock.ev.on("creds.update", saveCreds);

    // Message Handler
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== 'notify') return;
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
        if (!body.startsWith(PREFIX)) return;

        const args = body.slice(PREFIX.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        const command = commands.get(cmdName);
        if (command) {
            try {
                await command.execute(sock, m, args);
            } catch (err) {
                console.error(`Error in ${cmdName}:`, err);
            }
        }
    });

    // Connection Handler
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(sessionId);
        }
        if (connection === "open") {
            console.log(`🚀 [${sessionId}] Connected!`);
            
            // Render-ൽ സെഷൻ കിട്ടാൻ: വാട്സാപ്പിലേക്ക് സെഷൻ ഡാറ്റ അയക്കുന്നു
            const credsPath = path.join(SESSION_BASE_PATH, sessionId, 'creds.json');
            if (fs.existsSync(credsPath)) {
                const sessionData = fs.readFileSync(credsPath);
                const sessionString = sessionData.toString('base64'); // Base64 String format
                
                await sock.sendMessage(sock.user.id, { 
                    text: `*✅ BOT CONNECTED SUCCESSFULLY*\n\n*Session ID:* ${sessionId}\n\n*Your Session String (Base64):*\n\n${sessionString}\n\n_Keep this safe to use your bot anywhere!_`
                });
            }
        }
    });

    sessions.set(sessionId, sock);
    return sock;
}

// --- 🌐 API Endpoint ---
app.get("/pair", async (req, res) => {
    let { number } = req.query;
    if (!number) return res.json({ error: "Number required" });

    const sessionId = "session_" + number.replace(/\D/g, "");

    try {
        let sock = sessions.get(sessionId);
        if (!sock) sock = await startBot(sessionId);

        await new Promise(r => setTimeout(r, 8000)); 

        const pairingCode = await sock.requestPairingCode(number.replace(/\D/g, ""));
        res.json({ sessionId, code: pairingCode });
    } catch (err) {
        res.json({ error: err.message });
    }
});

loadPlugins().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log("🌍 Server running"));
});
