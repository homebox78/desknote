// D-Note — Rust backend
// All persistence and file I/O happens locally. No code path here performs a
// network request, which together with the strict CSP guarantees offline-only
// operation.

use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

const IDENTIFIER: &str = "com.desknote.app";

/// Holds a file path passed on the command line (Explorer "Send to D-Note"),
/// consumed once by the frontend after unlock.
struct PendingFile(Mutex<Option<String>>);

/// The SQLite connection string the frontend must use (depends on the chosen
/// data folder). Kept in sync with the migrations registered at startup.
struct DbUrl(String);

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

/// The DB connection string for `current_root()`. Default folder keeps the
/// original relative form so existing installs are byte-for-byte unaffected.
fn db_connection() -> String {
    let root = current_root();
    if root == config_base() {
        "sqlite:desknote.db".to_string()
    } else {
        format!(
            "sqlite:{}",
            root.join("desknote.db").display().to_string().replace('\\', "/")
        )
    }
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

/// The SQLite connection string the frontend should pass to Database.load().
#[tauri::command]
fn db_url(state: tauri::State<DbUrl>) -> String {
    state.0.clone()
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
    let startup_arg = std::env::args().nth(1).filter(|a| !a.starts_with('-'));
    let db_conn = db_connection();

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
        .manage(DbUrl(db_conn.clone()))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
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
                .add_migrations(&db_conn, migrations())
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
            db_url,
            get_data_dir,
            set_data_dir,
            reset_data_dir,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running D-Note");
}
