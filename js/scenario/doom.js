/* =====================================================================
   scenario/doom.js — 파멸 카운트·임계 게이지·필드 파멸원.
   S(agendaDoom·doomThreshold·doomSources)만 읽어 게이지 DOM을 그린다.
   ※ 의제 전진 기계(AGENDA_STAGES·advanceAgenda 등 컷신·조우 결합)는 scenario1에 남는다.
   ※ 적 결합(라운드끝 구울 예고 파멸)은 적 도메인이 setPendingDoomGetter로 주입 → doom은 구울을 모른다.
   ===================================================================== */
import { S } from "./state.js";

let pendingDoomFn = ()=>0;   // 라운드끝 예고 파멸 getter(적 도메인 주입 — 거실·복도 구울 수 등)
export function setPendingDoomGetter(fn){ pendingDoomFn = fn || (()=>0); }

function fieldDoom(){ return S.doomSources.reduce((a,s)=>a+(s.get?s.get():0),0); }   // 필드 파멸원 합
export function totalDoom(){ return S.agendaDoom + fieldDoom(); }                    // 의제 + 필드

export function updateDoom(){
  const field = fieldDoom();
  const sum = S.agendaDoom + field;
  document.getElementById("d-agenda").textContent = S.agendaDoom;
  document.getElementById("d-field").textContent  = field;
  document.getElementById("d-sum").textContent    = sum;
  document.getElementById("d-thr").textContent    = S.doomThreshold;
  // 게이지 높이 + 색 변화(여유→임박→위험)
  const ratio = Math.max(0, Math.min(1, sum/S.doomThreshold));
  const fill = document.getElementById("doom-fill");
  fill.style.height = (ratio*100)+"%";
  let g;
  if(ratio < 0.5)      g = "#4a3a78";   // 여유(보라)
  else if(ratio < 0.8) g = "#9a5a30";   // 임박(주황)
  else                 g = "#a83030";   // 위험(빨강)
  fill.style.background = g;
  // 특별규칙 라운드끝 파멸 예고(적 도메인 주입 getter)
  const pend = pendingDoomFn(), pe = document.getElementById("d-pending");
  if(pe){ if(pend>0){ pe.textContent = "라운드끝 +"+pend; pe.style.display="inline-block"; pe.title="거실·복도의 구울 수만큼 라운드 끝에 파멸이 증가합니다."; } else pe.style.display="none"; }
}

/* 필드 파멸원 등록/해제 — 파멸이 게임에 등장/제거될 때 호출.
   ※ [훅] 합산(fieldDoom)·표시(d-field)·막 전환 시 초기화까지 배선은 끝나 있고,
     아직 "자기 위에 파멸을 놓는 카드"가 구현되지 않아 호출부만 비어 있다.
     그런 카드를 넣을 때 등장/퇴장에서 이 둘을 부르면 된다. (미사용이라고 지우지 말 것) */
export function addDoomSource(id, getter){ S.doomSources.push({id, get:getter}); updateDoom(); }
export function removeDoomSource(id){ S.doomSources = S.doomSources.filter(s=>s.id!==id); updateDoom(); }
