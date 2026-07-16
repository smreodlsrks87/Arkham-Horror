/* =====================================================================
   campaign/storage.js — 기록지의 localStorage 접근 단일 창구.
   덱·조사 순서(대표조사자)·캠페인 진행(결말·노트·컬티스트) 읽기/쓰기와 키 상수.
   ※ 모듈 평가 시점엔 아무것도 읽지 않는다 — 인라인 TEST_SEED가 씨를 뿌린 "뒤"에
     initDecks()가 읽어야 하기 때문(import는 인라인 본문보다 먼저 평가됨).
   ===================================================================== */

/* ── localStorage 키 — arkham_game·scenario1과 공유하는 이름(문자열 단일 소스) ── */
export const LS_DECKS    = "arkham_decks";
export const LS_ORDER    = "arkham_player_order";
export const LS_CAMPAIGN = "arkham_campaign";
export const LS_DONE     = "arkham_scenario_done";

/* ── localStorage에서 값 읽기/쓰기 ── */
export function readDecks(){ try{ return JSON.parse(localStorage.getItem(LS_DECKS))||[]; }catch(_){ return []; } }
export function readOrder(){ try{ return JSON.parse(localStorage.getItem(LS_ORDER))||[]; }catch(_){ return []; } }
export function readCampaign(){ try{ return JSON.parse(localStorage.getItem(LS_CAMPAIGN))||{}; }catch(_){ return {}; } }
export function saveDecks(){ try{ localStorage.setItem(LS_DECKS, JSON.stringify(DECKS)); }catch(_){} }
export function saveCampaign(c){ try{ localStorage.setItem(LS_CAMPAIGN, JSON.stringify(c)); }catch(_){} }

/* 이번 화면이 들고 도는 덱 목록. 시트·결말 연출이 "같은 객체"를 물고 고치고,
   saveDecks()가 그 배열을 그대로 직렬화한다(보상 확정 저장). */
let DECKS = [];
export function initDecks(){ DECKS = readDecks(); return DECKS; }   // 인라인 TEST_SEED 직후 1회
export function getDecks(){ return DECKS; }

/* 대표조사자부터(조우 뽑는 순서) 좌측 열에 배치 */
export function orderedDecks(){
  const order = readOrder();
  const byCode = {}; DECKS.forEach(d=> byCode[d.investigator]=d);
  const out = order.map(c=>byCode[c]).filter(Boolean);
  DECKS.forEach(d=>{ if(!out.includes(d)) out.push(d); });   // 순서에 없던 덱은 뒤에
  return out;
}
