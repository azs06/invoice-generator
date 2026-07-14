import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Fixed-window rate limit counters.
 * Key format: `${userId}:${action}:${windowStart}` where windowStart is the
 * unix timestamp (seconds) of the start of the current window.
 *
 * Kept in a separate file from schema.ts intentionally (that file is owned
 * by another workstream). See migrations/0001_rate_limits.sql for the DDL.
 */
export const rateLimits = sqliteTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').notNull().default(0),
	windowStart: integer('windowStart', { mode: 'timestamp' }).notNull()
});
