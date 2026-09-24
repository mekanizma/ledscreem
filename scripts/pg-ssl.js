const fs = require("fs");
const path = require("path");

const supabaseCa = fs.readFileSync(path.join(__dirname, "supabase-ca.crt"), "utf8");

/** Verify TLS for remote Postgres against the Supabase CA. Local stays plain. */
function pgSsl(connectionString) {
  if (/localhost|127\.0\.0\.1/i.test(connectionString || "")) return false;
  return { rejectUnauthorized: true, ca: supabaseCa };
}

module.exports = { pgSsl };
