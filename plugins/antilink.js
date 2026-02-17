export let anti = false;

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  anti = !anti;
  await sock.sendMessage(chat, {
    text: `🚫 Anti-Link: *${anti ? "ON" : "OFF"}*`
  });
};
