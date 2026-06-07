import { useEffect, useState } from "react";
import { Stronghold } from "@tauri-apps/plugin-stronghold";
import { invoke } from "@tauri-apps/api/core";

const CLIENT = "desknote";

/**
 * Master-password gate. On first launch the password creates an encrypted
 * Stronghold snapshot; afterwards the same password must decrypt it. A wrong
 * password fails to open the snapshot, so access is denied.
 */
export function Lock({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [first, setFirst] = useState(false);
  const [err, setErr] = useState("");
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    invoke<{ path: string; exists: boolean }>("vault_status")
      .then((s) => {
        setVaultPath(s.path);
        setFirst(!s.exists);
      })
      .catch((e) => setErr(String(e)));
  }, []);

  const submit = async () => {
    if (!vaultPath) return;
    if (pw.length < 6) {
      setErr("비밀번호는 6자 이상이어야 합니다");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const stronghold = await Stronghold.load(vaultPath, pw);
      if (first) {
        // Materialise a client and persist the snapshot so the password is
        // remembered (and validated) on the next launch.
        try {
          await stronghold.loadClient(CLIENT);
        } catch {
          await stronghold.createClient(CLIENT);
        }
        await stronghold.save();
      }
      onUnlock();
    } catch {
      setErr("비밀번호가 올바르지 않습니다");
      setBusy(false);
    }
  };

  return (
    <div className="lock">
      <div style={{ fontSize: 48 }}>🔒</div>
      <h2>{first ? "DeskNote 비밀번호 설정" : "DeskNote 잠금 해제"}</h2>
      <p>
        {first
          ? "이 비밀번호로 데이터 접근이 보호됩니다. 분실 시 복구할 수 없으니 안전하게 보관하세요."
          : "마스터 비밀번호를 입력하세요"}
      </p>
      <input
        type="password"
        autoFocus
        placeholder="비밀번호"
        value={pw}
        disabled={busy || !vaultPath}
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
      />
      {err && <div className="err">{err}</div>}
      <button onClick={submit} disabled={busy || !vaultPath}>
        {first ? "설정하고 시작" : "잠금 해제"}
      </button>
    </div>
  );
}
