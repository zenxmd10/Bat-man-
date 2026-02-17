import axios from "axios";

export default async (sock, msg, url) => {
  const chat = msg.key.remoteJid;
  if (!url) return sock.sendMessage(chat, { text: "Usage: .video <url>" });

  try {
    await sock.sendMessage(chat, {
      video: { url },
      caption: "🎬 Video Downloaded"
    });
  } catch {
    sock.sendMessage(chat, { text: "Invalid URL 😢" });
  }
};
