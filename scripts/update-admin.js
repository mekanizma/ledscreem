const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { pgSsl } = require("./pg-ssl");

for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i > 0) process.env[t.slice(0, i).trim()] ||= t.slice(i + 1).trim();
}

const NEW_EMAIL = process.env.ADMIN_EMAIL || "";
const NEW_PASSWORD = process.env.ADMIN_PASSWORD || "";
if (!NEW_EMAIL || NEW_PASSWORD.length < 8) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 characters)");
  process.exit(1);
}

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: pgSsl(process.env.DATABASE_URL),
  });
  await c.connect();

  // Prefer updating existing admin profile user; else any auth user; else create
  const adminProfile = await c.query(
    `select id, email from public.profiles where role = 'admin' order by created_at limit 1`,
  );

  let userId = adminProfile.rows[0]?.id ?? null;

  if (!userId) {
    const anyUser = await c.query(`select id from auth.users order by created_at limit 1`);
    userId = anyUser.rows[0]?.id ?? null;
  }

  if (!userId) {
    const created = await c.query(
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
      [NEW_EMAIL, NEW_PASSWORD],
    );
    userId = created.rows[0].id;
    console.log("Created user", userId);
  } else {
    // Clear email conflict if another user already has the new email
    const conflict = await c.query(
      `select id from auth.users where email = $1 and id <> $2`,
      [NEW_EMAIL, userId],
    );
    if (conflict.rows.length) {
      await c.query(`delete from auth.identities where user_id = $1`, [conflict.rows[0].id]);
      await c.query(`delete from public.profiles where id = $1`, [conflict.rows[0].id]);
      await c.query(`delete from auth.users where id = $1`, [conflict.rows[0].id]);
      console.log("Removed conflicting user");
    }

    await c.query(
      `
      update auth.users
      set email = $1,
          encrypted_password = crypt($2, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
            || '{"full_name":"Sistem Yöneticisi","role":"admin"}'::jsonb,
          updated_at = now()
      where id = $3
      `,
      [NEW_EMAIL, NEW_PASSWORD, userId],
    );
    console.log("Updated user", userId);
  }

  // Identity for email login
  const idents = await c.query(`select id from auth.identities where user_id = $1::uuid`, [userId]);
  if (idents.rows.length === 0) {
    await c.query(
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
      [userId, NEW_EMAIL],
    );
  } else {
    await c.query(
      `
      update auth.identities
      set identity_data = jsonb_build_object('sub', $1::text, 'email', $2::text),
          provider_id = $1::text,
          updated_at = now()
      where user_id = $1::uuid
      `,
      [userId, NEW_EMAIL],
    );
  }

  await c.query(
    `
    insert into public.profiles (id, email, full_name, role)
    values ($1::uuid, $2, 'Sistem Yöneticisi', 'admin')
    on conflict (id) do update
      set email = excluded.email,
          role = 'admin',
          full_name = coalesce(public.profiles.full_name, excluded.full_name)
    `,
    [userId, NEW_EMAIL],
  );

  // Verify login path data
  const check = await c.query(
    `select u.email, p.role from auth.users u join public.profiles p on p.id = u.id where u.id = $1`,
    [userId],
  );
  console.log("Ready:", check.rows[0]);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
