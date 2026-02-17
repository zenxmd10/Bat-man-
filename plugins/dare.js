const d = [
  "Send a voice saying I love Bot ❤️",
  "Say hi to 3 strangers 🤣",
  "Send your last pic 📸"
];

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  const x = d[Math.floor(Math.random() * d.length)];
  sock.sendMessage(chat, { text: `😈 Dare:\n${x}` });
};
