import Database from "better-sqlite3";
const bcrypt = require("bcryptjs");
const betterSqlite3 = require("better-sqlite3");

export function createDatabase(path: string) {
  const db = betterSqlite3(path, { readonly: false }) as any;

  // Enable WAL mode for better concurrent performance
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  // Create indexes for frequently queried columns
  db.pragma("create_index if not exists idx_users_account_id on users(account_id)");
  db.pragma("create_index if not exists idx_users_username on users(username)");
  db.pragma("create_index if not exists idx_users_email on users(email)");
  db.pragma("create_index if not exists idx_profiles_account_id on profiles(account_id)");
  db.pragma("create_index if not exists idx_mm_tickets_account_id on mm_tickets(account_id)");

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      last_login INTEGER,
      is_banned INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0
    )
  `);

  // Profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_id TEXT UNIQUE NOT NULL,
      data TEXT DEFAULT '{}',
      last_modified INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Matchmaking tickets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mm_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id TEXT NOT NULL,
      ticket_data TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Shop inventory rotation table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_rotation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season INTEGER NOT NULL,
      items TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  // Pre-compiled statements for frequently used queries
  const getUserByAccountId = db.prepare("SELECT * FROM users WHERE account_id = ?");
  const getUserById = db.prepare("SELECT * FROM users WHERE id = ?");
  const createUserStmt = db.prepare("INSERT INTO users (account_id, username, email, password_hash) VALUES (?, ?, ?, ?)");
  const updateUserLastLoginStmt = db.prepare("UPDATE users SET last_login = unixepoch() WHERE id = ?");

  // Profiles operations
  const getProfileByAccountId = db.prepare("SELECT * FROM profiles WHERE account_id = ?");
  const createProfileStmt = db.prepare("INSERT INTO profiles (account_id, data) VALUES (?, ?)");
  const updateProfileStmt = db.prepare("UPDATE profiles SET data = ?, last_modified = unixepoch() WHERE account_id = ?");

  // Matchmaking tickets operations
  const createMMTicketStmt = db.prepare("INSERT INTO mm_tickets (account_id, ticket_data) VALUES (?, ?)");
  const getMMTicketByAccountId = db.prepare("SELECT * FROM mm_tickets WHERE account_id = ?");
  const updateMMTicketStatusStmt = db.prepare("UPDATE mm_tickets SET status = ?, updated_at = unixepoch() WHERE id = ?");

  // Shop rotation operations
  const setShopRotationStmt = db.prepare("INSERT OR REPLACE INTO shop_rotation (season, items, updated_at) VALUES (?, ?, unixepoch())");
  const getShopRotationStmt = db.prepare("SELECT items FROM shop_rotation WHERE season = ?");

  // Return database instance with helpful methods
  return {
    db,
    // Users operations
    getUserByAccountId: (accountId: string) => getUserByAccountId.get(accountId),
    getUserById: (id: number) => getUserById.get(id),
    createUser: (accountId: string, username: string, email: string, passwordHash: string) =>
      createUserStmt.run(accountId, username, email, passwordHash),
    updateUserLastLogin: (id: number) => updateUserLastLoginStmt.run(id),

    // Profiles operations
    getProfileByAccountId: (accountId: string) => getProfileByAccountId.get(accountId),
    createProfile: (accountId: string, data: string) => createProfileStmt.run(accountId, data),
    updateProfile: (accountId: string, data: string) => updateProfileStmt.run(data, accountId),

    // Matchmaking tickets operations
    createMMTicket: (accountId: string, ticketData: string) => createMMTicketStmt.run(accountId, ticketData),
    getMMTicket: (accountId: string) => getMMTicketByAccountId.get(accountId),
    getMMTicketsByAccountId: (accountId: string) => getMMTicketByAccountId.all(accountId),
    updateMMTicketStatus: (id: string, status: string) => updateMMTicketStatusStmt.run(status, id),

    // Shop rotation operations
    setShopRotation: (season: number, items: string) => setShopRotationStmt.run(season, items),
    getShopRotation: (season: number) => getShopRotationStmt.get(season),

    // Close database
    close: () => db.close()
  };
}