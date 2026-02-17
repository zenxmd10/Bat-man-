export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  const group = await sock.groupMetadata(chat);

  let members = group.participants.map(m => m.id);
  let teks = "📢 *Group Tagall*:\n\n";

  members.forEach(m => {
    teks += `@${m.split("@")[0]}\n`;
  });

  await sock.sendMessage(chat, {
    text: teks,
    mentions: members
  });
};
