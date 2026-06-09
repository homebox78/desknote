// D-Note — Rust backend
// All persistence and file I/O happens locally. No code path here performs a
// network request, which together with the strict CSP guarantees offline-only
// operation.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;
use serde::Serialize;
use serde_json::Value as Json;
use tauri::{Emitter, Manager};

const IDENTIFIER: &str = "com.desknote.app";

/// The open, key-injected SQLCipher connection. `None` until `db_open` succeeds
/// (i.e. until the master password has unlocked the database). Every query from
/// the frontend goes through this single connection.
struct Db(Mutex<Option<Connection>>);

/// Tamper-evident transparency log of every outbound network request the app
/// has ever made. The WebView is sealed by CSP `connect-src 'none'`, so the only
/// possible egress is the opt-in Notion upload, which records here. A persisted
/// cumulative count lets the UI honestly show "외부 통신 N건".
#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
struct NetEntry {
    ts: i64, // unix milliseconds
    host: String,
    detail: String,
}

#[derive(serde::Serialize, serde::Deserialize, Default, Clone)]
struct NetState {
    count: u64,
    entries: Vec<NetEntry>,
}

struct NetLog(Mutex<NetState>);

/// Holds a file path passed on the command line (Explorer "Send to D-Note"),
/// consumed once by the frontend after unlock.
struct PendingFile(Mutex<Option<String>>);

/// Fixed config base (%APPDATA%\com.desknote.app) — holds the data-location
/// pointer even when the actual data lives elsewhere.
fn config_base() -> PathBuf {
    std::env::var("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_default()
        .join(IDENTIFIER)
}

fn pointer_path() -> PathBuf {
    config_base().join("data_location.txt")
}

/// The active data root: a user-chosen folder if set & valid, else the default.
fn current_root() -> PathBuf {
    if let Ok(s) = fs::read_to_string(pointer_path()) {
        let p = PathBuf::from(s.trim());
        if p.is_dir() {
            return p;
        }
    }
    config_base()
}

/// On-disk path of the SQLite database inside the active data root. Matches the
/// location the old tauri-plugin-sql connection string ("sqlite:desknote.db")
/// resolved to, so existing installs are picked up and migrated in place.
fn db_path() -> PathBuf {
    current_root().join("desknote.db")
}

fn copy_dir(src: &Path, dst: &Path) -> std::io::Result<()> {
    if !src.exists() {
        return Ok(());
    }
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let p = entry.path();
        let d = dst.join(entry.file_name());
        if p.is_dir() {
            copy_dir(&p, &d)?;
        } else {
            fs::copy(&p, &d)?;
        }
    }
    Ok(())
}

/// Ensure the per-user app data directory exists and report whether the
/// Stronghold vault has been created yet (i.e. whether this is a first run).
#[derive(Serialize)]
struct VaultStatus {
    path: String,
    exists: bool,
}

#[tauri::command]
fn vault_status() -> Result<VaultStatus, String> {
    let dir = current_root();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let vault = dir.join("vault.hold");
    Ok(VaultStatus {
        exists: vault.exists(),
        path: vault.to_string_lossy().to_string(),
    })
}

/// Save an uploaded image/attachment into the local `assets` folder and return
/// its absolute path. The frontend turns this into an `asset://` URL with
/// `convertFileSrc`. Bytes never leave the machine.
#[tauri::command]
fn save_asset(name: String, bytes: Vec<u8>) -> Result<String, String> {
    let dir: PathBuf = current_root().join("assets");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let ext = name
        .rsplit('.')
        .next()
        .filter(|e| e.len() <= 5 && !e.is_empty())
        .unwrap_or("png");
    let path = dir.join(format!("{id}.{ext}"));
    fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

/// Write a UTF-8 text file to a user-chosen path (used by Markdown/HTML export).
/// Writing in Rust keeps the fs-plugin scope closed for the WebView.
#[tauri::command]
fn save_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Write raw bytes to a user-chosen path (used by PDF export).
#[tauri::command]
fn save_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(&path, bytes).map_err(|e| e.to_string())
}

