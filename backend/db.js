// db.js — SQLite setup + schema + demo seed
import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = new Database(join(__dirname, 'krishisetu.db'))
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('farmer','b2b','b2c')),
  org TEXT,
  -- B2B business profile fields
  business_name TEXT DEFAULT '',
  rep_name TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  gst TEXT DEFAULT '',
  address TEXT DEFAULT '',
  bank_account TEXT DEFAULT '',
  bank_ifsc TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  auth_doc_url TEXT DEFAULT '',     -- Supabase Storage path for uploaded auth doc
  b2b_approved INTEGER NOT NULL DEFAULT 0,  -- admin approval flag
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  farmer_id INTEGER NOT NULL,
  crop TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'Quintal',
  price REAL NOT NULL,
  -- dual pricing
  bulk_price REAL DEFAULT 0,       -- bulk order price (B2B)
  retail_price REAL DEFAULT 0,    -- per-kg min price for small orders (B2C)
  min_qty REAL NOT NULL DEFAULT 5, -- minimum order quantity (kg)
  availability TEXT NOT NULL DEFAULT 'Available Now',
  harvest_date TEXT DEFAULT '',
  pickup TEXT NOT NULL DEFAULT 'Farm-Gate Pickup',
  grade TEXT DEFAULT 'A',
  moisture TEXT DEFAULT '12%',
  status TEXT NOT NULL DEFAULT 'Listed',
  bids INTEGER NOT NULL DEFAULT 0,
  seller TEXT,
  farm_place TEXT DEFAULT 'Nashik, Maharashtra',
  farm_lat REAL DEFAULT 19.9975,
  farm_lng REAL DEFAULT 73.7898,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (farmer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  buyer_type TEXT NOT NULL,
  qty REAL NOT NULL,
  unit TEXT,
  amount REAL NOT NULL,
  gst REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Order Placed',
  dest_place TEXT DEFAULT 'Pune, Maharashtra',
  dest_lat REAL DEFAULT 18.5204,
  dest_lng REAL DEFAULT 73.8567,
  ship_status TEXT DEFAULT 'Preparing',
  live_lat REAL DEFAULT NULL,   -- real-time driver GPS (shared via browser geolocation)
  live_lng REAL DEFAULT NULL,
  gps_updated_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  role TEXT NOT NULL DEFAULT 'farmer',
  text TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  user_id INTEGER,
  user_role TEXT DEFAULT '',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Open',   -- Open | Resolved
  admin_reply TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`)

// ---- Lightweight migrations for existing DBs (add new columns if missing) ----
function addColumn(table, col, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === col)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`)
    console.log(`[db] migrated: ${table}.${col}`)
  }
}
addColumn('users', 'city', "TEXT DEFAULT ''")
addColumn('users', 'lat', 'REAL')
addColumn('users', 'lng', 'REAL')
addColumn('listings', 'farm_place', "TEXT DEFAULT 'Nashik, Maharashtra'")
addColumn('listings', 'farm_lat', 'REAL DEFAULT 19.9975')
addColumn('listings', 'farm_lng', 'REAL DEFAULT 73.7898')
addColumn('listings', 'photo', "TEXT DEFAULT ''")
addColumn('orders', 'dest_place', "TEXT DEFAULT 'Pune, Maharashtra'")
addColumn('orders', 'dest_lat', 'REAL DEFAULT 18.5204')
addColumn('orders', 'dest_lng', 'REAL DEFAULT 73.8567')
addColumn('orders', 'ship_status', "TEXT DEFAULT 'Preparing'")
addColumn('orders', 'live_lat', 'REAL DEFAULT NULL')
addColumn('orders', 'live_lng', 'REAL DEFAULT NULL')
addColumn('orders', 'gps_updated_at', "TEXT DEFAULT NULL")
addColumn('orders', 'buyer_lat', 'REAL DEFAULT NULL')
addColumn('orders', 'buyer_lng', 'REAL DEFAULT NULL')
addColumn('orders', 'buyer_gps_at', "TEXT DEFAULT NULL")
addColumn('orders', 'shipping', 'REAL DEFAULT 0')
addColumn('users', 'business_name', "TEXT DEFAULT ''")
addColumn('users', 'rep_name', "TEXT DEFAULT ''")
addColumn('users', 'contact', "TEXT DEFAULT ''")
addColumn('users', 'gst', "TEXT DEFAULT ''")
addColumn('users', 'address', "TEXT DEFAULT ''")
addColumn('users', 'bank_account', "TEXT DEFAULT ''")
addColumn('users', 'bank_ifsc', "TEXT DEFAULT ''")
addColumn('users', 'bank_name', "TEXT DEFAULT ''")
addColumn('users', 'auth_doc_url', "TEXT DEFAULT ''")
addColumn('users', 'b2b_approved', 'INTEGER NOT NULL DEFAULT 0')
addColumn('listings', 'bulk_price', 'REAL DEFAULT 0')
addColumn('listings', 'retail_price', 'REAL DEFAULT 0')
addColumn('listings', 'min_qty', 'REAL NOT NULL DEFAULT 5')

// ---- Seed demo data once (so B2B/B2C portals aren't empty on first run) ----
const seeded = db.prepare('SELECT COUNT(*) AS n FROM users').get().n
if (seeded === 0) {
  const hash = bcrypt.hashSync('demo1234', 10)
  const insUser = db.prepare(
    'INSERT INTO users (name,email,password_hash,role,org) VALUES (?,?,?,?,?)'
  )
  const ramesh = insUser.run('Ramesh Kumar', 'ramesh@demo.in', hash, 'farmer', 'Nashik FPO').lastInsertRowid
  insUser.run('Suresh Patil', 'suresh@demo.in', hash, 'farmer', 'Lasalgaon FPO')
  insUser.run('Agro Mills Pvt Ltd', 'buyer@demo.in', hash, 'b2b', 'Pune')
  insUser.run('Anita Sharma', 'anita@demo.in', hash, 'b2c', null)

  const insListing = db.prepare(`INSERT INTO listings
    (farmer_id,crop,qty,unit,price,availability,harvest_date,pickup,grade,moisture,status,bids,seller)
    VALUES (@farmer_id,@crop,@qty,@unit,@price,@availability,@harvest_date,@pickup,@grade,@moisture,@status,@bids,@seller)`)

  insListing.run({
    farmer_id: ramesh, crop: 'Tamatar', qty: 50, unit: 'Quintal', price: 1800,
    availability: 'Available Now', harvest_date: '', pickup: 'Farm-Gate Pickup',
    grade: 'A', moisture: '12%', status: 'Listed', bids: 3, seller: 'Ramesh Kumar (Nashik FPO)',
  })
  insListing.run({
    farmer_id: ramesh, crop: 'Aloo', qty: 120, unit: 'Quintal', price: 1100,
    availability: 'Pre-Order', harvest_date: '2026-09-04', pickup: 'FPO Hub Drop-off',
    grade: 'B', moisture: '14%', status: 'Listed', bids: 1, seller: 'Suresh Patil (Lasalgaon FPO)',
  })

  db.prepare('INSERT INTO notifications (user_id,role,text) VALUES (?,?,?)')
    .run(ramesh, 'farmer', 'Welcome to KrishiSetu — apni pehli fasal list karein.')
  console.log('[db] seeded demo users + listings (login: ramesh@demo.in / demo1234)')
}

export default db
