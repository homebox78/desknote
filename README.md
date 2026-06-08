# D-Note (디-노트)

오프라인 전용 · 암호화 · Notion 스타일 데스크탑 노트 / 문서 / 데이터베이스 앱
**v1.2.0** · Tauri 2 + React 19 + BlockNote + SQLite

> 모든 데이터는 사용자 PC에만 저장되고 외부 네트워크 통신을 하지 않는 것이 제1원칙입니다.
> (노션 직접 업로드만 사용자가 명시적으로 실행할 때, 노션 도메인으로만 예외 통신)

---

## 기능

| 영역 | 기능 | 상태 |
| --- | --- | --- |
| 페이지 | 무한 중첩 트리(펼침/접기), 생성·복제·삭제·복구, 즐겨찾기 | ✅ |
| 에디터 | BlockNote 블록 에디터(슬래시 `/`·마크다운 단축·드래그·리치텍스트) | ✅ |
| 저장 | 600ms 디바운스 자동 저장(블록 JSON + 검색용 평문) | ✅ |
| 검색 | SQLite FTS5 전문 검색, ⌘/Ctrl+K 모달 | ✅ |
| 미디어 | 이미지·파일 로컬 `assets` 저장 (외부 전송 0) | ✅ |
| 데이터베이스 | **표 · 보드(칸반·드래그) · 갤러리 · 캘린더** 뷰 | ✅ |
| 속성 타입 | 텍스트·숫자·선택·다중선택·날짜·체크박스·URL (선택 옵션 즉석 생성) | ✅ |
| 내보내기 | Markdown · HTML · PDF · 데이터베이스 CSV | ✅ |
| 가져오기 | Markdown · Word(.docx) · CSV → 페이지/데이터베이스 | ✅ |
| 버전 기록 | 저장 시점 스냅샷(~3분 간격, 최근 50개) · 이전 버전 복원 🕘 | ✅ |
| 백업 | 날짜별 DB 자동 백업(하루 1회) `backups/desknote-<날짜>.db` | ✅ |
| 노션 연동 | ① 가져오기용 ZIP 내보내기 ② 노션 API 직접 업로드 | ✅ |
| 보안 | 마스터 비밀번호 잠금(Stronghold + Argon2id), CSP `connect-src 'none'` | ✅ |
| 디자인 | Notion 동일 톤 · Pretendard 폰트 · 다크/라이트 · 전체폭 본문 | ✅ |
| 창 | 커스텀 타이틀바(압정 📌 항상 위 고정 · 최소화 · 최대화 · 닫기) | ✅ |
| 빌드 | 설치형 `.exe`(NSIS) / `.msi` | ✅ |

