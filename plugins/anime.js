import axios from "axios";
import fs from "fs";

export default async (sock, msg) => {
  const chat = msg.key.remoteJid;

  if (!msg.message.imageMessage)
    return sock.sendMessage(chat, {
      text: "📸 Send an image & type: .anime"
    });

  // Download original image
  const buffer = await sock.downloadMediaMessage(msg);

  await sock.sendMessage(chat, { text: "🎨 Converting to Anime... Wait 🔄" });

  // Upload and convert using external anime API
  try {
    const api = "https://api.itsrose.rest/image/toanime";
    const filePath = "./media/anime_input.jpg";
    fs.writeFileSync(filePath, buffer);

    const form = new FormData();
    form.append("image", fs.createReadStream(filePath));

    const res = await axios.post(api, form, {
      headers: form.getHeaders()
    });

    const animeImg = res.data.result.url;

    await sock.sendMessage(chat, {
      sticker: { url: animeImg }
    });

    fs.unlinkSync(filePath);
  } catch (e) {
    await sock.sendMessage(chat, {
      text: "⚠️ Failed anime convert! Try again later!"
    });
    console.log(e);
  }
};
