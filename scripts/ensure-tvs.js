const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "supabase", "migrations", "008_multi_tv.sql"),
    "utf8",
  );
  await c.query(sql);

  // Move playlist links from LED-001 to TV1 if both exist briefly
  await c.query(`
    update public.display_contents dc
    set display_id = tv1.id
    from public.displays led, public.displays tv1
    where led.display_code = 'LED-001'
      and tv1.display_code = 'TV1'
      and dc.display_id = led.id
      and not exists (
        select 1 from public.display_contents x
        where x.display_id = tv1.id and x.content_id = dc.content_id
      )
  `);

  const r = await c.query(
    `select display_code, name, width, height from public.displays order by display_code`,
  );
  console.log(r.rows);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
