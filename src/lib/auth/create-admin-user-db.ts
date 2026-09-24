import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";

const supabaseCa = readFileSync(join(process.cwd(), "scripts", "supabase-ca.crt"), "utf8");

/**
 * Create an admin auth user via direct Postgres when service role key is absent.
 * Uses the same pattern as scripts/update-admin.js.
 */
export async function createAdminUserViaDb(input: {
  email: string;
  password: string;
  fullName: string;
}): Promise<{ id: string } | { error: string; status: number }> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return {
      error:
        "Sunucu yapılandırması eksik: SUPABASE_SERVICE_ROLE_KEY veya DATABASE_URL tanımlayın.",
      status: 503,
    };
  }

  const c = new Client({
    connectionString: databaseUrl,
    ssl: /localhost|127\.0\.0\.1/i.test(databaseUrl)
      ? false
      : { rejectUnauthorized: true, ca: supabaseCa },
  });

  try {
    await c.connect();

    const existing = await c.query(
      `select id from auth.users where lower(email) = lower($1) limit 1`,
      [input.email],
    );
    if (existing.rows.length > 0) {
      return {
        error: "Bu e-posta ile kayıtlı bir hesap zaten var.",
        status: 409,
      };
    }

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
        jsonb_build_object('full_name', $3::text, 'role', 'admin'),
        now(), now(), '', '', '', ''
      )
      returning id
      `,
      [input.email, input.password, input.fullName],
    );

    const userId = created.rows[0].id as string;

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
      [userId, input.email],
    );

    await c.query(
      `
      insert into public.profiles (id, email, full_name, role)
      values ($1::uuid, $2, $3, 'admin')
      on conflict (id) do update
        set email = excluded.email,
            full_name = excluded.full_name,
            role = 'admin',
            updated_at = now()
      `,
      [userId, input.email, input.fullName],
    );

    return { id: userId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hesap oluşturulamadı.";
    return { error: message, status: 500 };
  } finally {
    await c.end().catch(() => undefined);
  }
}
