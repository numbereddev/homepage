import bcrypt from "bcryptjs";
import crypto from "crypto";
import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";
type MysqlReactionRow = RowDataPacket & {
  emoji: string;
  c: number;
};

export const REACTIONS = ["🔥", "👍", "🤔", "💡", "🎉"] as const;
export type Reaction = (typeof REACTIONS)[number];

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

type SetupStatus = {
  configured: boolean;
  connected: boolean;
  ready: boolean;
  reason: "missing-config" | "connection-failed" | "ready";
  message: string;
};

type AdminSessionWithUsername = SessionRow & {
  username: string;
};

let poolInstance: Pool | null = null;
let initializationPromise: Promise<void> | null = null;

function getDatabaseConfig() {
  const host = process.env.MYSQL_HOST?.trim() ?? "";
  const port = Number(process.env.MYSQL_PORT?.trim() ?? "3306");
  const database = process.env.MYSQL_DATABASE?.trim() ?? "";
  const user = process.env.MYSQL_USER?.trim() ?? "";
  const password = process.env.MYSQL_PASSWORD ?? "";
  const url = process.env.DATABASE_URL?.trim() ?? "";

  return {
    host,
    port: Number.isFinite(port) ? port : 3306,
    database,
    user,
    password,
    url,
  };
}

function hasDatabaseConfig() {
  const config = getDatabaseConfig();
  return Boolean(config.url || (config.host && config.database && config.user));
}

function createPool() {
  const config = getDatabaseConfig();

  if (!hasDatabaseConfig()) {
    throw new Error(
      "MySQL is not configured. Set DATABASE_URL or MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE, MYSQL_USER, and MYSQL_PASSWORD.",
    );
  }

  return mysql.createPool(
    config.url
      ? {
          uri: config.url,
          connectionLimit: 10,
          waitForConnections: true,
          queueLimit: 0,
          namedPlaceholders: false,
        }
      : {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          connectionLimit: 10,
          waitForConnections: true,
          queueLimit: 0,
          namedPlaceholders: false,
        },
  );
}

async function getPool() {
  if (!poolInstance) {
    poolInstance = createPool();
  }

  return poolInstance;
}

