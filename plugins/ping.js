export default async (sock, msg) => {
    const start = Date.now();
    await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pinging..." });
    const end = Date.now();
    
    await sock.sendMessage(msg.key.remoteJid, { 
        // ❌ Note: Changed 'Ping!' to 'Pong!' for better user experience
        text: `📡 Ping! ${end - start} ms` 
    });
};
