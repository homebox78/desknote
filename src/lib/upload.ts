// BlockNote image/file upload handler. The bytes are handed to a local Rust
// command that writes them into the app's `assets` folder — they are never
// sent anywhere. The returned path is converted to an `asset://` URL the
// WebView can render (allowed by the CSP `img-src asset:`).
import { invoke, convertFileSrc } from "@tauri-apps/api/core";

export async function uploadFile(file: File): Promise<string> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
  const path = await invoke<string>("save_asset", { name: file.name, bytes });
  return convertFileSrc(path);
}
