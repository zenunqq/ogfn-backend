"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabase = createDatabase;
const betterSqlite3 = require("better-sqlite3");
function createDatabase(path) {
    const db = betterSqlite3(path, { readonly: false });
    // Enable WAL mode for better concurrent performance
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
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
    // Return database instance with helpful methods
    return {
        db,
        // Users operations
        getUserByAccountId: (accountId) => db.prepare("SELECT * FROM users WHERE account_id = ?").get(accountId),
        getUserById: (id) => db.prepare("SELECT * FROM users WHERE id = ?").get(id),
        createUser: (accountId, username, email, passwordHash) => db.prepare("INSERT INTO users (account_id, username, email, password_hash) VALUES (?, ?, ?, ?)").run(accountId, username, email, passwordHash),
        updateUserLastLogin: (id) => db.prepare("UPDATE users SET last_login = unixepoch() WHERE id = ?").run(id),
        // Profiles operations
        getProfileByAccountId: (accountId) => db.prepare("SELECT * FROM profiles WHERE account_id = ?").get(accountId),
        createProfile: (accountId, data) => db.prepare("INSERT INTO profiles (account_id, data) VALUES (?, ?)").run(accountId, data),
        updateProfile: (accountId, data) => db.prepare("UPDATE profiles SET data = ?, last_modified = unixepoch() WHERE account_id = ?").run(data, accountId),
        // Matchmaking tickets operations
        createMMTicket: (accountId, ticketData) => db.prepare("INSERT INTO mm_tickets (account_id, ticket_data) VALUES (?, ?)").run(accountId, ticketData),
        getMMTicket: (ticketId) => db.prepare("SELECT * FROM mm_tickets WHERE ticket_data = ?").get(ticketId),
        updateMMTicketStatus: (ticketId, status) => db.prepare("UPDATE mm_tickets SET status = ?, updated_at = unixepoch() WHERE ticket_data = ?").run(status, ticketId),
        // Shop rotation operations
        setShopRotation: (season, items) => db.prepare("INSERT OR REPLACE INTO shop_rotation (season, items, updated_at) VALUES (?, ?, unixepoch())").run(season, items),
        getShopRotation: (season) => db.prepare("SELECT items FROM shop_rotation WHERE season = ?").get(season),
        // Close database
        close: () => db.close()
    };
}
