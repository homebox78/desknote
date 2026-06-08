# D-Note (디-노트)

오프라인 전용 · 암호화 · Notion 스타일 데스크탑 노트 / 문서 / 데이터베이스 앱
**v1.2.0** · Tauri 2 + React 19 + BlockNote + SQLite

> 모든 데이터는 사용자 PC에만 저장되고 외부 네트워크 통신을 하지 않는 것이 제1원칙입니다.
> 노션 업로드만 사용자가 명시적으로 실행할 때, `api.notion.com` 으로만 예외 통신합니다.

---

## 기능

### 노트 · 문서
| 기능 | 설명 |
| --- | --- |
| 페이지 트리 | 무한 중첩, 생성·복제·삭제·복구, **즐겨찾기 ★**(행 호버 시 토글) |
| 블록 에디터 | BlockNote(슬래시 `/`·마크다운 단축·드래그·리치텍스트) |
| **에디터 우클릭 메뉴** | 서식(B/I/S/`</>`) · 블록 전환(텍스트/제목/목록/인용/코드) · 아래에 추가/복제/삭제 · 이미지·파일 첨부 |
| 자동 저장 | 600ms 디바운스(블록 JSON + 검색용 평문) |
| 검색 | SQLite FTS5 전문 검색, **⌘/Ctrl+K** 모달(↑↓ 이동, ↵ 열기) |
| 버전 기록 | 저장 시점 스냅샷(~3분, 최근 50개) · 이전 버전 복원 🕘 |

### 데이터베이스
| 기능 | 설명 |
| --- | --- |
| 뷰 | **표 · 보드(칸반·드래그) · 갤러리 · 캘린더** |
| 속성 | 텍스트·숫자·선택·다중선택·날짜·체크박스·URL (옵션 즉석 생성) |
| 갤러리 | 카드 **커버 이미지 첨부**(로컬 저장) |
| 행 편집 | 행 상세 모달(모든 속성), 보드는 그룹에 맞춰 추가 |

### 포스트잇 (데스크탑 메모)
- 페이지를 **항상-위 포스트잇 창**으로 띄움(페이지 미러 — 본문과 완전 연동)
- 색상 팔레트(노랑·핑크·블루·그린·그레이), 드래그 이동, 위치·크기·색 저장
- **동기화 표시**("동기화 중…/동기화됨"), **"페이지 열기"** → 메인 창에서 해당 페이지 열림
- 앱 재시작 시 열어둔 포스트잇 자동 복원

### 가져오기 · 내보내기 · 노션
| 기능 | 설명 |
| --- | --- |
| 내보내기 | Markdown · HTML · PDF · 데이터베이스 CSV |
| 가져오기 | Markdown · Word(.docx) · CSV · **Excel(.xlsx)** → 페이지/DB |
| **탐색기 우클릭** | 파일 우클릭 → **"D-Note로 보내기"** 로 내용 가져오기 |
| 노션 ① | **가져오기용 ZIP 내보내기**(중첩 Markdown + CSV) → 노션 가져오기 |
| 노션 ② | **노션 API 직접 업로드**(Rust 경유, 계층 보존) |

### 보안 · 설정 · 디자인
| 기능 | 설명 |
| --- | --- |
| 잠금 | 마스터 비밀번호(Stronghold + Argon2id), **자동 잠금**(끔/5/15/30분) |
| 네트워크 차단 | CSP `connect-src 'none'` (웹뷰는 외부로 어떤 요청도 못 보냄) |
| 백업 | 날짜별 DB 자동 백업(하루 1회) `backups/desknote-<날짜>.db` |
| **설정 페이지** | 모양(테마·강조 톤·사이드바 밀도/너비·전체폭·글자 크기) · 보안 · 백업 · 정보 |
| 온보딩 | 최초 실행 4단계(환영→비밀번호→모양→완료) |
| 디자인 | 모노크롬 시안 · D-Note 로고 · 라인 SVG 아이콘 · Pretendard · 다크/라이트 |
| 창 | 커스텀 타이틀바(설정 ⚙️ · 항상위 📌 · 최소화 · 최대화 · 닫기) |

