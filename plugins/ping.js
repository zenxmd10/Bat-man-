export default {
    name: 'ping',
    category: 'main',
    description: 'Check bot response speed',
    async execute(sock, m, args) {
        const start = Date.now();
        
        // ആദ്യം ഒരു മെസ്സേജ് അയക്കുന്നു
        const { key } = await sock.sendMessage(m.key.remoteJid, { text: 'Testing Ping...' }, { quoted: m });
        
        const end = Date.now();
        const responseTime = end - start;

        // പഴയ മെസ്സേജ് എഡിറ്റ് ചെയ്ത് ലേറ്റൻസി (Speed) കാണിക്കുന്നു
        await sock.sendMessage(m.key.remoteJid, { 
            text: `*🏓 Pong!* \n\n*Response Speed:* ${responseTime}ms`,
            edit: key 
        });
    }
};
