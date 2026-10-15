// @ts-check

/**
 * Shared by the app and the read-only database check command.
 * @param {Record<string, string | undefined>} env
 * @returns {import('pg').PoolConfig}
 */
export function getDatabasePoolConfig(env) {
  let url;
  let username;
  try {
    url = new URL(env.DATABASE_URL ?? "");
    username = decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    // Node's Invalid URL error carries the original input, including secrets.
    throw new Error("DATABASE_URL must be a valid PostgreSQL URI. Percent-encode special characters in the password.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !username || url.hash) {
    throw new Error("DATABASE_URL must be a PostgreSQL URI with a host and username. Percent-encode special characters in the password.");
  }
  if (url.hostname.endsWith(".pooler.supabase.com") && !/^.+\.[a-z0-9]+$/.test(username)) {
    throw new Error("DATABASE_URL: Supabase shared pooler usernames must use role.project-ref. Copy the full URI from Supabase's Connect dialog.");
  }
  // URL SSL parameters override pg's explicit SSL object, including its CA.
  for (const param of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    url.searchParams.delete(param);
  }
  return {
    connectionString: url.toString(),
    // Retain the existing TLS behavior; supplying the project's PEM CA enables
    // verification. Without it, transport is encrypted but not verified.
    ssl: env.DATABASE_CA_CERT
      ? { ca: env.DATABASE_CA_CERT, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
    max: 5, // Each serverless instance has its own pool.
    connectionTimeoutMillis: 10_000,
  };
}

/** @param {unknown} error */
export function getDatabaseErrorHint(error) {
  const message = error instanceof Error ? error.message : "";
  if (/tenant(?:\/user| or user).*not found/i.test(message)) {
    return "Supabase could not match the pooler host and username to a project. Copy the complete transaction-pooler URI from the project's Connect dialog; do not guess the cluster or region.";
  }
  // Never echo driver errors: they can include credentials or connection URIs.
  return "Check DATABASE_URL, the database password and DATABASE_CA_CERT, and confirm the Supabase project is running and its Prisma migrations are applied.";
}
