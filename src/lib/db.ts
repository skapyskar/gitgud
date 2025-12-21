// lib/db.ts
import { Pool } from 'pg'; // <--- 1. Import Pool
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../prisma/generated/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const prismaClientSingleton = () => {
  // 2. Create the Pool first (PrismaPg needs this)
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
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