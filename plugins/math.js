export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  const a = Math.floor(Math.random() * 20);
  const b = Math.floor(Math.random() * 20);
  const ans = a + b;

  await sock.sendMessage(chat, { text: `🧠 Solve:\n${a} + ${b} = ? (Reply answer)` });

  global.mathQuiz = { chat, ans, user: msg.key.participant };
};
