import fs from "fs";

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;

  if (!msg.message.imageMessage)
    return sock.sendMessage(chat, { text: "Send image & use: .sticker" });

  const stream = await sock.downloadMediaMessage(msg);
  await sock.sendMessage(chat, {
    sticker: stream
  });
};
