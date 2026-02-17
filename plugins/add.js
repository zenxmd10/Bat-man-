export default async (sock, msg, number) => {
  const chat = msg.key.remoteJid;
  if (!number) return sock.sendMessage(chat, { text: "Example: .add 917xxxxxxx" });

  await sock.groupParticipantsUpdate(chat, [`${number}@s.whatsapp.net`], "add");
  await sock.sendMessage(chat, { text: "➕ Added" });
};
