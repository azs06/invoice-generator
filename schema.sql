CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL, -- JSON string of the invoice data
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);
