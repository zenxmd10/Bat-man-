export let welcome = true;

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  welcome = !welcome;
  await sock.sendMessage(chat, {
    text: `👋 Welcome Message: *${welcome ? "ON" : "OFF"}*`
  });
};
