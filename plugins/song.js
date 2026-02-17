import yts from "yt-search";
import axios from "axios";
import { exec } from "child_process";
import fs from "fs";

export default async (sock, msg, query) => {
  const chat = msg.key.remoteJid;
  if (!query) return sock.sendMessage(chat, { text: "Usage: .song shape of you" });

  const search = await yts(query);
  const video = search.videos[0];
  if (!video) return sock.sendMessage(chat, { text: "Song Not Found 😢" });

  await sock.sendMessage(chat, { text: `🎧 Downloading: *${video.title}*` });

  exec(`yt-dlp -x --audio-format mp3 "${video.url}" -o audio.mp3`, async () => {
    const mp3 = fs.readFileSync("audio.mp3");
    await sock.sendMessage(chat, { audio: mp3, mimetype: "audio/mpeg" });
    fs.unlinkSync("audio.mp3");
  });
};
