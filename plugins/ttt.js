let games = {};

export default async (sock, msg, query, sender) => {
  const chat = msg.key.remoteJid;
  const opponent = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  if (!opponent) return sock.sendMessage(chat, { text: "Tag opponent: .ttt @user" });

  if (games[chat]) return sock.sendMessage(chat, { text: "Game already running!" });

  games[chat] = {
    board: ["1","2","3","4","5","6","7","8","9"],
    current: sender,
    opponent
  };

  await sock.sendMessage(chat, {
    text: `🎮 *Tic Tac Toe Started!*\n\n${printBoard(chat)}\n\nTurn: @${
      sender.split("@")[0]
    }`,
    mentions: [sender]
  });
};

export function printBoard(chat) {
  const b = games[chat].board;
  return `${b[0]}|${b[1]}|${b[2]}\n-+-+-\n${b[3]}|${b[4]}|${b[5]}\n-+-+-\n${b[6]}|${b[7]}|${b[8]}`;
}