/// Read a UTF-8 text file from a user-chosen path (Markdown / CSV import).
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Read raw bytes from a user-chosen path (DOCX import).
#[tauri::command]
fn read_file_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| e.to_string())
}

/// Copy the SQLite database to backups/desknote-<label>.db inside app data.
/// The date label is supplied by the frontend. Returns the backup path.
#[tauri::command]
fn backup_db(label: String) -> Result<String, String> {
    let base = current_root();
    let src = base.join("desknote.db");
    if !src.exists() {
        return Err("database file not found".into());
    }
    let dir = base.join("backups");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let safe: String = label
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    let dest = dir.join(format!("desknote-{safe}.db"));
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().to_string())
}

/// Return and clear any file path queued from the command line / Explorer.
#[tauri::command]
fn take_startup_file(state: tauri::State<PendingFile>) -> Option<String> {
    state.0.lock().ok().and_then(|mut g| g.take())
}

fn dnote_command() -> Result<String, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    Ok(format!("\"{}\" \"%1\"", exe.display()))
}

/// Add the "D-Note로 보내기" entry to the Explorer right-click menu for all
/// files (HKCU — no admin needed). Points to the current executable.
#[tauri::command]
fn register_shell_menu() -> Result<(), String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe.display().to_string();
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (verb, _) = hkcu
        .create_subkey(r"Software\Classes\*\shell\DNoteSendTo")
        .map_err(|e| e.to_string())?;
    verb.set_value("", &"D-Note로 보내기".to_string())
        .map_err(|e| e.to_string())?;
    verb.set_value("Icon", &exe_str).map_err(|e| e.to_string())?;
    let (cmd, _) = hkcu
        .create_subkey(r"Software\Classes\*\shell\DNoteSendTo\command")
        .map_err(|e| e.to_string())?;
    cmd.set_value("", &dnote_command()?).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn unregister_shell_menu() -> Result<(), String> {
    use winreg::enums::HKEY_CURRENT_USER;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.delete_subkey_all(r"Software\Classes\*\shell\DNoteSendTo")
        .map_err(|e| e.to_string())
}

// ── Encrypted database (SQLCipher) ──────────────────────────────────────────

/// Derive a 32-byte raw key from the master password with Argon2id, using the
/// same fixed salt as the Stronghold vault. Returned as lowercase hex so it can
/// be handed to SQLCipher via `PRAGMA key = "x'…'"` (raw-key form, which skips
/// SQLCipher's own KDF since we already ran a strong one).
fn derive_key_hex(password: &str) -> Result<String, String> {
    use argon2::{
        password_hash::{PasswordHasher, SaltString},
        Argon2,
    };
    let salt = SaltString::from_b64("ZGVza25vdGUtc2FsdA").map_err(|e| e.to_string())?;
    let hash = Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;
    let bytes = hash.hash.ok_or("key derivation produced no output")?;
    Ok(bytes.as_bytes().iter().map(|b| format!("{b:02x}")).collect())
}

