export default async (sock, msg) => {
  const chat = msg.key.remoteJid;

  const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!mentioned) return sock.sendMessage(chat, { text: "Tag someone!" });

  await sock.groupParticipantsUpdate(chat, mentioned, "remove");
  await sock.sendMessage(chat, { text: "👢 Kicked!" });
};