데이터 위치(Windows): `%APPDATA%\com.desknote.app\`
- `desknote.db` — 모든 페이지/본문/데이터베이스 (SQLite)
- `vault.hold` — 비밀번호 검증용 암호화 금고 (Stronghold)
- `assets/` — 업로드한 이미지·첨부
- `backups/` — 날짜별 DB 스냅샷

> 표시 이름은 D-Note지만 내부 식별자/DB 파일명은 `desknote`로 유지합니다(기존 데이터 호환을 위해). 폴더 경로가 `com.desknote.app`인 것은 정상입니다.

---

## 빌드 & 실행

사전 준비(한 번만): **Rust**(rustup), **Visual Studio C++ Build Tools**("C++를 사용한 데스크톱 개발" 워크로드), **WebView2 런타임**(Win11 기본 포함). 자세한 절차는 아래 "사전 준비" 참고.

```bash
npm install            # 의존성
npm run tauri dev      # 개발 실행
npm run tauri build    # 설치형 빌드
```

빌드 산출물:
- `src-tauri/target/release/bundle/nsis/D-Note_1.2.0_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/D-Note_1.2.0_x64_en-US.msi`

> 개발 모드 주의: 보안 CSP(`connect-src 'none'`)로 Vite HMR 웹소켓이 막혀 자동 새로고침이 동작하지 않습니다. 코드 수정 후 창에서 **Ctrl+R**로 새로고침하세요.

---

## 노션으로 데이터 옮기기

### ① 가져오기용 ZIP 내보내기 (권장 · 완전 오프라인)
사이드바 **📤 노션으로 내보내기 (ZIP)** → 전체 페이지가 중첩 Markdown(+데이터베이스 CSV) ZIP으로 생성됩니다. 노션에서 **설정 → 가져오기 → Markdown & CSV**로 그 ZIP을 업로드하세요. 토큰 불필요, 네트워크 0, 계층·서식 보존.

### ② 노션 API 직접 업로드 (옵션)
사이드바 **🔗 노션에 직접 업로드 (API)** →
1. notion.so/my-integrations 에서 **내부 통합** 생성 → 시크릿 토큰(`ntn_…`/`secret_…`) 복사
2. 노션에서 대상(부모) 페이지 열기 → ⋯ → **연결**에 그 통합 추가 → 페이지 URL 복사
3. 모달에 토큰·URL 입력 → **업로드 시작** (페이지 계층 그대로 생성)

이 호출은 **Rust(tauri-plugin-http)를 통해 `api.notion.com`으로만** 나갑니다 — 웹뷰 CSP는 `connect-src 'none'`을 유지하므로 앱이 임의 외부로 새지 않습니다.
한계: 데이터베이스 페이지는 건너뜀(노션 DB는 ①의 CSV로 이전), 이미지는 로컬 파일이라 제외됩니다.

---

## 보안 설계 (4계층)
1. **네트워크 차단** — CSP `connect-src 'none'`. 웹뷰는 외부로 어떤 요청도 못 보냄. 업데이터·텔레메트리 없음.
2. **접근 잠금** — 최초 실행 시 마스터 비밀번호 설정, 이후 잠금 해제. Stronghold 스냅샷은 그 비밀번호로만 복호화.
3. **키 파생** — Argon2id로 비밀번호 → 32바이트 키.
4. **로컬 전용 I/O** — 파일 쓰기/이미지 저장/백업/가져오기를 Rust 명령으로 처리해 웹뷰 파일시스템 권한을 닫아둠. 노션 API는 스코프로 노션 도메인만 허용.

---

## 사전 준비 (한 번만)
1. **Rust** — https://rustup.rs (`rustc --version` 확인)
2. **MSVC C++ Build Tools** — https://visualstudio.microsoft.com/visual-cpp-build-tools/ → "C++를 사용한 데스크톱 개발" 워크로드
3. **WebView2 런타임** — Windows 11 기본 포함, 없으면 Microsoft Edge WebView2 설치

---

## 알아둘 점 / 다음 단계
- **PDF 한글**: jsPDF 기본 폰트는 라틴 전용이라 PDF 내보내기 시 한글이 깨질 수 있습니다(HTML·Markdown·노션 연동은 정상). 한글 PDF가 필요하면 CJK 폰트를 `addFont()`로 등록하세요(`src/lib/export.ts` 주석 참고).
- **DB 암호화 강화(SQLCipher)**: 현재는 Stronghold로 키·접근을 보호합니다. DB 파일 자체 암호화는 후속 작업으로 검토 중입니다.
- 배포 exe에 코드 서명을 적용하면 Windows SmartScreen 경고를 줄일 수 있습니다.

---

## 폴더 구조
```
D-Note/
├─ index.html · package.json · vite.config.ts
├─ docs/DESIGN.md               ← 설계 문서(SDD)
├─ src/
│  ├─ App.tsx                   ← 워크스페이스 오케스트레이션
│  ├─ styles.css                ← Notion 톤 · Pretendard
│  ├─ lib/
│  │  ├─ db.ts                  ← SQLite CRUD · FTS5 · 버전 스냅샷
│  │  ├─ dbviews.ts             ← 데이터베이스(표/보드/갤러리/캘린더)
│  │  ├─ upload.ts              ← 이미지 로컬 저장
│  │  ├─ export.ts              ← MD/HTML/PDF/CSV
│  │  ├─ import.ts              ← MD/DOCX/CSV 가져오기
│  │  ├─ version.ts             ← 버전 기록
│  │  └─ notion.ts              ← 노션 ZIP 내보내기 + API 업로드
│  └─ components/
│     ├─ Lock.tsx · Titlebar.tsx · Sidebar.tsx · PageView.tsx
│     ├─ SearchModal.tsx · ContextMenu.tsx · TrashModal.tsx
│     ├─ VersionHistoryModal.tsx · NotionUploadModal.tsx
│     └─ database/ (DatabaseView · TableView · BoardView · GalleryView · CalendarView · cells)
└─ src-tauri/
   ├─ src/lib.rs                ← 마이그레이션 · 로컬 파일 명령 · 백업 · 플러그인
   ├─ Cargo.toml · tauri.conf.json
   └─ capabilities/default.json ← 플러그인 권한 (http는 api.notion.com만)
```
