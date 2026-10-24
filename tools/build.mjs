// Dựng trang GitHub Pages vào thư mục _site/ từ:
//   src/Index.html  (y hệt file Index.html dán vào Apps Script — một nguồn duy nhất cho cả hai nơi)
//   config.js       (danh sách quán + link /exec)
//   web/            (trang chọn quán, manifest, service worker, icon)
// Chạy: node tools/build.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(root, "_site");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "icons"), { recursive: true });

const app = fs.readFileSync(path.join(root, "src/Index.html"), "utf8");
const cfg = fs.readFileSync(path.join(root, "config.js"), "utf8");
const build = crypto.createHash("sha1").update(app).update(cfg).digest("hex").slice(0, 10);
const ver = (app.match(/APP_VERSION\s*=\s*"([^"]+)"/) || [])[1] || "?";

if (!app.includes("<!--SBW_GH_HEAD-->")) throw new Error("src/Index.html thiếu chỗ đánh dấu <!--SBW_GH_HEAD--> (cần bản từ 2026.10.24.4 trở lên).");
if (!/window\.SBW_STORES\s*=/.test(cfg)) throw new Error("config.js phải khai báo window.SBW_STORES = [...]");
const head = [
  `<script src="config.js?v=${build}"></script>`,
  `<link rel="manifest" href="manifest.webmanifest">`,
  `<link rel="icon" href="icons/icon-32.png">`,
  `<link rel="apple-touch-icon" href="icons/icon-180.png">`,
  `<meta name="apple-mobile-web-app-capable" content="yes">`,
  `<meta name="mobile-web-app-capable" content="yes">`,
  `<meta name="apple-mobile-web-app-title" content="シフト">`,
  `<meta name="apple-mobile-web-app-status-bar-style" content="default">`
].join("\n");
fs.writeFileSync(path.join(out, "app.html"), app.replace("<!--SBW_GH_HEAD-->", head).replace("<!--SBW_WHO-->", ""));
fs.writeFileSync(path.join(out, "config.js"), cfg);
for (const f of ["index.html", "manifest.webmanifest", "sw.js"]) {
  fs.writeFileSync(path.join(out, f), fs.readFileSync(path.join(root, "web", f), "utf8").split("%%BUILD%%").join(build));
}
for (const f of fs.readdirSync(path.join(root, "web/icons"))) fs.copyFileSync(path.join(root, "web/icons", f), path.join(out, "icons", f));
fs.writeFileSync(path.join(out, ".nojekyll"), "");
fs.writeFileSync(path.join(out, "version.json"), JSON.stringify({ app: ver, build, at: new Date().toISOString() }) + "\n");
console.log(`_site dựng xong · app ${ver} · build ${build}`);
