// Usage: node scripts/backup.js [output-file.json]
const fs = require("fs");
const path = require("path");
const { exportData } = require("../db");

const outPath = process.argv[2] || path.join(__dirname, "..", `harmonai-backup-${Date.now()}.json`);
const data = exportData();

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Backed up ${data.songs.length} song(s) to ${outPath}`);
