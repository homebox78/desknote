// DeskNote — Rust backend
// All persistence and file I/O happens locally. No code path here performs a
// network request, which together with the strict CSP guarantees offline-only
// operation.

use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

/// Ensure the per-user app data directory exists and report whether the
/// Stronghold vault has been created yet (i.e. whether this is a first run).
#[derive(Serialize)]
struct VaultStatus {
    path: String,
    exists: bool,
}

#[tauri::command]
fn vault_status(app: tauri::AppHandle) -> Result<VaultStatus, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
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
fn save_asset(app: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<String, String> {
    let dir: PathBuf = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("assets");
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
fn backup_db(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
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

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "init",
            sql: "
                CREATE TABLE IF NOT EXISTS pages (
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
                CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "database_views",
            sql: "
                CREATE TABLE IF NOT EXISTS db_tables (
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
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "page_type_and_db_config",
            sql: "
                ALTER TABLE pages ADD COLUMN type TEXT DEFAULT 'doc';
                ALTER TABLE db_columns ADD COLUMN config TEXT DEFAULT '{}';
                CREATE INDEX IF NOT EXISTS idx_rows_table ON db_rows(table_id);
                CREATE INDEX IF NOT EXISTS idx_cols_table ON db_columns(table_id);
                CREATE INDEX IF NOT EXISTS idx_tables_page ON db_tables(page_id);
                CREATE TABLE IF NOT EXISTS page_versions (
                    id         TEXT PRIMARY KEY,
                    page_id    TEXT,
                    content    TEXT,
                    created_at TEXT DEFAULT (datetime('now'))
                );
                CREATE INDEX IF NOT EXISTS idx_versions_page ON page_versions(page_id);
            ",
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Password → 32-byte key via Argon2id. Stronghold protects the master
        // key in an encrypted snapshot; a wrong password fails to decrypt it.
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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:desknote.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            vault_status,
            save_asset,
            save_text_file,
            save_binary_file,
            read_text_file,
            read_file_bytes,
            backup_db
        ])
        .run(tauri::generate_context!())
        .expect("error while running DeskNote");
}