/// Apply the schema. Idempotent via `PRAGMA user_version`: each migration runs
/// once, in order. A fresh database starts at version 0 and ends at 4.
fn apply_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    let v: i64 = conn.query_row("PRAGMA user_version", [], |r| r.get(0))?;
    if v < 1 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS pages (
                id          TEXT PRIMARY KEY,
                parent_id   TEXT,
                title       TEXT NOT NULL DEFAULT '',
                icon        TEXT DEFAULT '📄',
                sort_order  INTEGER DEFAULT 0,
                is_favorite INTEGER DEFAULT 0,
                is_trashed  INTEGER DEFAULT 0,
                created_at  TEXT DEFAULT (datetime('now')),
                updated_at  TEXT DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS page_content (
                page_id TEXT PRIMARY KEY,
                content TEXT NOT NULL DEFAULT '[]'
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts
                USING fts5(page_id UNINDEXED, title, body);
            CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);",
        )?;
    }
    if v < 2 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS db_tables (
                id      TEXT PRIMARY KEY,
                page_id TEXT,
                name    TEXT DEFAULT '표',
                view    TEXT DEFAULT 'table'
            );
            CREATE TABLE IF NOT EXISTS db_columns (
                id         TEXT PRIMARY KEY,
                table_id   TEXT,
                name       TEXT,
                type       TEXT DEFAULT 'text',
                sort_order INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS db_rows (
                id         TEXT PRIMARY KEY,
                table_id   TEXT,
                data       TEXT DEFAULT '{}',
                sort_order INTEGER DEFAULT 0
            );",
        )?;
    }
    if v < 3 {
        // ALTER ADD COLUMN is not IF-NOT-EXISTS; tolerate a re-add if the column
        // already exists (e.g. an older partial schema).
        let _ = conn.execute_batch("ALTER TABLE pages ADD COLUMN type TEXT DEFAULT 'doc';");
        let _ = conn.execute_batch("ALTER TABLE db_columns ADD COLUMN config TEXT DEFAULT '{}';");
        conn.execute_batch(
            "CREATE INDEX IF NOT EXISTS idx_rows_table ON db_rows(table_id);
            CREATE INDEX IF NOT EXISTS idx_cols_table ON db_columns(table_id);
            CREATE INDEX IF NOT EXISTS idx_tables_page ON db_tables(page_id);
            CREATE TABLE IF NOT EXISTS page_versions (
                id         TEXT PRIMARY KEY,
                page_id    TEXT,
                content    TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_versions_page ON page_versions(page_id);",
        )?;
    }
    if v < 4 {
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS stickies (
                page_id    TEXT PRIMARY KEY,
                x          INTEGER,
                y          INTEGER,
                w          INTEGER DEFAULT 300,
                h          INTEGER DEFAULT 340,
                color      TEXT DEFAULT '#fff8b8',
                is_open    INTEGER DEFAULT 1,
                updated_at TEXT DEFAULT (datetime('now'))
            );",
        )?;
    }
    conn.execute_batch("PRAGMA user_version = 4;")?;
    Ok(())
}

/// True if `path` is a readable *plaintext* SQLite database (i.e. a pre-encryption
/// install): it opens and queries without any key.
fn is_plaintext_db(path: &Path) -> bool {
    match Connection::open(path) {
        Ok(c) => c
            .query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0))
            .is_ok(),
        Err(_) => false,
    }
}

