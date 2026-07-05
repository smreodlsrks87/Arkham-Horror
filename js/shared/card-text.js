/* =====================================================================
   card-text.js — 카드 텍스트의 아이콘 토큰([reaction] 등)을 치환하는 단일 정본
   두 화면(덱빌딩 툴팁 · 게임판 카드)이 함께 import 해서 쓴다.

   방침(사용자 결정): 격발·심볼은 아컴 아이콘 폰트 글리프로, 능력치·클래스는 한글로.
   ※ 아이콘 글리프가 보이려면 그 페이지가 'ArkhamIcons' 폰트를 로드해야 한다
     (fonts/arkham-icons.ttf — @font-face). arkham_game·scenario1 둘 다 로드함.
   ===================================================================== */

// 아이콘 폰트 글리프 한 글자를 span으로 감싸기
const ico = (ch) =>
  '<span style="font-family:\'ArkhamIcons\',serif;font-size:1.05em;">' + ch + '</span>';

export function cleanText(t){
  if(!t) return "";
  return t
    // 격발·심볼 → 아컴 아이콘 폰트 글리프
    .replace(/\[reaction\]/g,    ico("y"))   // 반응 격발
    .replace(/\[action\]/g,      ico("i"))   // 행동 격발
    .replace(/\[free\]/g,        ico("u"))   // 자유 발동(번개) — 실제 카드의 번개는 이것
    .replace(/\[elder_sign\]/g,  ico("x"))   // 옛 표식
    .replace(/\[skull\]/g,       ico("n"))   // 해골
    .replace(/\[cultist\]/g,     ico("b"))   // 추종자
    .replace(/\[tablet\]/g,      ico("v"))   // 석판
    .replace(/\[elder_thing\]/g, ico("c"))   // 옛 존재
    .replace(/\[auto_fail\]/g,   ico("z"))   // 촉수(자동실패)
    // 능력치·상태 → 한글
    .replace(/\[willpower\]/g, "의지").replace(/\[intellect\]/g, "지식")
    .replace(/\[combat\]/g, "전투").replace(/\[agility\]/g, "민첩")
    .replace(/\[bless\]/g, "축복").replace(/\[curse\]/g, "저주")
    // ── 흔적(추후 처리) ─────────────────────────────────────────────
    //  [wild] 만능 아이콘: 카드에선 '?' 이미지로 표시(★ 아님). 커밋 시
    //         "지금 판정하려는 능력치"로 대신 쳐주는 아이콘. 아컴 아이콘
    //         폰트의 wild 글리프를 확정하면 ico(...)로 교체할 것.
    //  [guardian]/[seeker]/[rogue]/[mystic]/[survivor]: 클래스 심볼(추후).
    //  → 현재 카드 텍스트엔 0회 등장하므로 미처리해도 화면 영향 없음.
    // ────────────────────────────────────────────────────────────────
    // 서식 정리(볼드·이탤릭 태그, 강조 대괄호 제거)
    .replace(/<\/?b>|<\/?i>/g, "").replace(/\[\[|\]\]/g, "");
}
