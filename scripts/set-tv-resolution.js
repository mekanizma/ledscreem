const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { pgSsl } = require("./pg-ssl");

for (const line of fs
  .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
  .split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) process.env[t.slice(0, i).trim()] ||= t.slice(i + 1).trim();
}

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: pgSsl(process.env.DATABASE_URL),
  });
  await c.connect();
  await c.query(`
    alter table public.displays
      alter column width set default 1920,
      alter column height set default 1080,
      alter column orientation set default 'landscape'
  `);
  const r = await c.query(`
    update public.displays
    set
      width = 1920,
      height = 1080,
      orientation = 'landscape',
      updated_at = now()
    returning display_code, name, width, height, orientation
  `);
  console.log(JSON.stringify(r.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