---

## 데이터 위치 (Windows)
`%APPDATA%\com.desknote.app\` *(설정에서 폴더 변경 가능)*
- `desknote.db` — 모든 페이지/본문/데이터베이스 (SQLite)
- `vault.hold` — 비밀번호 검증용 암호화 금고 (Stronghold)
- `assets/` — 업로드한 이미지·첨부
- `backups/` — 날짜별 DB 스냅샷

> 표시 이름은 **D-Note**지만 내부 식별자/DB 파일명은 `desknote`로 유지합니다(기존 데이터 호환). 폴더 경로가 `com.desknote.app`인 것은 정상입니다.

---

## 빌드 & 실행

사전 준비(한 번만): **Rust**(rustup), **Visual Studio C++ Build Tools**("C++를 사용한 데스크톱 개발" 워크로드), **WebView2 런타임**(Win11 기본 포함).

```bash
npm install            # 의존성
npm run tauri dev      # 개발 실행
npm run tauri build    # 설치형 빌드 (NSIS)
```

산출물(설치 프로그램):
`src-tauri/target/release/bundle/nsis/D-Note_1.2.0_x64-setup.exe`

**설치 프로그램**은 EULA 사용권 동의 · D-Note 브랜딩(아이콘·사이드바/헤더) · `C:\Program Files\D-Note` 설치 · 설치 후 실행 옵션을 포함합니다.

> 개발 모드 주의: 보안 CSP(`connect-src 'none'`)로 Vite HMR 웹소켓이 막혀 자동 새로고침이 동작하지 않습니다. 코드 수정 후 창에서 **Ctrl+R**로 새로고침하세요.

앱 아이콘을 바꾸려면 `src-tauri/dnote-source.png`(1024²)를 교체하고 `npm run tauri icon src-tauri/dnote-source.png` 실행.

---

## 보안 설계 (4계층)
1. **네트워크 차단** — CSP `connect-src 'none'`. 업데이터·텔레메트리 없음.
2. **접근 잠금** — 마스터 비밀번호 + 자동 잠금. Stronghold 스냅샷은 그 비밀번호로만 복호화.
3. **키 파생** — Argon2id로 비밀번호 → 32바이트 키.
4. **로컬 전용 I/O** — 파일 쓰기/이미지/백업/가져오기를 Rust 명령으로 처리. 노션 API는 `tauri-plugin-http` 스코프로 `api.notion.com`만 허용 → 웹뷰 CSP는 그대로 유지.

---

## 사용법 빠른 안내
- **페이지**: 사이드바 `＋ 새 페이지`/`새 데이터베이스`/`새 포스트잇`. 행 호버 → ★ 즐겨찾기, 우클릭 → 메뉴.
- **에디터**: 글자 선택 → 서식 도구막대, `/` → 블록 삽입, **우클릭** → 블록 메뉴(서식·전환·첨부). 파일을 에디터로 드래그해도 첨부.
- **데이터베이스**: 상단 탭으로 표/보드/갤러리/캘린더 전환. 셀 클릭 편집, 카드 클릭 → 행 상세, 캘린더 날짜 클릭 → 추가.
- **포스트잇**: 문서 상단 `📝 포스트잇` 칩 또는 페이지 우클릭 → 포스트잇으로 열기.
- **검색**: ⌘/Ctrl+K. **설정**: 우측 상단 ⚙️.
- **노션 이전**: 사이드바 `노션으로 내보내기(ZIP)` 또는 `노션에 직접 업로드(API)`.
- **탐색기**: 문서 파일 우클릭 → `D-Note로 보내기`(앱 첫 실행·잠금 해제 후 등록됨).

---

## 알아둘 점 / 다음 단계
- **PDF 한글**: jsPDF 기본 폰트는 라틴 전용 → PDF의 한글이 깨질 수 있음(HTML·MD·노션은 정상). CJK 폰트 등록 시 해결.
- **노션 API 업로드**: DB 페이지는 건너뜀(CSV로 이전), 이미지는 로컬 파일이라 제외.
- **비밀번호 변경 / SQLCipher 전체 DB 암호화**: 후속 작업으로 검토 중.
- 설치 프로그램은 NSIS 표준 마법사 기반(브랜딩 적용)이며, 시안의 완전 플랫 커스텀 UI는 NSIS 한계로 일부만 반영됩니다.

---

## 폴더 구조
```
D-Note/
├─ index.html · package.json · vite.config.ts
├─ docs/DESIGN.md                 ← 설계 문서(SDD)
├─ 시안/                           ← 디자인 시안(목업 jsx + 스크린샷)
├─ src/
│  ├─ main.tsx                    ← 라우팅(메인 / ?sticky=… 포스트잇 창)
│  ├─ App.tsx                     ← 잠금/온보딩 게이트 + 워크스페이스 + 환경설정/자동잠금
│  ├─ styles.css                  ← 디자인 토큰 · 전체 스타일
│  ├─ lib/
│  │  ├─ db.ts                    ← SQLite CRUD · FTS5 · 버전 스냅샷
│  │  ├─ dbviews.ts               ← 데이터베이스(표/보드/갤러리/캘린더)
│  │  ├─ upload.ts                ← 이미지 로컬 저장
│  │  ├─ export.ts · import.ts    ← MD/HTML/PDF/CSV · MD/DOCX/CSV/XLSX
│  │  ├─ version.ts               ← 버전 기록
│  │  ├─ notion.ts                ← 노션 ZIP 내보내기 + API 업로드
│  │  ├─ sticky.ts · stickyWindow.ts ← 포스트잇 데이터·창
│  │  └─ prefs.ts                 ← 외양 환경설정(테마·톤·밀도·너비·글자크기)
│  └─ components/
│     ├─ icons.tsx                ← 라인 SVG 아이콘 세트 + D 로고
│     ├─ Titlebar.tsx · Sidebar.tsx · PageView.tsx
│     ├─ Lock.tsx · Onboarding.tsx · SettingsPage.tsx
│     ├─ SearchModal · TrashModal · NotionUploadModal · VersionHistoryModal · ContextMenu
│     ├─ StickyApp.tsx            ← 포스트잇 창 UI
│     └─ database/ (DatabaseView · TableView · BoardView · GalleryView · CalendarView · RowDetailModal · cells)
└─ src-tauri/
   ├─ src/lib.rs                  ← 마이그레이션 · 로컬 파일 명령 · 백업 · 데이터폴더 · 셸메뉴 · 플러그인
   ├─ Cargo.toml · tauri.conf.json
   ├─ eula.txt · installer/       ← 설치 프로그램 EULA · 헤더/사이드바 이미지
   ├─ icons/                      ← 앱 아이콘(D-Note 로고)
   └─ capabilities/default.json   ← 플러그인 권한(http는 api.notion.com만)
```

---

## 변경 이력 (요약)
- **디자인 시안 적용** — 모노크롬 팔레트·D 로고·라인 아이콘·타이틀바/사이드바/잠금/모달/설정/온보딩, 앱 아이콘, 설치 프로그램 브랜딩
- **포스트잇**(페이지 미러), **즐겨찾기 ★**, **에디터 우클릭 블록 메뉴**, **갤러리 커버 이미지**
- **설정 전체페이지** + 외양 환경설정(강조 톤·밀도·너비·글자 크기) + 자동 잠금
- **온보딩 4단계**, **버전 기록 + 자동 백업**
- **노션** ZIP 내보내기 / API 업로드, **탐색기 "D-Note로 보내기"**, **XLSX 가져오기**
- **데이터 폴더 설정**, 제품명 **DeskNote → D-Note**(데이터 호환 유지)
