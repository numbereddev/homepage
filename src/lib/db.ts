import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export const REACTIONS = ["🔥", "👍", "🤔", "💡", "🎉"] as const;
export type Reaction = (typeof REACTIONS)[number];

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "site.db");

type AdminRow = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

type SessionRow = {
  id: number;
  token: string;
  admin_id: number;
  expires_at: string;
  created_at: string;
};

export type LinkRow = {
  id: number;
  label: string;
  url: string;
  display_order: number;
  created_at: string;
};

export type AssetRow = {
  id: number;
  slug: string;
  filename: string;
  mime_type: string;
  size: number;
  created_at: string;
};

export type PostStatsRow = {
  slug: string;
  views: number;
  reactions: Record<Reaction, number>;
};

let dbInstance: Database.Database | null = null;

function ensureDataDirectory() {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

function createDatabase() {
  ensureDataDirectory();

  const db = new Database(databasePath);
  // db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS post_views (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT    NOT NULL,
      fingerprint TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (slug, fingerprint)
    );

    CREATE INDEX IF NOT EXISTS idx_post_views_slug
      ON post_views(slug);

    CREATE TABLE IF NOT EXISTS post_reactions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT    NOT NULL,
      emoji       TEXT    NOT NULL,
      fingerprint TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (slug, emoji, fingerprint)
    );

    CREATE INDEX IF NOT EXISTS idx_post_reactions_slug
      ON post_reactions(slug);

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL UNIQUE,
      admin_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      url TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_token
      ON admin_sessions(token);

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at
      ON admin_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_assets_slug
      ON assets(slug);
  `);

  seedDefaultAdmin(db);

  return db;
}

// ---------------------------------------------------------------------------
// Fingerprinting
// ---------------------------------------------------------------------------

/**
 * Produces a one-way SHA-256 hash from the visitor's IP and User-Agent.
 * No raw PII is stored — only the hex digest.
 */
export function makeFingerprint(ip: string, userAgent: string): string {
  return crypto.createHash("sha256").update(`${ip}::${userAgent}`).digest("hex");
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }

  return dbInstance;
}

function seedDefaultAdmin(db: Database.Database) {
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme-now";

  const existingAdmin = db
    .prepare("SELECT id FROM admins WHERE username = ?")
    .get(adminUsername) as { id: number } | undefined;

  if (existingAdmin) {
    return;
  }

  const passwordHash = bcrypt.hashSync(adminPassword, 12);

  db.prepare(
    `
      INSERT INTO admins (username, password_hash)
      VALUES (?, ?)
    `,
  ).run(adminUsername, passwordHash);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[admin] Seeded default admin user "${adminUsername}". Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment to override defaults.`,
    );
  }
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function getAdminByUsername(username: string) {
  const db = getDb();

  return (
    (db
      .prepare(
        `
          SELECT id, username, password_hash, created_at
          FROM admins
          WHERE username = ?
        `,
      )
      .get(username) as AdminRow | undefined) ?? null
  );
}

export function createAdmin(username: string, passwordHash: string) {
  const db = getDb();

  const result = db
    .prepare(
      `
        INSERT INTO admins (username, password_hash)
        VALUES (?, ?)
      `,
    )
    .run(username, passwordHash);

  return Number(result.lastInsertRowid);
}

export function updateAdminPassword(adminId: number, passwordHash: string) {
  const db = getDb();

  db.prepare(
    `
      UPDATE admins
      SET password_hash = ?
      WHERE id = ?
    `,
  ).run(passwordHash, adminId);
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getExpiryDate(daysFromNow = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysFromNow);
  return expiresAt.toISOString();
}

export function createAdminSession(adminId: number, daysFromNow = 7) {
  const db = getDb();
  const token = generateSessionToken();
  const expiresAt = getExpiryDate(daysFromNow);

  db.prepare(
    `
      INSERT INTO admin_sessions (token, admin_id, expires_at)
      VALUES (?, ?, ?)
    `,
  ).run(token, adminId, expiresAt);

  return {
    token,
    expiresAt,
  };
}

export function getAdminSession(token: string) {
  const db = getDb();

  const session = db
    .prepare(
      `
        SELECT
          s.id,
          s.token,
          s.admin_id,
          s.expires_at,
          s.created_at,
          a.username
        FROM admin_sessions s
        INNER JOIN admins a ON a.id = s.admin_id
        WHERE s.token = ?
      `,
    )
    .get(token) as (SessionRow & { username: string }) | undefined;

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    deleteAdminSession(token);
    return null;
  }

  return session;
}

export function deleteAdminSession(token: string) {
  const db = getDb();

  db.prepare(
    `
      DELETE FROM admin_sessions
      WHERE token = ?
    `,
  ).run(token);
}

export function clearExpiredAdminSessions() {
  const db = getDb();

  db.prepare(
    `
      DELETE FROM admin_sessions
      WHERE expires_at <= ?
    `,
  ).run(new Date().toISOString());
}

export function requireEnvAdminCredentials() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme-now";

  return { username, password };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export function getAllLinks(): LinkRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, label, url, display_order, created_at FROM links ORDER BY display_order ASC, id ASC",
    )
    .all() as LinkRow[];
}

