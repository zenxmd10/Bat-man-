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
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));

const sessions = new Map();
const SESSION_BASE_PATH = './sessions/';

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
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
            console.log(`✅ [${sessionId}] Connected!`);
        }
        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot(sessionId);
        }
    });

    sessions.set(sessionId, sock);
    return sock;
}

app.get("/pair", async (req, res) => {
    let { number } = req.query;
    if (!number) return res.json({ error: "Number required" });
    
    const sessionId = "session_" + number.replace(/\D/g, "");
    try {
        let sock = sessions.get(sessionId) || await startBot(sessionId);
        await new Promise(r => setTimeout(r, 8000));
        const code = await sock.requestPairingCode(number.replace(/\D/g, ""));
        res.json({ sessionId, code });
    } catch (err) {
        res.json({ error: err.message });
    }
});

app.get("/get-session", (req, res) => {
    const { sessionId } = req.query;
    const credsPath = path.join(SESSION_BASE_PATH, sessionId, 'creds.json');
    
    if (fs.existsSync(credsPath)) {
        const data = fs.readFileSync(credsPath);
        res.json({ success: true, session: data.toString('base64') });
    } else {
        res.json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌍 Server Active on Port ${PORT}`));
