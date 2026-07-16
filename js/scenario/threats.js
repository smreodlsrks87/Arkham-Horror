/* =====================================================================
   scenario/threats.js — 위협영역 부착물 · 강제(forced) 효과 · 행동 추가비용.
   위협영역 판별(zone:threat), 장소 부착물(바리케이드·자욱한 안개)의 부착/버림/조건 정리,
   위협영역 카드의 forced 효과(시끄러운 소음·공포에 얼어붙다), 행동력 추가소모(action_surcharge).
   ※ 조사자 백지화·SKILL_KO·조사자 수 세기·출신 버림은 인라인 잔류 → 주입받는다.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { ROOMS } from "./rooms-data.js";
import { updatePiles } from "./piles.js";
import { updateEncounterUI } from "./encounter.js";
import { showPopup, hidePopup } from "./popup.js";
import { discardPlayed } from "./play.js";
import { startSkillTest, applyCommittedDraws, testResultHtml } from "./skilltest.js";
import { cluesInRoom } from "./clues.js";
import { updateLocInfo, renderBarricades, BARRICADE_SVG } from "./map3d.js";   // 장소정보·부착물 마커·바리케이드 아이콘(map3d)
import { runEffect } from "./effects.js";   // 효과 실행 엔진(effects)

// 주입(scenario1 인라인: 출신버림·조사자 수·백지화·능력치 한글명)
let D = {
  discardToOrigin(){}, countInvestigatorsAt:()=>0,
  investigatorBlanked:()=>false, SKILL_KO:{},
};
export function setThreatsDeps(o){ Object.assign(D, o); }

// 이 카드가 위협 영역(threat) 소속인가 — 붉은 테두리·타인 격발 판단에 사용
function cardZone(code){ const a=S.cardAbilities[code]; return a && a.zone ? a.zone : null; }
export function isThreatCard(code){ return cardZone(code)==="threat"; }

/* =====================================================================
   장소 부착물(바리케이드) — SVG 마커를 장소 중앙에 띄움 + 소유자 저장.
   ===================================================================== */
export function attachToLocation(code, roomKey, eff){   // 이벤트·조우가 장소에 붙음(바리케이드·자욱한 안개)
  const nm = S.byCode[code]?S.byCode[code].name:code;
  // 최대 1장/장소(자욱한 안개) — 이미 같은 카드 있으면 부착 못 하고 버림
  if(eff.limit_per_location && (S.locationAttachments[roomKey]||[]).some(a=>a.code===code)){
    addLog(ROOMS[roomKey].name+"에 이미 "+nm+"이(가) 있어 부착하지 못하고 버립니다.");
    D.discardToOrigin(code); updatePiles(); if(typeof updateEncounterUI==="function") updateEncounterUI();
    return;
  }
  const owner = S.activeInvestigator ? S.activeInvestigator.investigator : "self";
  const shroudMod = eff.shroud_mod || 0;
  // occupants: 설치 당시 이 장소의 조사자 수(investigator_leaves용). 안개는 discard_when이 달라 미사용.
  (S.locationAttachments[roomKey] = S.locationAttachments[roomKey] || []).push({ code, owner, blocks:eff.blocks, shroudMod, discardWhen:eff.discard_when, occupants:D.countInvestigatorsAt(roomKey) });
  if(shroudMod){ S.shroudMod[roomKey] = (S.shroudMod[roomKey]||0) + shroudMod; updateLocInfo(); }
  renderBarricades();
  addLog(ROOMS[roomKey].name+"에 "+nm+"을(를) 부착했습니다."+(shroudMod?" (은폐 +"+shroudMod+")":""));
}
export function discardAttachment(a, roomKey, reason){   // 부착물 버림 → 원래 소속 더미(안개=조우, 바리케이드=플레이어)
  if(a.shroudMod){ S.shroudMod[roomKey] = (S.shroudMod[roomKey]||0) - a.shroudMod; updateLocInfo(); }   // 은폐 수정치 원복
  D.discardToOrigin(a.code); updatePiles();
  addLog((S.byCode[a.code]?S.byCode[a.code].name:a.code)+"이(가) 버려졌습니다."+(reason?" ("+reason+")":""));
}
export function sweepAttachmentLeaves(roomKey){   // 인원수가 줄면(누군가 벗어남) investigator_leaves 부착물 버림
  const atts = S.locationAttachments[roomKey]; if(!atts || !atts.length) return;
  const here = D.countInvestigatorsAt(roomKey);
  let changed=false; const stay=[];
  atts.forEach(a=>{
    if(a.discardWhen==="investigator_leaves"){
      if(here < a.occupants){ discardAttachment(a, roomKey, "장소를 벗어남"); changed=true; return; }   // 한 명이라도 빠짐 → 벗어남
      if(here > a.occupants) a.occupants = here;                               // 새로 들어옴 → 기준 상향(도착은 안 버림)
    }
    stay.push(a);
  });
  if(changed){ S.locationAttachments[roomKey] = stay; renderBarricades(); }
}
// 부착물 아이콘/라벨 — 안개는 3D 볼륨으로 방 전체에 깔리므로 아이콘 없이 라벨만(조우 인지용)
export function attachmentIcon(a){ return a.shroudMod ? "" : BARRICADE_SVG; }
export function attachmentLabel(a){ return a.shroudMod ? ("자욱한 안개 (은폐 +"+a.shroudMod+")") : "바리케이드"; }
// 적 이동 훅(적 시스템 이후) — 비정예는 바리케이드 장소로 못 들어옴(출현/소환은 별개)
export function canEnemyEnterLocation(roomKey, enemy){
  const blocked = (S.locationAttachments[roomKey]||[]).some(a=> a.blocks==="non_elite_enemy_movement");
  return !(blocked && !(enemy && enemy.elite));
}
// 조사 성공 시 "부착된 장소 조사되면 버림"(자욱한 안개) 처리
export function discardAttachedOnInvestigate(roomKey){
  const atts = S.locationAttachments[roomKey]; if(!atts||!atts.length) return;
  const stay=[]; let changed=false;
  atts.forEach(a=>{ if(a.discardWhen==="attached_location_investigated"){ discardAttachment(a, roomKey, "조사 성공"); changed=true; } else stay.push(a); });
  if(changed){ S.locationAttachments[roomKey]=stay; renderBarricades(); }
}