/// One-time migration of a legacy plaintext database into an encrypted one,
/// in place. Uses SQLCipher's `sqlcipher_export` to copy every table into a new
/// keyed database, then atomically replaces the original file.
fn encrypt_existing_db(path: &Path, key_hex: &str) -> Result<(), String> {
    let tmp = path.with_extension("db.enc-tmp");
    if tmp.exists() {
        fs::remove_file(&tmp).map_err(|e| e.to_string())?;
    }
    let conn = Connection::open(path).map_err(|e| e.to_string())?;
    let tmp_str = tmp.to_string_lossy().replace('\'', "''");
    conn.execute_batch(&format!(
        "ATTACH DATABASE '{tmp_str}' AS encrypted KEY \"x'{key_hex}'\";
         SELECT sqlcipher_export('encrypted');
         DETACH DATABASE encrypted;"
    ))
    .map_err(|e| e.to_string())?;
    drop(conn);
    // The exported copy already carries the full v4 schema from the old install.
    {
        let enc = Connection::open(&tmp).map_err(|e| e.to_string())?;
        enc.execute_batch(&format!("PRAGMA key = \"x'{key_hex}'\"; PRAGMA user_version = 4;"))
            .map_err(|e| e.to_string())?;
    }
    fs::remove_file(path).map_err(|e| e.to_string())?;
    // Drop any orphaned WAL/SHM sidecars from the old plaintext database so they
    // can't shadow the new encrypted file.
    for ext in ["db-wal", "db-shm"] {
        let side = path.with_extension(ext);
        if side.exists() {
            let _ = fs::remove_file(&side);
        }
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

/// Unlock and open the encrypted database with the master password. Migrates a
/// legacy plaintext database to SQLCipher on first run after upgrade. A wrong
/// password yields a key that cannot read the database, so this returns an error
/// — that failure IS the access gate for the data itself (not just the UI).
#[tauri::command]
fn db_open(password: String, state: tauri::State<Db>) -> Result<(), String> {
    let key_hex = derive_key_hex(&password)?;
    let path = db_path();
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    // Transparently upgrade a pre-encryption install.
    if path.exists() && is_plaintext_db(&path) {
        encrypt_existing_db(&path, &key_hex)?;
    }
    let conn = Connection::open(&path).map_err(|e| e.to_string())?;
    conn.execute_batch(&format!("PRAGMA key = \"x'{key_hex}'\";"))
        .map_err(|e| e.to_string())?;
    // Verify the key actually opens the database (wrong password fails here).
    conn.query_row("SELECT count(*) FROM sqlite_master", [], |r| r.get::<_, i64>(0))
        .map_err(|_| "비밀번호가 올바르지 않습니다".to_string())?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| e.to_string())?;
    apply_migrations(&conn).map_err(|e| e.to_string())?;
    *state.0.lock().map_err(|e| e.to_string())? = Some(conn);
    Ok(())
}

/// Lock the database: drop the in-memory connection and its key material.
#[tauri::command]
fn db_close(state: tauri::State<Db>) {
    if let Ok(mut g) = state.0.lock() {
        *g = None;
    }
}

/// Convert a JSON parameter from the frontend into a SQLite-bindable value.
fn json_to_sql(v: &Json) -> rusqlite::types::Value {
    use rusqlite::types::Value as V;
    match v {
        Json::Null => V::Null,
        Json::Bool(b) => V::Integer(*b as i64),
        Json::Number(n) => {
            if let Some(i) = n.as_i64() {
                V::Integer(i)
            } else {
                V::Real(n.as_f64().unwrap_or(0.0))
            }
        }
        Json::String(s) => V::Text(s.clone()),
        // Arrays/objects are stored as their JSON text (the frontend already
        // JSON-stringifies structured columns, so this is rarely hit).
        other => V::Text(other.to_string()),
    }
}

fn sql_to_json(v: rusqlite::types::ValueRef) -> Json {
    use rusqlite::types::ValueRef as V;
    match v {
        V::Null => Json::Null,
        V::Integer(i) => Json::from(i),
        V::Real(f) => Json::from(f),
        V::Text(t) => Json::String(String::from_utf8_lossy(t).into_owned()),
        V::Blob(b) => Json::from(b.to_vec()),
    }
}

/// Run a SELECT and return rows as objects (column name → value), matching the
/// shape the old `Database.select()` returned.
#[tauri::command]
fn db_select(
    sql: String,
    params: Vec<Json>,
    state: tauri::State<Db>,
) -> Result<Vec<serde_json::Map<String, Json>>, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("database is locked")?;
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let cols: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let binds: Vec<rusqlite::types::Value> = params.iter().map(json_to_sql).collect();
    let mut rows = stmt
        .query(rusqlite::params_from_iter(binds))
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let mut obj = serde_json::Map::new();
        for (i, name) in cols.iter().enumerate() {
            let vr = row.get_ref(i).map_err(|e| e.to_string())?;
            obj.insert(name.clone(), sql_to_json(vr));
        }
        out.push(obj);
    }
    Ok(out)
}

/// Run an INSERT/UPDATE/DELETE/DDL statement; returns affected row count.
#[tauri::command]
fn db_execute(sql: String, params: Vec<Json>, state: tauri::State<Db>) -> Result<usize, String> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let conn = guard.as_ref().ok_or("database is locked")?;
    let binds: Vec<rusqlite::types::Value> = params.iter().map(json_to_sql).collect();
    conn.execute(&sql, rusqlite::params_from_iter(binds))
        .map_err(|e| e.to_string())
}

// ── Network transparency log ────────────────────────────────────────────────

fn net_path() -> PathBuf {
    current_root().join("network-log.json")
}

