/* =====================================================================
   data/load.js — 카드 데이터 로딩(공통 창구)
   cards.json("무엇인가")·notz_player_cards.json("어떻게 작동하는가")을 불러오고
   코드→카드 사전(byCode)을 만든다. 두 화면(메뉴·게임판)이 함께 쓴다.
   ===================================================================== */

// ★ 데이터(JSON)는 개발 중 자주 바뀌므로 항상 최신을 받도록 캐시 무효화(no-store).
//   (옛 notz 캐시로 on_draw 누락 → 약점이 손패로 가는 버그 방지)
const NOCACHE = { cache: "no-store" };

// cards.json 로드 → 카드 배열. 실패하면 빈 배열([]).
export async function loadCardsJson(){
  try{
    const res = await fetch("cards.json", NOCACHE);
    if(res.ok) return await res.json();
  }catch(_){}
  return [];
}

// 카드 배열 → byCode 사전 채우기(코드→카드). 같은 코드는 마지막 것으로 덮음.
// 기존 byCode에 이어 담고 싶으면 두 번째 인자로 넘긴다.
export function indexByCode(cards, byCode = {}){
  cards.forEach(c=>{ byCode[c.code] = c; });
  return byCode;
}

// notz_player_cards.json 로드 → 카드 작동방식(abilities·zone 등). 실패하면 {}.
export async function loadAbilities(){
  try{
    const res = await fetch("notz_player_cards.json", NOCACHE);
    if(res.ok) return await res.json();
  }catch(_){}
  return {};
}

// notz_encounter_cards.json 로드 → 조우(적·음모) 작동방식(keywords·prey·revelation 등). 실패하면 {}.
// 플레이어 코드(015xx)와 조우 코드(011xx~016xx)가 겹치지 않아 cardAbilities에 그대로 병합해 쓴다.
export async function loadEncounterAbilities(){
  try{
    const res = await fetch("notz_encounter_cards.json", NOCACHE);
    if(res.ok) return await res.json();
  }catch(_){}
  return {};
}