function sqlNow(daysOffset = 0) {
  const date = new Date();

  if (daysOffset !== 0) {
    date.setDate(date.getDate() + daysOffset);
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function createSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(191) NOT NULL UNIQUE,
      admin_id INT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_admin_sessions_admin
        FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
      INDEX idx_admin_sessions_token (token),
      INDEX idx_admin_sessions_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      label VARCHAR(255) NOT NULL,
      url TEXT NOT NULL,
      display_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_links_display_order (display_order, id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(191) NOT NULL UNIQUE,
      filename VARCHAR(255) NOT NULL,
      mime_type VARCHAR(191) NOT NULL,
      size BIGINT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_assets_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_views (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(191) NOT NULL,
      fingerprint CHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_post_views_slug_fingerprint (slug, fingerprint),
      INDEX idx_post_views_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_reactions (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(191) NOT NULL,
      emoji VARCHAR(16) NOT NULL,
      fingerprint CHAR(64) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_post_reactions_slug_emoji_fingerprint (slug, emoji, fingerprint),
      INDEX idx_post_reactions_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function seedDefaultAdmin(pool: Pool) {
  const adminUsername = process.env.ADMIN_USERNAME?.trim() ?? "admin";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme-now";

  const [existingRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM admins
      WHERE username = ?
      LIMIT 1
    `,
    [adminUsername],
  );

  if (existingRows.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await pool.query(
    `
      INSERT INTO admins (username, password_hash)
      VALUES (?, ?)
    `,
    [adminUsername, passwordHash],
  );

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[admin] Seeded default admin user "${adminUsername}". Set ADMIN_USERNAME and ADMIN_PASSWORD in your environment to override defaults.`,
    );
  }
}

async function initializeDatabase() {
  const pool = await getPool();
  await createSchema(pool);
  await seedDefaultAdmin(pool);
}

async function ensureInitialized() {
  if (!initializationPromise) {
    initializationPromise = initializeDatabase().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
}

async function ensureReadyPool() {
  await ensureInitialized();
  return getPool();
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    return value;
  }

  return String(value ?? "");
}

function mapAdminRow(row: RowDataPacket): AdminRow {
  return {
    id: Number(row.id),
    username: String(row.username),
    password_hash: String(row.password_hash),
    created_at: normalizeDate(row.created_at),
  };
}

function mapSessionRow(row: RowDataPacket): SessionRow {
  return {
    id: Number(row.id),
    token: String(row.token),
    admin_id: Number(row.admin_id),
    expires_at: normalizeDate(row.expires_at),
    created_at: normalizeDate(row.created_at),
  };
}

function mapLinkRow(row: RowDataPacket): LinkRow {
  return {
    id: Number(row.id),
    label: String(row.label),
    url: String(row.url),
    display_order: Number(row.display_order),
    created_at: normalizeDate(row.created_at),
  };
}

function mapAssetRow(row: RowDataPacket): AssetRow {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    filename: String(row.filename),
    mime_type: String(row.mime_type),
    size: Number(row.size),
    created_at: normalizeDate(row.created_at),
  };
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

export function isDatabaseConfigured() {
  return hasDatabaseConfig();
}

export async function getSetupStatus(): Promise<SetupStatus> {
  if (!hasDatabaseConfig()) {
    return {
      configured: false,
      connected: false,
      ready: false,
      reason: "missing-config",
      message:
        "MySQL is not configured yet. Add your MySQL connection details to the environment and then complete the first-run setup.",
    };
  }

  try {
    const pool = await getPool();
    await pool.query("SELECT 1");
    return {
      configured: true,
      connected: true,
      ready: true,
      reason: "ready",
      message: "MySQL connection is ready.",
    };
  } catch (error) {
    console.error("[db] MySQL connection check failed.", error);

    return {
      configured: true,
      connected: false,
      ready: false,
      reason: "connection-failed",
      message:
        "MySQL is configured, but the connection failed. Verify host, port, database, username, password, and network access.",
    };
  }
}

export async function ensureDatabaseSetup() {
  await ensureInitialized();
}

export async function hasAnyAdminUsers() {
  const pool = await ensureReadyPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS count
      FROM admins
    `,
  );

  return Number(rows[0]?.count ?? 0) > 0;
}

export async function isInitialSetupComplete() {
  return hasAnyAdminUsers();
}

export async function isSetupComplete() {
  return hasAnyAdminUsers();
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

export async function getDb() {
  return ensureReadyPool();
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function getAdminByUsername(username: string) {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, username, password_hash, created_at
      FROM admins
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  );

  const row = rows[0];
  return row ? mapAdminRow(row) : null;
}

export async function createAdmin(username: string, passwordHash: string) {
  const pool = await ensureReadyPool();

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO admins (username, password_hash)
      VALUES (?, ?)
    `,
    [username, passwordHash],
  );

  return Number(result.insertId);
}

export async function updateAdminPassword(adminId: number, passwordHash: string) {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      UPDATE admins
      SET password_hash = ?
      WHERE id = ?
    `,
    [passwordHash, adminId],
  );
}

function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getExpiryDate(daysFromNow = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysFromNow);
  return expiresAt.toISOString();
}

export async function createAdminSession(adminId: number, daysFromNow = 7) {
  const pool = await ensureReadyPool();
  const token = generateSessionToken();
  const expiresAt = getExpiryDate(daysFromNow);

  await pool.query(
    `
      INSERT INTO admin_sessions (token, admin_id, expires_at)
      VALUES (?, ?, ?)
    `,
    [token, adminId, sqlNow(daysFromNow)],
  );

  return {
    token,
    expiresAt,
  };
}

export async function getAdminSession(token: string) {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
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
      LIMIT 1
    `,
    [token],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  const session: AdminSessionWithUsername = {
    ...mapSessionRow(row),
    username: String(row.username),
  };

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await deleteAdminSession(token);
    return null;
  }

  return session;
}

export async function deleteAdminSession(token: string) {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      DELETE FROM admin_sessions
      WHERE token = ?
    `,
    [token],
  );
}

export async function clearExpiredAdminSessions() {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      DELETE FROM admin_sessions
      WHERE expires_at <= ?
    `,
    [sqlNow()],
  );
}

export function requireEnvAdminCredentials() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "changeme-now";

  return { username, password };
}

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

export async function getAllLinks(): Promise<LinkRow[]> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, label, url, display_order, created_at
      FROM links
      ORDER BY display_order ASC, id ASC
    `,
  );

  return rows.map(mapLinkRow);
}

export async function createLink(label: string, url: string): Promise<LinkRow> {
  const pool = await ensureReadyPool();

  const [maxRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COALESCE(MAX(display_order), -1) AS m
      FROM links
    `,
  );

  const nextOrder = Number(maxRows[0]?.m ?? -1) + 1;

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO links (label, url, display_order)
      VALUES (?, ?, ?)
    `,
    [label.trim(), url.trim(), nextOrder],
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, label, url, display_order, created_at
      FROM links
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId],
  );

  return mapLinkRow(rows[0]);
}

export async function updateLink(id: number, label: string, url: string): Promise<LinkRow | null> {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      UPDATE links
      SET label = ?, url = ?
      WHERE id = ?
    `,
    [label.trim(), url.trim(), id],
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, label, url, display_order, created_at
      FROM links
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapLinkRow(rows[0]) : null;
}

