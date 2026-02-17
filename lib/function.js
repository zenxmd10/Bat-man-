import fs from "fs";
import path from "path";

export function loadPlugins(sock) {
  const pluginDir = "./plugins";
  const files = fs.readdirSync(pluginDir);

  for (let file of files) {
    if (file.endsWith(".js")) {
      import(path.resolve(pluginDir, file)).then((plugin) => {
        console.log("📌 Loaded Plugin:", file);
      });
    }
  }
}

export async function handleCommand(sock, msg, from, type, sender) {
  try {
    const text = msg.message.conversation || "";
    const prefix = ".";
    if (!text.startsWith(prefix)) return;

    const cmd = text.slice(1).split(" ")[0].toLowerCase();
    const query = text.replace(prefix + cmd, "").trim();
    const filePath = `./plugins/${cmd}.js`;

    if (fs.existsSync(filePath)) {
      const plugin = await import(path.resolve(filePath));
      await plugin.default(sock, msg, query);
    }
  } catch (e) {
    console.log("⚠️ Plugin Error:", e);
  }
}
