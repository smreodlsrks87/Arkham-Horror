/* =====================================================================
   stage.js — 1920×1080 고정 무대를 창 크기에 맞춰 스케일 + 좌표변환(공통)
   두 화면(메뉴·게임판)이 함께 import 한다.

   방침(사용자 결정): 줌 상한 없음 → 큰 모니터(4K 등)에서도 화면을 꽉 채운다.
     (예전 arkham_game 은 100% 상한이라 큰 화면에서 가운데 조그맣게 떴음 → 통일)
   ===================================================================== */

// 마지막 fitStage 결과(좌표변환에 사용). export let = 라이브 바인딩이라
// import 한 쪽에서도 최신값이 보인다.
export let stageScale = 1, stageLeft = 0, stageTop = 0;

// 창 크기에 맞춰 무대(stageEl)를 스케일·중앙 배치
export function fitStage(stageEl){
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);   // 상한 없음(꽉 채움)
  stageScale = s;
  stageLeft = (innerWidth  - 1920 * s) / 2;
  stageTop  = (innerHeight - 1080 * s) / 2;
  stageEl.style.position  = "absolute";
  stageEl.style.transform = "scale(" + s + ")";
  stageEl.style.left = stageLeft + "px";
  stageEl.style.top  = stageTop  + "px";
}

// 화면(client) 좌표 → 무대 내부 좌표 (게임판의 3D 클릭·카드 드래그에 사용)
export function toStageX(clientX){ return (clientX - stageLeft) / stageScale; }
export function toStageY(clientY){ return (clientY - stageTop)  / stageScale; }
