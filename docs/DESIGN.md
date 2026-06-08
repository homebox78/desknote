# D-Note 개발 문서 (Software Design Document)

> 버전 1.0 · 데스크탑 설치형 Notion 스타일 앱

## 1. 문서 개요
완전 오프라인으로 동작하는 데스크탑 설치형 노트/문서/데이터베이스 앱 D-Note의 개발 명세를 정의한다. 모든 데이터는 사용자 PC에만 저장되며 외부 네트워크 통신을 하지 않는 것을 제1원칙으로 한다. 데스크탑 단독 환경에서 실제 구현 가능한 기능만을 범위로 하며, 실시간 협업·클라우드 공유·웹 게시·외부 API 연동 등 서버 인프라가 필수인 기능은 제외한다.

## 2. 목표 및 비범위
**목표**: 인터넷 없이 Notion 수준의 문서 작성·데이터베이스 관리 제공, 데이터를 PC에 안전하게 암호화 저장, 단일 설치 파일(.exe/.msi)로 배포.

**비범위**: 실시간 공동 편집, 클라우드 동기화, 웹 퍼블리시, 브라우저 클리퍼, 외부 서비스 연동(Slack·Google Drive 등), 외부 콘텐츠 임베드(YouTube·지도 등). 단, 로컬 LAN 공유와 로컬 LLM 기반 AI는 선택적 확장으로 분류.

## 3. 기술 스택
| 영역 | 선택 기술 | 사유 |
| --- | --- | --- |
| 앱 프레임워크 | Tauri 2 | 설치 파일 소형, 저메모리, Rust 보안성, 시스템 접근 제어 |
| 프론트엔드 | React + TypeScript + Vite | 컴포넌트 기반, 타입 안정성 |
| 에디터 엔진 | BlockNote | Notion 스타일 블록 에디터 기본 제공 |
| 로컬 DB | SQLite (tauri-plugin-sql) | 단일 파일 저장, FTS5 전문 검색 내장 |
| 보안 키 관리 | Tauri Stronghold + Argon2 | 마스터 비밀번호 → 키 파생, OS 보안영역 보관 |
| 빌드 | Tauri 번들러 (NSIS/MSI) | Windows 설치형 생성 |

## 4. 시스템 아키텍처
3계층. UI 레이어(React + BlockNote)는 사이드바·페이지·블록 편집·DB 뷰 렌더링. 로직 레이어(Rust)는 CRUD·파일 저장·암호화 키 검증·export 처리, Tauri IPC(invoke)로 UI와 통신. 데이터 레이어는 앱 데이터 디렉터리의 SQLite 파일 + assets 폴더.

```
D-Note.exe
  WebView (React + BlockNote)        ← UI
        │ Tauri IPC
  Rust 백엔드 (sql / stronghold / fs) ← 로직
        │
  로컬 저장소  %APPDATA%/com.desknote.app/   ← 데이터
    ├ desknote.db (SQLite)
    ├ vault.hold (암호화 키 금고)
    └ assets/ (이미지·첨부)
  CSP connect-src 'none' → 외부 통신 전면 차단
```

## 5. 기능 명세
- **5.1 페이지 관리 (P0)** — 무한 중첩 계층형 페이지. ID/상위참조/제목/아이콘/정렬/즐겨찾기/휴지통. 트리 펼침·접기·생성·이동·복제·삭제·복구, 즐겨찾기 섹션, 최근 방문.
- **5.2 블록 에디터 (P0)** — 본문·제목(H1~H3)·인용·콜아웃·토글·구분선, 글머리/번호/체크박스 목록, 코드 블록, 표, 다단 칼럼. 슬래시 커맨드·마크다운 단축·드래그 이동. 볼드·이탤릭·밑줄·취소선·인라인코드·색상·링크·LaTeX. 600ms 디바운스 자동 저장(JSON + 검색용 평문).
- **5.3 미디어 (P1)** — 이미지·파일 첨부 시 `save_asset`로 로컬 assets 복사, `convertFileSrc`로 경로 반환. 외부 전송 없음.
- **5.4 데이터베이스 뷰 (P1)** — 테이블·보드(칸반)·갤러리·캘린더. 속성: 텍스트·숫자·선택·다중선택·날짜·체크박스·URL·관계형·롤업·수식. 필터·정렬·그룹화·다중 뷰 저장. `db_tables`/`db_columns`/`db_rows`.
- **5.5 검색 (P0)** — FTS5 전문 검색, ⌘/Ctrl+K 모달, 제목·본문 매칭 즉시 표시.
- **5.6 내보내기/가져오기 (P1)** — export: Markdown·HTML·PDF·CSV. import: Markdown·Word(.docx)·CSV. 로컬 파일 다이얼로그 사용.
- **5.7 템플릿 & 자동화 (P2)** — 페이지·DB 템플릿 저장/재사용, 템플릿 버튼, 로컬 규칙 기반 자동화.
- **5.8 버전 히스토리 (P2)** — 저장 시점 스냅샷 보관, 이전 버전 조회·복원.
- **5.9 보안 (P0)** — CSP `connect-src 'none'`. 최초 실행 마스터 비밀번호 → Argon2 키 파생 → Stronghold 보관. 강화 옵션 SQLCipher.
- **5.10 부가 (P1)** — 다크/라이트, 단축키, 휴지통 복구, 자동 백업(날짜별 스냅샷).

