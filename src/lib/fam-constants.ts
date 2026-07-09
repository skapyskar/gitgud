// Pure constants shared by server routes and client components — no Prisma import here,
// so client components (e.g. CreateFamModal) can safely import this without pulling in
// server-only code (unlike src/lib/fam.ts, which imports the Prisma client).
export const FAM_FREE_LIMIT = 3;
export const FAM_CREATION_COST = 250;
export const DEFAULT_INVITE_EXPIRY_DAYS = 7;
export const CHALLENGE_WIN_XP = 50;
export const CHALLENGE_WIN_COINS = 25;
