/* =====================================================================
   scenario/phases.js — 라운드 루프(틀). 페이즈 순서·전환·타이밍을 소유.
   각 단계의 실제 게임효과는 bus 이벤트로 요청 → scenario1(또는 도메인 모듈)이 처리.
   공식 순서(회합의 밤 규칙): 신화 → 조사자 → 적 → 정비 → (다음 라운드 신화 …)
   ※ 전투(적 단계 3.2 사냥꾼 이동·3.3 교전 공격)는 지금 빈 훅 — 적 시스템 이후.
   ===================================================================== */
import { S, bus } from "./state.js";

export const PHASES = ["mythos","investigation","enemy","upkeep"];
export const PHASE_NAMES = { mythos:"신화 단계", investigation:"조사자 단계", enemy:"적 단계", upkeep:"정비 단계" };
export const PHASE_HOLD = 1200;   // 각 자동 페이즈에 머무는 시간(ms)

// 페이즈 전환 — 상태 갱신 + UI 요청(bus)
export function setPhase(ph){
  S.currentPhase = ph;
  bus.emit("phase:changed", ph);
}

// 차례 종료(조사자 단계 끝) → 적 단계부터 루프
export function endTurnToEnemy(){
  S.phaseBusy = true;
  enemyPhase();
}
function enemyPhase(){
  setPhase("enemy");
  bus.emit("phase:enemy");              // 3.2 사냥꾼 이동 / 3.3 교전 공격 (전투: 빈 훅)
  setTimeout(upkeepPhase, PHASE_HOLD);
}
function upkeepPhase(){
  setPhase("upkeep");
  S.phasePaused = false;
  bus.emit("phase:upkeep");             // 4.2~4.5 정비(비전투)
  if(S.phasePaused) return;             // 손패 정리(4.5) 대기 → 완료 시 resumeUpkeep()
  setTimeout(mythosPhase, PHASE_HOLD);
}
// 손패 정리 끝나면 호출 → 신화 단계로
export function resumeUpkeep(){ setTimeout(mythosPhase, PHASE_HOLD); }
function mythosPhase(){
  setPhase("mythos");
  S.phasePaused = false;
  bus.emit("phase:mythos");             // 1.2 파멸+1, 1.3 임계 확인, 1.4 조우(보류)
  if(S.phasePaused) return;             // 의제 진행(컷신) → 컷신 끝나면 resumeAfterCutscene가 복귀
  setTimeout(startInvestigatorPhase, PHASE_HOLD);
}
// 조사자 단계 정식 시작 — 잠금 해제(행동력 회복은 bus 처리)
export function startInvestigatorPhase(){
  setPhase("investigation");
  bus.emit("phase:investigation");      // 행동력 회복 등
  S.phaseBusy = false;
}
// 컷신(의제 전진 등) 종료 후 조사자 단계 복귀
export function resumeAfterCutscene(){
  if(S.currentPhase==="investigation") S.phaseBusy = false;   // 조사자 단계 도중 → 잠금만 해제(행동력 유지)
  else startInvestigatorPhase();                              // 다른 단계에서 전진 → 정식 시작(행동력 회복)
}
