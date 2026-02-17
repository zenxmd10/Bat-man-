import fs from "fs";

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;
  await sock.sendMessage(chat, {
    sticker: fs.readFileSync("./media/tag.webp")
  });
};