/// Load the persisted egress log from disk (empty if none yet).
fn load_net_state() -> NetState {
    fs::read_to_string(net_path())
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn now_millis() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

/// Return the cumulative outbound-request count and the most recent entries.
#[tauri::command]
fn net_status(state: tauri::State<NetLog>) -> Result<NetState, String> {
    Ok(state.0.lock().map_err(|e| e.to_string())?.clone())
}

/// Record one outbound request. Called from the single egress chokepoint
/// (Notion fetch). Persists immediately and notifies the UI.
#[tauri::command]
fn net_record(
    host: String,
    detail: String,
    app: tauri::AppHandle,
    state: tauri::State<NetLog>,
) -> Result<NetState, String> {
    let snapshot = {
        let mut g = state.0.lock().map_err(|e| e.to_string())?;
        g.count += 1;
        g.entries.push(NetEntry {
            ts: now_millis(),
            host,
            detail,
        });
        // Keep only the most recent 100 entries; count stays cumulative.
        let len = g.entries.len();
        if len > 100 {
            g.entries.drain(0..len - 100);
        }
        g.clone()
    };
    if let Some(dir) = net_path().parent() {
        let _ = fs::create_dir_all(dir);
    }
    if let Ok(json) = serde_json::to_string_pretty(&snapshot) {
        let _ = fs::write(net_path(), json);
    }
    let _ = app.emit("net-changed", &snapshot);
    Ok(snapshot)
}

#[tauri::command]
fn get_data_dir() -> String {
    current_root().to_string_lossy().to_string()
}

/// Point the app at a new data folder. If the target already holds a
/// desknote.db it is adopted as-is; otherwise the current data is copied in.
/// Takes effect after a restart.
#[tauri::command]
fn set_data_dir(path: String) -> Result<(), String> {
    let target = PathBuf::from(path.trim());
    if target.as_os_str().is_empty() {
        return Err("경로가 비어 있습니다".into());
    }
    fs::create_dir_all(&target).map_err(|e| e.to_string())?;
    let src = current_root();
    if src == target {
        return Ok(());
    }
    if !target.join("desknote.db").exists() {
        for f in ["desknote.db", "vault.hold"] {
            let s = src.join(f);
            if s.exists() {
                fs::copy(&s, target.join(f)).map_err(|e| e.to_string())?;
            }
        }
        copy_dir(&src.join("assets"), &target.join("assets")).map_err(|e| e.to_string())?;
        copy_dir(&src.join("backups"), &target.join("backups")).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(config_base()).map_err(|e| e.to_string())?;
    fs::write(pointer_path(), target.to_string_lossy().as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// Revert to the default data folder (removes the pointer). Existing data in
/// the custom folder is left in place.
#[tauri::command]
fn reset_data_dir() -> Result<(), String> {
    let p = pointer_path();
    if p.exists() {
        fs::remove_file(&p).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn restart_app(app: tauri::AppHandle) {
    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_arg = std::env::args().nth(1).filter(|a| !a.starts_with('-'));

    tauri::Builder::default()
        // Single instance must be registered first: a second launch (e.g. from
        // the Explorer menu) forwards its file argument to the running window.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = argv.get(1).cloned() {
                if let Some(state) = app.try_state::<PendingFile>() {
                    if let Ok(mut g) = state.0.lock() {
                        *g = Some(path.clone());
                    }
                }
                let _ = app.emit("open-file", path);
            }
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_focus();
            }
        }))
        .manage(PendingFile(Mutex::new(startup_arg)))
        .manage(Db(Mutex::new(None)))
        .manage(NetLog(Mutex::new(load_net_state())))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        // Password → 32-byte key via Argon2id. Stronghold protects the master
        // key in an encrypted snapshot; a wrong password fails to decrypt it.
        // The same derivation also keys the SQLCipher database (see db_open).
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use argon2::{
                    password_hash::{PasswordHasher, SaltString},
                    Argon2,
                };
                let salt = SaltString::from_b64("ZGVza25vdGUtc2FsdA").unwrap();
                let hash = Argon2::default()
                    .hash_password(password.as_bytes(), &salt)
                    .unwrap();
                hash.hash.unwrap().as_bytes().to_vec()
            })
            .build(),
        )
        .invoke_handler(tauri::generate_handler![
            vault_status,
            save_asset,
            save_text_file,
            save_binary_file,
            read_text_file,
            read_file_bytes,
            backup_db,
            take_startup_file,
            register_shell_menu,
            unregister_shell_menu,
            db_open,
            db_close,
            db_select,
            db_execute,
            net_status,
            net_record,
            get_data_dir,
            set_data_dir,
            reset_data_dir,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running D-Note");
}
