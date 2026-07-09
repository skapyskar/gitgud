// lib/db.ts
import { Pool } from 'pg'; // <--- 1. Import Pool
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/generated/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () => {
  // 2. Create the Pool first (PrismaPg needs this).
  // We connect through Supabase's IPv4 connection pooler (Supavisor) because the
  // direct db.<ref>.supabase.co host is IPv6-only and unreachable from IPv4-only
  // environments like Vercel serverless. The pooler requires TLS but presents a
  // cert that isn't in Node's default CA bundle. Set DATABASE_CA_CERT (the
  // project CA from the Supabase dashboard, PEM text) to verify the connection;
  // without it we fall back to encrypted-but-unverified, which is MITM-able.
  const ca = process.env.DATABASE_CA_CERT;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false },
    // Keep the per-instance pool small — on serverless many instances each open
    // their own pool against the shared Supavisor pooler.
    max: 5,
  });

  // 3. Pass the pool to the adapter
  const adapter = new PrismaPg(pool);
  
  // 4. Pass the adapter to the client
  return new PrismaClient({ adapter });
};

export const prisma = globalForPrisma.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}