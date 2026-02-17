import {
    default as makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    DisconnectReason
    // WAMessage ഒഴിവാക്കി
} from "@whiskeysockets/baileys";
import P from "pino";
import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
// import { WAMessageContent } from "@whiskeysockets/baileys/lib/Types/Message"; <-- ഈ ലൈൻ പൂർണ്ണമായി ഒഴിവാക്കി

// --- Setup ---
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map to hold active bot sessions: { sessionId: sockObject }
const sessions = new Map();
const SESSION_BASE_PATH = './sessions/'; // Base folder for all sessions

// --- Core Logic ---

/**
 * Starts or restarts the bot connection for a specific session ID.
 * @param {string} sessionId - The unique identifier for the user's session (e.g., 'user_1', 'john').
 */
async function startBot(sessionId) {
    const sessionPath = path.join(SESSION_BASE_PATH, sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        browser: ["Chrome", "Desktop", "10.0"],
        syncFullHistory: false
    });

    sock.sessionId = sessionId; // Store the session ID in the sock object

    sock.ev.on("creds.update", saveCreds);

    // Connection updates and automatic session deletion on logout
    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
   
        if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;

            // LOGOUT DETECT (Code 401)
            if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                console.log(`❌ Session [${sessionId}] Logged out. Deleting session folder...`);

                // AUTOMATIC SESSION DELETE LOGIC
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    sessions.delete(sessionId); // Remove from active sessions map
                    console.log(`✅ Session [${sessionId}] deleted. New pairing required.`);
                } catch (e) {
                    console.error(`⚠️ Error deleting session [${sessionId}]:`, e.message);
                }

                console.log(`🔁 Session [${sessionId}] finished.`);
                return; 
            }
            
            // OTHER ERRORS = NORMAL RECONNECT
            console.log(`⚠️ Session [${sessionId}] closed. Reconnecting...`);
            // Wait before restarting to prevent connection floods
            setTimeout(() => startBot(sessionId), 10000); 
            return;
        }

        // CONNECTED SUCCESSFULLY
        if (connection === "open") {
            console.log(`🔥 Session [${sessionId}] Connected Successfully!`);
        }
    });

    // Message handler (Simplified for multi-session support)
    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;
        
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
        const prefix = ".";

        if (!text.startsWith(prefix)) return;
        
        // Simple command response (Example)
        if (text.startsWith('.ping')) {
            await sock.sendMessage(from, { text: `Pong! I am session: ${sessionId}` });
        }
    });
    
    // Add the new session to the map
    sessions.set(sessionId, sock);
    return sock;
}

// --- EXPRESS SERVER ---

// Load existing sessions on startup
async function loadExistingSessions() {
    if (!fs.existsSync(SESSION_BASE_PATH)) {
        fs.mkdirSync(SESSION_BASE_PATH, { recursive: true });
    }
    const sessionFolders = fs.readdirSync(SESSION_BASE_PATH, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    console.log(`✨ Found ${sessionFolders.length} existing sessions. Starting them...`);
    for (const sessionId of sessionFolders) {
        await startBot(sessionId);
    }
}

// Website UI
app.get("/", (req, res) => {
    // List all active sessions on the main page
    const sessionList = Array.from(sessions.keys()).map(id => `<li>${id}: ${sessions.get(id).connection}</li>`).join('');
    res.send(`
        <h1>Bat-Man Multi-Session Bot</h1>
        <p>Use /pair?sessionId=USERID&number=91XXXXXXXXXX to connect a new user.</p>
        <h2>Active Sessions (${sessions.size}):</h2>
        <ul>${sessionList}</ul>
    `);
});

// Pair Code API
app.get("/pair", async (req, res) => {
    try {
        const { sessionId, number } = req.query;
        if (!sessionId || !number) {
            return res.json({ error: "Required parameters: sessionId and number." });
        }

        let sockInstance = sessions.get(sessionId);
        
        // If session exists and is connected, prevent new pairing
        if (sockInstance && sockInstance.connection === 'open') {
             return res.json({ error: `Session [${sessionId}] is already OPEN and connected.` });
        }
        
        // Start a new bot instance if it's the first time or if the previous session logged out/closed
        if (!sockInstance || sockInstance.connection === 'close') {
            sockInstance = await startBot(sessionId);
            console.log(`Starting new session for ${sessionId}...`);
        }
        
        // FINAL CHECK before requesting code
        if (sockInstance.connection !== "open" && sockInstance.connection !== "connecting") {
             return res.json({
                error: `Bot is not ready for pairing (Status: ${sockInstance.connection}). Please wait and try again.`
            });
        }
        
        // WhatsApp requires a delay before pairing (9000ms helps prevent dummy codes)
        await new Promise((r) => setTimeout(r, 9000));

        const clean = number.replace(/\D/g, "");
        const phone = clean.startsWith("91") ? clean : "91" + clean;

        let code = await sockInstance.requestPairingCode(phone);

        // Fix: convert array to string
        if (Array.isArray(code)) code = code.join("");

        res.json({ sessionId, code, status: "Use this code in WhatsApp's Linked Devices -> Link with phone number." });
    } catch (err) {
        console.error("Pair Error:", err);
        res.json({ error: `Failed to request pairing code: ${err.message}` });
    }
});

// --- Start Bot + Server ---
app.listen(process.env.PORT || 3000, async () => {
    console.log("🌍 Pairing Server running at Port " + (process.env.PORT || 3000));
    await loadExistingSessions();
});
