import { DatabaseSync } from "node:sqlite";
import path from "node:path";

// Initialize the SQLite database
const DB_PATH = path.join(process.cwd(), "wuwa_convene.db");

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  dbInstance = new DatabaseSync(DB_PATH);

  // Enable WAL mode and pragmas for performance
  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA synchronous = NORMAL;");

  // Initialize schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      astrite INTEGER NOT NULL DEFAULT 16000,
      radiant_tide INTEGER NOT NULL DEFAULT 20,
      forging_tide INTEGER NOT NULL DEFAULT 20,
      lustrous_tide INTEGER NOT NULL DEFAULT 20,
      afterglow_coral INTEGER NOT NULL DEFAULT 45,
      oscillated_coral INTEGER NOT NULL DEFAULT 320,
      is_sandbox INTEGER NOT NULL DEFAULT 0,
      selected_limited_char TEXT NOT NULL DEFAULT 'shorekeeper'
    );

    CREATE TABLE IF NOT EXISTS pity_state (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      banner_type TEXT NOT NULL,
      pity_5_star INTEGER NOT NULL DEFAULT 0,
      pity_4_star INTEGER NOT NULL DEFAULT 0,
      guaranteed_limited INTEGER NOT NULL DEFAULT 0,
      guaranteed_featured_4_star INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, banner_type)
    );

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      banner_type TEXT NOT NULL,
      banner_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      item_type TEXT NOT NULL,
      rarity INTEGER NOT NULL,
      pity_count INTEGER NOT NULL,
      is_guaranteed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      user_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      first_obtained_at TEXT NOT NULL,
      PRIMARY KEY(user_id, item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_history_user_banner ON history(user_id, banner_type, created_at DESC);
  `);

  // Ensure default user exists
  const existingUser = dbInstance.prepare("SELECT id FROM users WHERE id = ?").get("default_rover");
  if (!existingUser) {
    dbInstance.prepare(`
      INSERT INTO users (id, astrite, radiant_tide, forging_tide, lustrous_tide, afterglow_coral, oscillated_coral, is_sandbox, selected_limited_char)
      VALUES (?, 16000, 20, 20, 20, 45, 320, 0, 'shorekeeper')
    `).run("default_rover");

    const banners = ["character_limited", "weapon_limited", "character_standard", "weapon_standard", "beginner"];
    for (const b of banners) {
      dbInstance.prepare(`
        INSERT INTO pity_state (id, user_id, banner_type, pity_5_star, pity_4_star, guaranteed_limited, guaranteed_featured_4_star)
        VALUES (?, ?, ?, 0, 0, 0, 0)
      `).run(`${b}_default_rover`, "default_rover", b);
    }
  }

  return dbInstance;
}
