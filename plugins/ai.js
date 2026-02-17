export default async (sock, msg, query) => {
  const chat = msg.key.remoteJid;
  if (!query) return sock.sendMessage(chat, { text: "Usage: .ai hi" });

  const reply = `🤖 AI: ${query} `;
  await sock.sendMessage(chat, { text: reply });
};
