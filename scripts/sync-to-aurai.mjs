import { createHash } from "node:crypto";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const aurai = resolve(process.argv[2]);
const html = await readFile(resolve(root, "dist/index.html"));
const catalogPath = resolve(aurai, "assets/miniapps/catalog.json");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const entry = {
  id: "builtin.random-menu",
  title: "随机菜单",
  description: "绿色主题的饮食小助手。支持菜谱录入、标签筛选、随机挑选、收藏和本次菜单管理；餐厅与 AI 配菜单尚未开放。",
  publisherId: "user:local",
  asset: "assets/miniapps/random-menu.html",
  iconAsset: "assets/miniapps/icons/random-menu.png",
  version: createHash("sha256").update(html).digest("hex"),
};

await writeFile(resolve(aurai, entry.asset), html);
await copyFile(resolve(root, "src/assets/logo.png"), resolve(aurai, entry.iconAsset));
await writeFile(
  catalogPath,
  JSON.stringify([entry, ...catalog.filter((item) => item.id !== entry.id)], null, 2) + "\n",
);
console.log(`已同步随机菜单到 ${aurai} (${html.length.toLocaleString()} bytes)`);
