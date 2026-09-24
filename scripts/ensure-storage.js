const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

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
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const before = await client.query(
    `select id, name, public, file_size_limit from storage.buckets`,
  );
  console.log("buckets before:", before.rows);

  await client.query(`
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'content-media',
      'content-media',
      true,
      4294967296,
      array[
        'image/jpeg','image/jpg','image/png','image/webp',
        'video/mp4','video/webm'
      ]
    )
    on conflict (id) do update set
      public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types
  `);

  // Recreate storage policies idempotently
  const policies = [
    `drop policy if exists "Public read content-media" on storage.objects`,
    `drop policy if exists "Admins upload content-media" on storage.objects`,
    `drop policy if exists "Admins update content-media" on storage.objects`,
    `drop policy if exists "Admins delete content-media" on storage.objects`,
    `create policy "Public read content-media" on storage.objects for select to anon, authenticated using (bucket_id = 'content-media')`,
    `create policy "Admins upload content-media" on storage.objects for insert to authenticated with check (bucket_id = 'content-media' and public.is_admin())`,
    `create policy "Admins update content-media" on storage.objects for update to authenticated using (bucket_id = 'content-media' and public.is_admin()) with check (bucket_id = 'content-media' and public.is_admin())`,
    `create policy "Admins delete content-media" on storage.objects for delete to authenticated using (bucket_id = 'content-media' and public.is_admin())`,
  ];

  for (const sql of policies) {
    try {
      await client.query(sql);
    } catch (e) {
      console.warn("policy:", e.message);
    }
  }

  const after = await client.query(
    `select id, name, public, file_size_limit from storage.buckets where id = 'content-media'`,
  );
  console.log("bucket after:", after.rows);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