/* ===== 위협영역 강제(forced) 효과 · 행동력 추가소모 =====
   시끄러운 소음(end_of_round: 버림) / 공포에 얼어붙다(end_of_turn: 의지3 성공 시 버림 + 라운드 첫 이동·전투·회피 +1행동) */
// 위협영역의 action_surcharge 추가 행동력 '합'. 같은 카드가 2장이면 각 사본이 독립 적용되어 누적된다
// (공포에 얼어붙다 2장 → 그 라운드 첫 이동/전투/회피는 1+1+1 = 행동 3). amount는 데이터(notz)에서 읽는다.
export function frozenSurcharge(type){
  let n=0;
  S.playedCards.forEach(p=> ((S.cardAbilities[p.code]||{}).abilities||[]).forEach(ab=>{
    if(ab.effect==="action_surcharge" && (ab.actions||[]).includes(type)) n += (ab.amount||1);
  }));
  return n;
}
// "첫 1회"는 어느 행동이 대상인지를 정하는 조건 → 라운드당 한 행동만 추가소모(surchargeUsed), 그 양은 사본 수만큼 합산.
export function actionSurchargeFor(type){ return S.surchargeUsed ? 0 : frozenSurcharge(type); }
export function markSurcharge(type){ const x=actionSurchargeFor(type); if(x){ S.surchargeUsed=true; addLog("공포에 얼어붙다 — 이번 라운드 첫 "+({move:"이동",fight:"전투",evade:"회피"}[type])+"에 행동력 "+x+" 추가 소모."); } }
// forced 처리 — jobs를 순차(테스트는 async)로. done() 완료 콜백.
export function processForcedThreat(when, done){
  done = done || function(){};
  const jobs=[];
  S.playedCards.forEach(p=>{ ((S.cardAbilities[p.code]||{}).abilities||[]).forEach(ab=>{ if(ab.timing==="forced" && ab.when===when) jobs.push({p,ab}); }); });
  let i=0; const next=()=>{ if(i>=jobs.length){ done(); return; } const j=jobs[i++]; runForcedThreat(j.p, j.ab, next); };
  next();
}
export function applyForcedEffect(p, eff){
  if(eff.effect==="discard" && eff.target==="self"){ const idx=S.playedCards.indexOf(p); if(idx>=0) discardPlayed(idx); return; }
  runEffect(eff, p);
}
export function runForcedThreat(p, ab, next){
  const name = S.byCode[p.code]?S.byCode[p.code].name:p.code;
  if(ab.test){   // 공포에 얼어붙다: 의지3 성공 시 버림
    startSkillTest({ skill:ab.test.skill, testType:"treachery", difficulty:ab.test.difficulty,
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(rm)=>cluesInRoom(rm).length, blanked:D.investigatorBlanked() },
      actionLabel:name+" (강제)", targetLabel:"난이도",
      onResolve:(r)=>{
        const base={ action:name, skill:ab.test.skill, skillLabel:D.SKILL_KO[ab.test.skill]||ab.test.skill, skillVal:r.base, drawn:r.drawn, total:r.total, target:r.difficulty, targetLabel:"난이도", success:r.success, autoFail:r.autoFail };
        const lines = applyCommittedDraws(r);   // 배짱 등 커밋 드로우 — 강제 위협도 능력 판정이므로 성공 시 적용(누락 버그 수정)
        const ex = (r.success?"성공 — "+name+"을(를) 버립니다.":"실패 — 유지됩니다.") + (lines.length?" "+lines.join(" "):"");
        showPopup(testResultHtml({...base, extra: ex}),
          [{label:"확인", primary:true, act:()=>{ hidePopup(); (r.success?(ab.on_success||[]):(ab.on_failure||[])).forEach(eff=> applyForcedEffect(p, eff)); next(); }}], null, "pb-test "+(r.success?"pb-ok":"pb-no"));
      } });
    return;
  }
  (ab.do||[]).forEach(eff=> applyForcedEffect(p, eff));   // 시끄러운 소음: 즉시 버림
  next();
}
