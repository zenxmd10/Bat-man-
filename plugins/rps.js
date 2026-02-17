const choices = ["rock", "paper", "scissor"];

export default async (sock, msg, query) => {
  const chat = msg.key.remoteJid;
  if (!choices.includes(query)) return sock.sendMessage(chat, {
    text: "Use: .rps rock/paper/scissor"
  });

  const bot = choices[Math.floor(Math.random() * 3)];

  let result = "Draw!";
  if (
    (query === "rock" && bot === "scissor") ||
    (query === "paper" && bot === "rock") ||
    (query === "scissor" && bot === "paper")
  ) result = "You Win! 😎";
  else if (query !== bot) result = "I Win! 🤖";

  await sock.sendMessage(chat, { text: `🙋 You: ${query}\n🤖 Bot: ${bot}\n🎯 ${result}` });
};
