const fs = require("fs");
const path = require("path");
const root = __dirname;
const folders = ["products", "collections", "journal", "pages"];
const manifest = {};
for (const name of folders) {
  const dir = path.join(root, `_${name}`);
  manifest[name] = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".json")).sort()
    : [];
}
fs.writeFileSync(path.join(root, "her-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("Harf-e-Raast manifest generated:", manifest);
