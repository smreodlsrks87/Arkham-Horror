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

// 세대(generation) 카운터 — 자동 페이즈 이중 진행 방지.
// 핸들러(bus 리스너)가 동기적으로 resumeX를 부르면 gen이 올라가, emit 뒤 fall-through가 자기 세대가
// 아님을 보고 진행을 건너뜀. (예: 적 공격이 팝업 없이 즉시 끝나 resumeEnemy가 동기 호출되는 경우)
let advanceGen = 0;
function runPhase(name, event, nextFn){
  setPhase(name);
  S.phasePaused = false;
  const g = ++advanceGen;
  bus.emit(event);
  if(S.phasePaused) return;             // 나중에 resumeX가 진행
  if(g !== advanceGen) return;          // 핸들러가 이미 동기적으로 진행함 → 이중 방지
  advanceGen++;
  setTimeout(nextFn, PHASE_HOLD);
}
// 차례 종료(조사자 단계 끝) → 적 단계부터 루프
export function endTurnToEnemy(){
  S.phaseBusy = true;
  enemyPhase();
}
function enemyPhase(){ runPhase("enemy", "phase:enemy", upkeepPhase); }        // 3.2 사냥꾼 이동 / 3.3 교전 공격
// 적 공격 할당(팝업) 끝난 뒤 정비 단계로. advanceGen++ = 동기 호출 시 fall-through 취소, 비동기면 무해.
export function resumeEnemy(){ advanceGen++; S.phasePaused=false; setTimeout(upkeepPhase, PHASE_HOLD); }
function upkeepPhase(){ runPhase("upkeep", "phase:upkeep", mythosPhase); }      // 4.2~4.5 정비(비전투)
// 손패 정리 끝나면 호출 → 신화 단계로
export function resumeUpkeep(){ advanceGen++; S.phasePaused=false; setTimeout(mythosPhase, PHASE_HOLD); }
function mythosPhase(){ runPhase("mythos", "phase:mythos", startInvestigatorPhase); }   // 1.2 파멸+1, 1.3 임계, 1.4 조우
// 조사자 단계 정식 시작 — 잠금 해제(행동력 회복은 bus 처리)
export function startInvestigatorPhase(){
  setPhase("investigation");
  S.phaseBusy = false;                   // emit 전에 잠금 해제 → 핸들러의 렌더가 "지금 사용 가능"을 반영(자산 초록 테두리 등)
  bus.emit("phase:investigation");       // 행동력 회복 등
}
// 컷신(의제 전진 등) 종료 후 조사자 단계 복귀
export function resumeAfterCutscene(){
  advanceGen++;   // 동기 호출 시 mythos fall-through의 이중 진행 방지(비동기면 무해)
  if(S.currentPhase==="investigation") S.phaseBusy = false;   // 조사자 단계 도중 → 잠금만 해제(행동력 유지)
  else startInvestigatorPhase();                              // 다른 단계에서 전진 → 정식 시작(행동력 회복)
}
