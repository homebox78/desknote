// Network transparency log. The WebView is sealed by CSP `connect-src 'none'`,
// so the only outbound path is the opt-in Notion upload — and it records every
// request here. This backs the honest "외부 통신 N건" indicator in the UI.
import { invoke } from "@tauri-apps/api/core";

export interface NetEntry {
  ts: number; // unix milliseconds
  host: string;
  detail: string;
}

export interface NetState {
  count: number;
  entries: NetEntry[];
}

/** Cumulative count + recent outbound-request entries. */
export const netStatus = () => invoke<NetState>("net_status");

/** Record one outbound request at the single egress chokepoint. */
export const recordEgress = (host: string, detail: string) =>
  invoke<NetState>("net_record", { host, detail });
