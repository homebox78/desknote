/* D-Note mock workspace data — mirrors the user's real pages/databases. */

const DB_STATUS = [
  { id: "todo", label: "시작 전", color: "slate" },
  { id: "doing", label: "진행 중", color: "blue" },
  { id: "done", label: "완료", color: "green" },
];

const PAGES = [
  {
    id: "p-flow",
    type: "doc",
    title: "솔리가드_화면흐름설계서",
    icon: "doc",
    fav: true,
    blocks: [
      { t: "h1", text: "솔리가드(SoliGuard) 화면 흐름 설계서" },
      { t: "h2", text: "전체 화면 흐름도" },
      { t: "p", text: "사용자의 핵심 동선은 다음과 같이 흐릅니다." },
      { t: "li", text: "**최초 실행 시:** 직무 선택(온보딩) → 메인 대시보드" },
      { t: "li", text: "**일상 사용 시:** 메인 대시보드 → 스캔 설정 → 스캔 진행 → 검출 결과 → 조치(마스킹/격리/삭제) → 완료 및 리포트" },
      { t: "li", text: "**보조 흐름:** 대시보드 → 격리함 / 이력·감사 로그 / 설정" },
      { t: "code", text: "[온보딩: 직무 선택] (최초 1회)\n        │\n        ▼\n[메인 대시보드] ──┬─▶ [스캔 설정] ─▶ [스캔 진행] ─▶ [검출 결과] ─▶ [조치 확인] ─▶ [완료/리포트]\n                  ├─▶ [격리함]\n                  ├─▶ [이력/감사 로그]\n                  └─▶ [설정]" },
      { t: "h2", text: "핵심 화면 정의" },
      { t: "p", text: "각 화면은 단일 책임 원칙에 따라 하나의 주요 과업만 수행하며, 민감정보 노출을 최소화하는 마스킹 우선 정책을 따릅니다." },
      { t: "quote", text: "검출 결과는 기본적으로 마스킹된 상태로 표시되며, 권한이 있는 사용자가 명시적으로 펼칠 때만 원문이 노출됩니다." },
      { t: "li", text: "스캔 설정 — 대상 경로·파일 유형·민감도 임계값 지정" },
      { t: "li", text: "검출 결과 — 항목별 위험도·위치·권장 조치 표시" },
      { t: "li", text: "조치 확인 — 마스킹/격리/삭제 일괄 또는 개별 적용" },
    ],
  },
  {
    id: "p-soli",
    type: "doc",
    title: "솔리가드(SoliGuard)",
    icon: "doc",
    blocks: [
      { t: "h1", text: "솔리가드(SoliGuard)" },
      { t: "p", text: "로컬 PC 내 민감정보를 탐지하고 안전하게 조치하는 오프라인 보안 도구." },
      { t: "h2", text: "제품 개요" },
      { t: "p", text: "모든 스캔은 사용자 기기 안에서만 수행되며 외부 네트워크로 어떤 데이터도 전송하지 않습니다." },
      { t: "li", text: "오프라인 전용 동작" },
      { t: "li", text: "민감정보 패턴 탐지 (주민번호·카드·연락처)" },
      { t: "li", text: "마스킹 · 격리 · 삭제 조치" },
    ],
  },
  { id: "p-empty1", type: "doc", title: "제목 없음", icon: "doc", blocks: [] },
  {
    id: "db-1",
    type: "db",
    title: "제품 백로그",
    icon: "database",
    rows: [
      { id: "r1", name: "온보딩 직무 선택 화면", status: "doing", date: "2026-06-12", tags: ["UX"] },
      { id: "r2", name: "스캔 진행 인디케이터", status: "todo", date: "2026-06-15", tags: ["FE"] },
      { id: "r3", name: "검출 결과 마스킹 토글", status: "done", date: "2026-06-03", tags: ["FE", "보안"] },
      { id: "r4", name: "격리함 복원 플로우", status: "todo", date: "2026-06-20", tags: ["UX"] },
      { id: "r5", name: "감사 로그 CSV 내보내기", status: "doing", date: "2026-06-18", tags: ["BE"] },
      { id: "r6", name: "리포트 PDF 한글 폰트", status: "todo", date: "2026-06-25", tags: ["BE"] },
      { id: "r7", name: "설정 화면 다크 모드", status: "done", date: "2026-06-01", tags: ["FE"] },
    ],
  },
  { id: "p-empty2", type: "doc", title: "제목 없음", icon: "doc", blocks: [] },
  {
    id: "p-terms",
    type: "doc",
    title: "[투판즈] 국문 이용약관",
    icon: "doc",
    blocks: [
      { t: "h1", text: "[투판즈] 국문 이용약관" },
      { t: "h2", text: "제1조 (목적)" },
      { t: "p", text: "본 약관은 회사가 제공하는 서비스의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다." },
      { t: "h2", text: "제2조 (정의)" },
      { t: "li", text: "“서비스”란 회사가 제공하는 모든 기능을 의미합니다." },
      { t: "li", text: "“이용자”란 본 약관에 따라 서비스를 이용하는 자를 말합니다." },
    ],
  },
  {
    id: "p-career",
    type: "doc",
    title: "우덕성_기술경력서",
    icon: "doc",
    blocks: [
      { t: "h1", text: "우덕성 · 기술경력서" },
      { t: "p", text: "데스크탑 애플리케이션 및 보안 소프트웨어 개발 경력 요약." },
      { t: "h2", text: "주요 역량" },
      { t: "li", text: "Tauri · React · Rust 기반 오프라인 데스크탑 앱 설계" },
      { t: "li", text: "SQLite FTS5 전문 검색 · 로컬 암호화 저장소 구축" },
      { t: "li", text: "BlockNote 기반 블록 에디터 통합" },
    ],
  },
  {
    id: "db-2",
    type: "db",
    title: "릴리스 캘린더",
    icon: "database",
    rows: [
      { id: "c1", name: "v1.2.0 정식 릴리스", status: "done", date: "2026-06-08", tags: ["릴리스"] },
      { id: "c2", name: "한글 PDF 패치", status: "doing", date: "2026-06-16", tags: ["패치"] },
      { id: "c3", name: "SQLCipher 검토", status: "todo", date: "2026-06-24", tags: ["보안"] },
    ],
  },
];

const TRASH = [
  { title: "회의록 0521", icon: "doc" },
  { title: "임시 메모", icon: "doc" },
  { title: "제목 없음", icon: "doc" },
  { title: "구버전 약관", icon: "doc" },
  { title: "테스트 DB", icon: "database" },
];

const VERSIONS = [
  { time: "방금 전", label: "자동 저장", current: true },
  { time: "3분 전", label: "자동 저장" },
  { time: "9분 전", label: "자동 저장" },
  { time: "오늘 14:02", label: "자동 저장" },
  { time: "오늘 11:37", label: "자동 저장" },
  { time: "어제 18:20", label: "자동 저장" },
  { time: "2026-06-06 09:15", label: "수동 스냅샷" },
];

Object.assign(window, { PAGES, DB_STATUS, TRASH, VERSIONS });
