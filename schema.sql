-- =====================================================
-- FreeInvoice.info Database Schema for Cloudflare D1
-- =====================================================
-- 
-- Migration Instructions:
-- 1. Run: wrangler d1 execute invoice-db --file=./schema.sql
-- 2. Or for remote: wrangler d1 execute invoice-db --file=./schema.sql --remote
--
-- Note: This schema includes tables required by better-auth for authentication
-- =====================================================

-- =====================================================
-- Authentication Tables (required by better-auth)
-- =====================================================

-- Users table - stores authenticated user information
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0, -- boolean: 0 = false, 1 = true
    image TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions table - active user sessions
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch()),
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

-- Accounts table - OAuth provider connections (Google, etc.)
CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL DEFAULT (unixepoch()),
    updatedAt INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Verification table - email verification tokens, password reset, etc.
CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER DEFAULT (unixepoch()),
    updatedAt INTEGER DEFAULT (unixepoch())
);

-- =====================================================
-- Application Tables
-- =====================================================

-- Invoices table - stores user invoice data
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- JSON string of the invoice data
    userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    pdfKey TEXT, -- R2 bucket key for stored PDF
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- =====================================================
-- Indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_session_userId ON session(userId);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_userId ON account(userId);
CREATE INDEX IF NOT EXISTS idx_account_providerId ON account(providerId);
CREATE INDEX IF NOT EXISTS idx_invoices_userId ON invoices(userId);
CREATE INDEX IF NOT EXISTS idx_invoices_updated_at ON invoices(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
