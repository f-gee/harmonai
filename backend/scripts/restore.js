// Usage: node scripts/restore.js <backup-file.json> [--merge]
const fs = require("fs");
const { importData } = require("../db");

const filePath = process.argv[2];
const mode = process.argv.includes("--merge") ? "merge" : "replace";

if (!filePath) {
  console.error("Usage: node scripts/restore.js <backup-file.json> [--merge]");
  process.exit(1);
}

const raw = fs.readFileSync(filePath, "utf-8");
const backup = JSON.parse(raw);
const result = importData(backup, mode);

console.log(`Restored ${result.imported} song(s) using mode "${result.mode}"`);
