const q = [
  "What is your biggest secret?",
  "Who do you love most? 😏",
  "Have you lied to your best friend?"
];

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  const t = q[Math.floor(Math.random() * q.length)];
  sock.sendMessage(chat, { text: `🤔 Truth:\n${t}` });
};
