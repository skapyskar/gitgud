// lib/db.ts
import { PrismaClient } from '../../prisma/generated/client'; // Your custom output path
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Extend the global namespace to include the Prisma object
//    This prevents TypeScript errors when attaching prisma to the global object.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// 2. Define a function that creates the client with the adapter
const prismaClientSingleton = () => {
  // Initialize the adapter
  const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL! 
  });
  
  // Pass the adapter to the Client
  return new PrismaClient({ adapter });
};

// 3. Export the singleton instance
//    If we already have a prisma instance on the global object, use it.
//    Otherwise, create a new one.
export const prisma = globalForPrisma.prisma || prismaClientSingleton();

// 4. In development, save the instance to the global object
//    This effectively "caches" the connection across hot reloads.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}