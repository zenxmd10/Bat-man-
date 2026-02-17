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
        const { connection } = update;
        if (connection === "open") {
            console.log(`✅ ${sessionId} Connected!`);
        }
        if (connection === "close") {
            setTimeout(() => startBot(sessionId), 5000);
        }
    });

    sessions.set(sessionId, sock);
    return sock;
}

// പെയറിംഗ് കോഡിന് വേണ്ടിയുള്ള API
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

// സെഷൻ സ്ട്രിംഗ് പേജിൽ കാണിക്കാൻ വേണ്ടിയുള്ള API
app.get("/get-session", async (req, res) => {
    const { sessionId } = req.query;
    const credsPath = path.join(SESSION_BASE_PATH, sessionId, 'creds.json');
    
    if (fs.existsSync(credsPath)) {
        const data = fs.readFileSync(credsPath);
        // ഇവിടെ നമ്മൾ സെഷൻ ഫയലിനെ ഒരു സ്ട്രിംഗ് ആക്കി മാറ്റുന്നു
        res.json({ success: true, session: data.toString('base64') });
    } else {
        res.json({ success: false });
    }
});

app.listen(process.env.PORT || 3000, () => console.log("🌍 Server Online"));
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
