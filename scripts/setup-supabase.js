const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
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

const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@led.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "LedAdmin2026!";

if (!DATABASE_URL) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Supabase Postgres");

  const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql") && !f.includes("promote_admin"))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    console.log(`\n>>> Running ${file}`);
    try {
      await client.query(sql);
      console.log(`OK ${file}`);
    } catch (err) {
      console.warn(`Batch failed for ${file}: ${err.message}`);
      console.log("Retrying statement-by-statement...");
      await runStatements(client, sql, file);
    }
  }

  console.log("\n>>> Ensuring realtime publication");
  for (const table of ["contents", "display_contents", "displays"]) {
    try {
      await client.query(
        `alter publication supabase_realtime add table public.${table}`,
      );
      console.log(`Realtime added: ${table}`);
    } catch (err) {
      if (/already member/i.test(err.message)) {
        console.log(`Realtime already: ${table}`);
      } else {
        console.warn(`Realtime ${table}: ${err.message}`);
      }
    }
  }

  console.log("\n>>> Ensuring admin user");
  await ensureAdmin(client);

  const counts = await client.query(`
    select
      (select count(*) from public.displays) as displays,
      (select count(*) from public.contents) as contents,
      (select count(*) from public.display_contents) as playlist,
      (select count(*) from public.profiles where role = 'admin') as admins
  `);
  console.log("\nCounts:", counts.rows[0]);

  await client.end();
  console.log("\nDone.");
  console.log(`Admin login: ${ADMIN_EMAIL}`);
  console.log(`Admin password: ${ADMIN_PASSWORD}`);
}

async function runStatements(client, sql, file) {
  const parts = splitSql(sql);
  for (let i = 0; i < parts.length; i++) {
    const stmt = parts[i].trim();
    if (!stmt || stmt.startsWith("--")) continue;
    try {
      await client.query(stmt);
    } catch (err) {
      const msg = err.message || "";
      const ignorable =
        /already exists/i.test(msg) ||
        /duplicate key/i.test(msg) ||
        /already a member/i.test(msg) ||
        /policy .* already exists/i.test(msg) ||
        /relation .* already exists/i.test(msg) ||
        /trigger .* already exists/i.test(msg);
      if (ignorable) {
        console.log(`  skip (${i + 1}): ${msg.split("\n")[0]}`);
      } else {
        console.error(`  FAIL ${file} #${i + 1}: ${msg}`);
        throw err;
      }
    }
  }
  console.log(`OK ${file} (statement mode)`);
}

function splitSql(sql) {
  const parts = [];
  let current = "";
  let inDollar = false;
  let dollarTag = "";
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (!inDollar && ch === "$") {
      const rest = sql.slice(i);
      const m = rest.match(/^\$([a-zA-Z_]*)\$/);
      if (m) {
        inDollar = true;
        dollarTag = m[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }
    if (inDollar && sql.startsWith(dollarTag, i)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      inDollar = false;
      dollarTag = "";
      continue;
    }
    if (!inDollar && ch === ";") {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

async function ensureAdmin(client) {
  const existing = await client.query(
    `select id from auth.users where email = $1 limit 1`,
    [ADMIN_EMAIL],
  );

  let userId;
  if (existing.rows.length) {
    userId = existing.rows[0].id;
    console.log(`User exists: ${ADMIN_EMAIL} (${userId})`);
    await client.query(
      `update auth.users set encrypted_password = crypt($1, gen_salt('bf')), email_confirmed_at = coalesce(email_confirmed_at, now()), updated_at = now() where id = $2`,
      [ADMIN_PASSWORD, userId],
    );
  } else {
    const created = await client.query(
      `
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(), 'authenticated', 'authenticated',
        $1, crypt($2, gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Sistem Yöneticisi","role":"admin"}'::jsonb,
        now(), now(), '', '', '', ''
      )
      returning id
      `,
      [ADMIN_EMAIL, ADMIN_PASSWORD],
    );
    userId = created.rows[0].id;
    console.log(`Created user: ${ADMIN_EMAIL} (${userId})`);
  }

  const idents = await client.query(
    `select id from auth.identities where user_id = $1::uuid`,
    [userId],
  );
  if (idents.rows.length === 0) {
    await client.query(
      `
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), $1::uuid,
        jsonb_build_object('sub', $1::text, 'email', $2::text),
        'email', $1::text, now(), now(), now()
      )
      `,
      [userId, ADMIN_EMAIL],
    );
    console.log("Identity created");
  }

  await client.query(
    `
    insert into public.profiles (id, email, full_name, role)
    values ($1::uuid, $2, 'Sistem Yöneticisi', 'admin')
    on conflict (id) do update
      set role = 'admin',
          email = excluded.email,
          full_name = coalesce(public.profiles.full_name, excluded.full_name)
    `,
    [userId, ADMIN_EMAIL],
  );
  console.log("Admin profile ready");
}

run().catch((err) => {
  console.error("SETUP FAILED:", err.message);
  process.exit(1);
});