export function createLink(label: string, url: string): LinkRow {
  const db = getDb();
  const maxOrder = (
    db.prepare("SELECT COALESCE(MAX(display_order), -1) AS m FROM links").get() as { m: number }
  ).m;
  const result = db
    .prepare("INSERT INTO links (label, url, display_order) VALUES (?, ?, ?)")
    .run(label.trim(), url.trim(), maxOrder + 1);
  return db
    .prepare("SELECT id, label, url, display_order, created_at FROM links WHERE id = ?")
    .get(result.lastInsertRowid) as LinkRow;
}

export function updateLink(id: number, label: string, url: string): LinkRow | null {
  const db = getDb();
  db.prepare("UPDATE links SET label = ?, url = ? WHERE id = ?").run(label.trim(), url.trim(), id);
  return (
    (db
      .prepare("SELECT id, label, url, display_order, created_at FROM links WHERE id = ?")
      .get(id) as LinkRow | undefined) ?? null
  );
}

export function reorderLinks(orderedIds: number[]): void {
  const db = getDb();
  const update = db.prepare("UPDATE links SET display_order = ? WHERE id = ?");
  const run = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id));
  });
  run();
}

export function deleteLink(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM links WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export function getAllAssets(): AssetRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, slug, filename, mime_type, size, created_at FROM assets ORDER BY created_at DESC",
    )
    .all() as AssetRow[];
}

export function getAssetBySlug(slug: string): AssetRow | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT id, slug, filename, mime_type, size, created_at FROM assets WHERE slug = ?")
      .get(slug) as AssetRow | undefined) ?? null
  );
}

export function getAssetById(id: number): AssetRow | null {
  const db = getDb();
  return (
    (db
      .prepare("SELECT id, slug, filename, mime_type, size, created_at FROM assets WHERE id = ?")
      .get(id) as AssetRow | undefined) ?? null
  );
}

export function createAsset(
  slug: string,
  filename: string,
  mimeType: string,
  size: number,
): AssetRow {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO assets (slug, filename, mime_type, size) VALUES (?, ?, ?, ?)")
    .run(slug, filename, mimeType, size);
  return db
    .prepare("SELECT id, slug, filename, mime_type, size, created_at FROM assets WHERE id = ?")
    .get(result.lastInsertRowid) as AssetRow;
}

export function updateAssetSlug(id: number, newSlug: string): AssetRow | null {
  const db = getDb();
  db.prepare("UPDATE assets SET slug = ? WHERE id = ?").run(newSlug, id);
  return getAssetById(id);
}

export function deleteAsset(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM assets WHERE id = ?").run(id);
}

export function assetSlugExists(slug: string, excludeId?: number): boolean {
  const db = getDb();
  if (excludeId !== undefined) {
    const result = db
      .prepare("SELECT 1 FROM assets WHERE slug = ? AND id != ?")
      .get(slug, excludeId);
    return result !== undefined;
  }
  const result = db.prepare("SELECT 1 FROM assets WHERE slug = ?").get(slug);
  return result !== undefined;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Records a view for a post. Silently ignores duplicate fingerprints (UNIQUE
 * constraint). Returns true if this was a new unique view.
 */
export function recordView(slug: string, fingerprint: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`INSERT OR IGNORE INTO post_views (slug, fingerprint) VALUES (?, ?)`)
    .run(slug, fingerprint);
  return result.changes > 0;
}

export function getViewCount(slug: string): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM post_views WHERE slug = ?").get(slug) as {
    c: number;
  };
  return row.c;
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggles a reaction: adds it if absent, removes it if already present.
 * Returns the new toggled state and the full updated counts.
 */
export function toggleReaction(
  slug: string,
  emoji: string,
  fingerprint: string,
): { added: boolean; counts: Record<string, number> } {
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM post_reactions WHERE slug = ? AND emoji = ? AND fingerprint = ?")
    .get(slug, emoji, fingerprint);

  if (existing) {
    db.prepare("DELETE FROM post_reactions WHERE slug = ? AND emoji = ? AND fingerprint = ?").run(
      slug,
      emoji,
      fingerprint,
    );
  } else {
    db.prepare(
      "INSERT OR IGNORE INTO post_reactions (slug, emoji, fingerprint) VALUES (?, ?, ?)",
    ).run(slug, emoji, fingerprint);
  }

  return { added: !existing, counts: getReactionCounts(slug) };
}

export function getReactionCounts(slug: string): Record<string, number> {
  const db = getDb();
  const rows = db
    .prepare(`SELECT emoji, COUNT(*) AS c FROM post_reactions WHERE slug = ? GROUP BY emoji`)
    .all(slug) as { emoji: string; c: number }[];

  // Always return all supported emojis, defaulting to 0
  const counts: Record<string, number> = {};
  for (const emoji of REACTIONS) counts[emoji] = 0;
  for (const row of rows) counts[row.emoji] = row.c;
  return counts;
}

/**
 * Returns which emojis a given fingerprint has already reacted with.
 */
export function getMyReactions(slug: string, fingerprint: string): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT emoji FROM post_reactions WHERE slug = ? AND fingerprint = ?")
    .all(slug, fingerprint) as { emoji: string }[];
  return rows.map((r) => r.emoji);
}

export function getPostStats(
  slug: string,
  fingerprint?: string,
): PostStatsRow & { myReactions: string[] } {
  const reactionCounts = getReactionCounts(slug);
  return {
    slug,
    views: getViewCount(slug),
    reactions: reactionCounts as Record<Reaction, number>,
    myReactions: fingerprint ? getMyReactions(slug, fingerprint) : [],
  };
}