우선순위: **P0** MVP 필수, **P1** 핵심 확장, **P2** 고급.

## 6. 데이터베이스 스키마
```sql
CREATE TABLE pages (
    id TEXT PRIMARY KEY, parent_id TEXT,
    title TEXT NOT NULL DEFAULT '', icon TEXT DEFAULT '📄',
    sort_order INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0, is_trashed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE page_content (
    page_id TEXT PRIMARY KEY, content TEXT NOT NULL DEFAULT '[]'
);
CREATE VIRTUAL TABLE pages_fts USING fts5(page_id UNINDEXED, title, body);
CREATE TABLE page_versions (
    id TEXT PRIMARY KEY, page_id TEXT, content TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE db_tables (
    id TEXT PRIMARY KEY, page_id TEXT,
    name TEXT DEFAULT '표', view TEXT DEFAULT 'table'
);
CREATE TABLE db_columns (
    id TEXT PRIMARY KEY, table_id TEXT, name TEXT,
    type TEXT DEFAULT 'text', config TEXT DEFAULT '{}', sort_order INTEGER DEFAULT 0
);
CREATE TABLE db_rows (
    id TEXT PRIMARY KEY, table_id TEXT,
    data TEXT DEFAULT '{}', sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_pages_parent ON pages(parent_id);
CREATE INDEX idx_rows_table ON db_rows(table_id);
```

## 7. 프로젝트 구조 (목표)
```
desknote/
├── src/
│   ├── App.tsx              # 메인 워크스페이스
│   ├── components/
│   │   ├── Lock.tsx · Sidebar.tsx · PageView.tsx
│   │   ├── SearchModal.tsx · ContextMenu.tsx · TrashModal.tsx · Titlebar.tsx
│   │   └── database/        # 테이블·칸반·갤러리·캘린더 뷰
│   ├── lib/
│   │   ├── db.ts            # SQLite CRUD
│   │   ├── upload.ts        # 이미지 로컬 저장
│   │   ├── export.ts        # MD/HTML/PDF/CSV
│   │   ├── import.ts        # MD/DOCX/CSV 가져오기
│   │   └── version.ts       # 스냅샷
│   └── styles.css
├── src-tauri/
│   ├── src/lib.rs           # DB 마이그레이션·save_asset·stronghold
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## 8. 보안 정책
CSP `default-src 'self'; connect-src 'none'; img-src 'self' asset: data: blob:` 고정. 자동 업데이터·텔레메트리 없음. 비밀번호 평문 저장 금지(Argon2 키 파생). 모든 사용자 데이터는 앱 데이터 디렉터리를 벗어나지 않으며, Rust 파일 명령은 화이트리스트 경로만 허용.

## 9. 개발 로드맵
| 단계 | 범위 | 산출물 |
| --- | --- | --- |
| 마일스톤 1 (MVP) | 페이지 트리, 블록 에디터, 자동저장, 검색, 비밀번호 잠금, 테마 | 설치 가능한 .exe 베타 |
| 마일스톤 2 | 이미지 로컬 저장, export(MD/HTML/PDF), 우클릭 메뉴, 즐겨찾기, 휴지통 | 1.0 정식 |
| 마일스톤 3 | DB 뷰(테이블·칸반·갤러리·캘린더), 가져오기 | 1.1 |
| 마일스톤 4 | 템플릿·자동화, 버전 히스토리, 자동 백업, SQLCipher | 1.2 |
| 확장(선택) | LAN 읽기전용 공유, 로컬 LLM(Ollama) AI | 2.0 |

## 10. 빌드 & 배포
개발: `npm run tauri dev` / 배포: `npm run tauri build`. 산출물 `src-tauri/target/release/bundle/nsis/D-Note_x.x.x_x64-setup.exe`. SmartScreen 경고 감소를 위해 코드 사이닝 권장.

## 11. 테스트 항목
오프라인 전 기능 동작, 네트워크 모니터 외부 요청 0건, 비밀번호 오류 시 차단, 재시작 후 데이터 보존, 대용량 페이지(수천 블록) 성능, 검색 정확도, export 무결성.

## 12. 리스크 및 대응
비밀번호 분실 시 복구 불가 → 최초 설정 화면 경고. 데이터 손상 대비 자동 백업 기본 활성화. 외부 임베드는 오프라인 원칙상 불가 → 로컬 파일 임베드로 대체. 의존성 버전 고정(lock).
