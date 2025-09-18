import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, items, localEvents, ads, orders, truckLocation, settings, emailVerifications } from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Configure connection for Supabase
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 1,
});

export const db = drizzle(sql);

// Export tables for easy access
export { users, items, localEvents, ads, orders, truckLocation, settings, emailVerifications };