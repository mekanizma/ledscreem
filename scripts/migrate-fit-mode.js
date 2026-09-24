const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { pgSsl } = require("./pg-ssl");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: pgSsl(process.env.DATABASE_URL),
  });
  await client.connect();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "006_fit_mode_stretch.sql"),
    "utf8",
  );
  await client.query(sql);
  const r = await client.query(
    `select fit_mode, count(*)::int as n from public.contents group by fit_mode order by fit_mode`,
  );
  console.log("fit_mode counts:", r.rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
