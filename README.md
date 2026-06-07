# DeskNote

오프라인 전용 · 암호화 · Notion 스타일 데스크탑 노트 앱
(Tauri 2 + React 19 + BlockNote + SQLite)

---

## 무엇이 들어있나

| 기능 | 구현 |
| --- | --- |
| Notion 동일 디자인(색·폰트·여백) | `src/styles.css` |
| 블록 에디터(슬래시 `/`, 드래그, 리치텍스트) | BlockNote |
| 계층형 페이지 트리(펼침/접기, 하위 추가) | `src/components/Sidebar.tsx` |
| 즐겨찾기 · 우클릭 메뉴(복제/삭제/하위추가) | `src/components/ContextMenu.tsx`, `App.tsx` |
| 휴지통(복구 / 완전 삭제) | `src/components/TrashModal.tsx` |
| 전문 검색 모달(⌘K / Ctrl+K, FTS5) | `src/components/SearchModal.tsx` |
| 600ms 디바운스 자동 저장 + 검색 인덱싱 | `src/components/PageView.tsx`, `src/lib/db.ts` |
| 이미지 로컬 업로드(외부 전송 0) | `src/lib/upload.ts`, Rust `save_asset` |
| Markdown / HTML / PDF export | `src/lib/export.ts` |
| 다크 / 라이트 테마 | `App.tsx` (localStorage 저장) |
| 마스터 비밀번호 잠금 | Stronghold + Argon2id (`Lock.tsx`, `lib.rs`) |
| 외부 네트워크 완전 차단 | CSP `connect-src 'none'` (`tauri.conf.json`) |
| 설치형 exe(NSIS / MSI) | Tauri 번들러 |

데이터 위치(Windows): `%APPDATA%\com.desknote.app\`
- `desknote.db` — 모든 페이지/본문 (SQLite)
- `assets/` — 업로드한 이미지
- `vault.hold` — 비밀번호 검증용 암호화 금고(Stronghold)

---

## 1. 사전 준비 (한 번만)

프론트엔드는 이미 빌드 확인을 마쳤습니다. **데스크탑 앱으로 컴파일하려면 Rust 툴체인이 필요합니다.**

1. **Rust** — https://rustup.rs 에서 `rustup` 설치 후 터미널 재시작
   (`rustc --version` 으로 확인)
2. **Microsoft C++ Build Tools** — https://visualstudio.microsoft.com/visual-cpp-build-tools/
   설치 시 **"C++를 사용한 데스크톱 개발"** 워크로드 선택 (MSVC 링커용)
3. **WebView2 런타임** — Windows 11에는 기본 포함. 없으면
   https://developer.microsoft.com/microsoft-edge/webview2/ 에서 설치

Node 의존성은 이미 설치되어 있습니다(`node_modules`). 새로 받았다면 `npm install`.

---

## 2. 개발 실행

```bash
npm run tauri dev
```

> 참고: 보안을 위해 CSP에 `connect-src 'none'` 을 적용했기 때문에 개발 모드에서
> Vite HMR(웹소켓)이 차단되어 자동 새로고침이 동작하지 않습니다. 코드 수정 후
> 창에서 **Ctrl+R** 로 새로고침하세요. HMR이 꼭 필요하면 개발 중에만
> `src-tauri/tauri.conf.json` 의 `connect-src 'none'` 을
> `connect-src ws://localhost:1421` 로 잠시 바꿨다가 배포 전 되돌리면 됩니다.

## 3. 설치형 exe 빌드

```bash
npm run tauri build
```

생성물:
`src-tauri/target/release/bundle/nsis/DeskNote_1.0.0_x64-setup.exe`
(그리고 `bundle/msi/…msi`)

---

## 보안 설계 (4계층)

1. **네트워크 차단** — CSP `connect-src 'none'`. WebView가 외부로 어떤 요청도
   보낼 수 없음. 업데이터·텔레메트리 없음 → 완전 오프라인.
2. **접근 잠금** — 실행 시 마스터 비밀번호. Stronghold 스냅샷을 해당
   비밀번호로만 복호화할 수 있어 틀리면 진입 불가.
3. **키 파생** — Argon2id 로 비밀번호 → 32바이트 키 (`src-tauri/src/lib.rs`).
4. **로컬 전용 I/O** — 파일 쓰기/이미지 저장을 Rust 명령으로 처리해
   WebView의 파일시스템 권한(fs 스코프)을 열지 않음.

---

## 알아둘 점 / 다음 단계

- **PDF 한글**: jsPDF 기본 폰트는 라틴 전용이라 한글이 깨질 수 있습니다.
  한글 PDF가 필요하면 NanumGothic 등 CJK TTF를 base64로 `addFont()` 등록하세요
  (`src/lib/export.ts`의 주석 참고). HTML/Markdown export는 한글 정상.
- **저장 암호화 강화**: 현재는 Stronghold로 키·접근을 보호합니다. DB 파일 자체를
  암호화하려면 SQLCipher 연동을 추가할 수 있습니다.
- **DB 뷰(테이블/칸반)**: 스키마(`db_tables`/`db_columns`/`db_rows`)는 마이그레이션
  v2에 준비돼 있으며 UI는 후속 작업으로 붙일 수 있습니다.
- 데이터 폴더(`%APPDATA%\com.desknote.app\`)를 주기적으로 백업하고, 배포 exe에
  코드 서명을 적용하면 Windows SmartScreen 경고를 줄일 수 있습니다.

---

## 폴더 구조

```
DeskNote/
├─ index.html
├─ package.json
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                  ← 워크스페이스 오케스트레이션
│  ├─ styles.css               ← Notion 디자인 토큰
│  ├─ lib/
│  │  ├─ db.ts                 ← SQLite CRUD + FTS5 검색
│  │  ├─ upload.ts             ← 이미지 로컬 저장
│  │  └─ export.ts             ← MD / HTML / PDF
│  └─ components/
│     ├─ Lock.tsx              ← 비밀번호 잠금
│     ├─ Sidebar.tsx           ← 페이지 트리
│     ├─ PageView.tsx          ← 에디터 + 제목/아이콘 + export
│     ├─ SearchModal.tsx       ← ⌘K 검색
│     ├─ ContextMenu.tsx       ← 우클릭 메뉴
│     └─ TrashModal.tsx        ← 휴지통
└─ src-tauri/
   ├─ Cargo.toml               ← Rust 의존성
   ├─ tauri.conf.json          ← CSP·창·번들 설정
   ├─ capabilities/default.json← 플러그인 권한
   └─ src/lib.rs               ← 마이그레이션 + 로컬 명령
```