export async function reorderLinks(orderedIds: number[]): Promise<void> {
  const pool = await ensureReadyPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const [index, id] of orderedIds.entries()) {
      await connection.query(
        `
          UPDATE links
          SET display_order = ?
          WHERE id = ?
        `,
        [index, id],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteLink(id: number): Promise<void> {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      DELETE FROM links
      WHERE id = ?
    `,
    [id],
  );
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export async function getAllAssets(): Promise<AssetRow[]> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, slug, filename, mime_type, size, created_at
      FROM assets
      ORDER BY created_at DESC
    `,
  );

  return rows.map(mapAssetRow);
}

export async function getAssetBySlug(slug: string): Promise<AssetRow | null> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, slug, filename, mime_type, size, created_at
      FROM assets
      WHERE slug = ?
      LIMIT 1
    `,
    [slug],
  );

  return rows[0] ? mapAssetRow(rows[0]) : null;
}

export async function getAssetById(id: number): Promise<AssetRow | null> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, slug, filename, mime_type, size, created_at
      FROM assets
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapAssetRow(rows[0]) : null;
}

export async function createAsset(
  slug: string,
  filename: string,
  mimeType: string,
  size: number,
): Promise<AssetRow> {
  const pool = await ensureReadyPool();

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO assets (slug, filename, mime_type, size)
      VALUES (?, ?, ?, ?)
    `,
    [slug, filename, mimeType, size],
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, slug, filename, mime_type, size, created_at
      FROM assets
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId],
  );

  return mapAssetRow(rows[0]);
}

export async function updateAssetSlug(id: number, newSlug: string): Promise<AssetRow | null> {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      UPDATE assets
      SET slug = ?
      WHERE id = ?
    `,
    [newSlug, id],
  );

  return getAssetById(id);
}

export async function deleteAsset(id: number): Promise<void> {
  const pool = await ensureReadyPool();

  await pool.query(
    `
      DELETE FROM assets
      WHERE id = ?
    `,
    [id],
  );
}

export async function assetSlugExists(slug: string, excludeId?: number): Promise<boolean> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    excludeId !== undefined
      ? `
          SELECT 1
          FROM assets
          WHERE slug = ? AND id != ?
          LIMIT 1
        `
      : `
          SELECT 1
          FROM assets
          WHERE slug = ?
          LIMIT 1
        `,
    excludeId !== undefined ? [slug, excludeId] : [slug],
  );

  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Views
// ---------------------------------------------------------------------------

/**
 * Records a view for a post. Silently ignores duplicate fingerprints (UNIQUE
 * constraint). Returns true if this was a new unique view.
 */
export async function recordView(slug: string, fingerprint: string): Promise<boolean> {
  const pool = await ensureReadyPool();

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT IGNORE INTO post_views (slug, fingerprint)
      VALUES (?, ?)
    `,
    [slug, fingerprint],
  );

  return result.affectedRows > 0;
}

export async function getViewCount(slug: string): Promise<number> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT COUNT(*) AS c
      FROM post_views
      WHERE slug = ?
    `,
    [slug],
  );

  return Number(rows[0]?.c ?? 0);
}

// ---------------------------------------------------------------------------
// Reactions
// ---------------------------------------------------------------------------

/**
 * Toggles a reaction: adds it if absent, removes it if already present.
 * Returns the new toggled state and the full updated counts.
 */
export async function toggleReaction(
  slug: string,
  emoji: string,
  fingerprint: string,
): Promise<{ added: boolean; counts: Record<string, number> }> {
  const pool = await ensureReadyPool();

  const [existingRows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id
      FROM post_reactions
      WHERE slug = ? AND emoji = ? AND fingerprint = ?
      LIMIT 1
    `,
    [slug, emoji, fingerprint],
  );

  const existing = existingRows[0];

  if (existing) {
    await pool.query(
      `
        DELETE FROM post_reactions
        WHERE slug = ? AND emoji = ? AND fingerprint = ?
      `,
      [slug, emoji, fingerprint],
    );
  } else {
    await pool.query(
      `
        INSERT IGNORE INTO post_reactions (slug, emoji, fingerprint)
        VALUES (?, ?, ?)
      `,
      [slug, emoji, fingerprint],
    );
  }

  return { added: !existing, counts: await getReactionCounts(slug) };
}

export async function getReactionCounts(slug: string): Promise<Record<string, number>> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<MysqlReactionRow[]>(
    `
      SELECT emoji, COUNT(*) AS c
      FROM post_reactions
      WHERE slug = ?
      GROUP BY emoji
    `,
    [slug],
  );

  const counts: Record<string, number> = {};

  for (const emoji of REACTIONS) {
    counts[emoji] = 0;
  }

  for (const row of rows) {
    counts[row.emoji] = row.c;
  }

  return counts;
}

/**
 * Returns which emojis a given fingerprint has already reacted with.
 */
export async function getMyReactions(slug: string, fingerprint: string): Promise<string[]> {
  const pool = await ensureReadyPool();

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT emoji
      FROM post_reactions
      WHERE slug = ? AND fingerprint = ?
    `,
    [slug, fingerprint],
  );

  return rows.map((row) => String(row.emoji));
}

export async function getPostStats(
  slug: string,
  fingerprint?: string,
): Promise<PostStatsRow & { myReactions: string[] }> {
  const reactionCounts = await getReactionCounts(slug);

  return {
    slug,
    views: await getViewCount(slug),
    reactions: reactionCounts as Record<Reaction, number>,
    myReactions: fingerprint ? await getMyReactions(slug, fingerprint) : [],
  };
}
