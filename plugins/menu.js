Import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Root-il ulla config.js file import cheyyunnu
import config from "../config.js"; 

// File path and directory settings for dynamic reading
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (sock, msg) => {
    
    // 1. Plugins folder-il ulla files dynamic aayi read cheyyunnu
    const files = fs.readdirSync(__dirname)
                    .filter(f => f.endsWith('.js') && f !== 'menu.js'); // menu.js avoid cheyyan
    
    // File names (.js ഒഴിവാക്കി) command list aakkunnu
    const commandList = files.map(file => `* .${file.replace('.js', '')}`).join('\n');
    
    // 2. Modern Border Design
    const menuText = `
╔════ 🦇 BOT-MENU 🦇 ══════╗
║                                    
║ 👑 Owner: *${config.ownerName || 'Owner'}*
║ 📞 Contact: wa.me/${config.ownerNumber || 'XXXXXXXXXX'}
║ 🌐 Prefix: ${config.prefix || '.'}
║                                    
╠════ ⚡ COMMANDS ⚡ ═════╣
║                                    
${commandList.split('\n').map(line => `║ ${line}`).join('\n')}
║                                    
╚═══════════════════╝
`;

    // 3. Image and Message Send
    try {
        await sock.sendMessage(msg.key.remoteJid, { 
            image: fs.readFileSync("./media/batman.jpg"), // Assuming you keep batman.jpg in the main folder
            caption: menuText
        });
    } catch {
        // If image loading fails, send only text
        await sock.sendMessage(msg.key.remoteJid, { text: menuText });
    }
};
