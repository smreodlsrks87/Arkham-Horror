/* =====================================================================
   scenario/encounter-resolve.js — 조우/치레커리 해결(신화 1.4).
   조우덱 뽑기 → 공개 연출 → 배치/등장/폭로테스트 → 폭로효과 적용. 조우 카드 상단 고정 표시.
   ※ roomStagePos(3D 투영)은 map3d, runEffect·피해할당은 effects.js·damage.js에서 import. encDiscard·isEncounterCard 등은 인라인 잔류→주입.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { toStageX, toStageY } from "../shared/stage.js";
import { cardFront, cardTextOf } from "./card-img.js";
import { cleanText } from "../shared/card-text.js";
import { updateEncounterUI } from "./encounter.js";
import { resumeAfterCutscene } from "./phases.js";
import { initialUses, onEnterPlay } from "./abilities.js";
import { renderPlayArea, discardPlayed } from "./play.js";
import { startSkillTest, encCardHeaderHtml, testResultHtml, applyCommittedDraws } from "./skilltest.js";
import { showPopup, hidePopup, showCardPickPopup } from "./popup.js";
import { spawnEnemy, enemySpawnRoom, isGhoul } from "./enemy.js";
import { shuffle, SKILL_KO } from "./util.js";
import { audio } from "../shared/audio.js";
import { roomStagePos } from "./map3d.js";   // 3D 투영(map3d)
import { attachToLocation } from "./threats.js";   // 장소 부착(자욱한 안개 등 — threats)
import { takeDamageHorror } from "./damage.js";   // 조사자 피해·공포 할당(damage)
import { runEffect } from "./effects.js";   // 효과 실행 엔진(effects)
import { cluesInRoom } from "./clues.js";

// 주입(scenario1 인라인: 조우버림·데이터).
let D = {
  encDiscard(){}, isEncounterCard:()=>false, SKILL_KO:{}, investigatorBlanked:()=>false,
};
export function setEncResolveDeps(o){ Object.assign(D, o); }

export function drawEncounterPhase(){
  let order=null; try{ order=JSON.parse(localStorage.getItem("arkham_player_order")); }catch(_){}
  const drawers = (order && order.length) ? order : [ S.activeInvestigator ? S.activeInvestigator.investigator : "self" ];
  drawOneEncounter(drawers[0]);   // 지금은 1인(첫 조사자)만. 다인 순차는 이후.
}

export function drawOneEncounter(inv){
  if(!S.encounterDeck.length){
    // 조우덱 소진 → 뽑아야 하면 조우 버린 더미를 섞어 새 조우덱 (공포 없음). surge 등 후속 뽑기도 이 경로.
    if(S.encounterDiscard.length){
      S.encounterDeck = S.encounterDiscard.slice(); S.encounterDiscard.length = 0;
      shuffle(S.encounterDeck);
      audio.sfx("card-shuffle");
      addLog("신화 1.4 — 조우덱이 비어 버린 더미를 섞어 새 조우덱을 만들었습니다.");
      updateEncounterUI();
    } else {   // 덱·버린 더미 모두 비면 못 뽑음(멈추지 않게 재개)
      addLog("신화 1.4 — 조우덱·버린 더미가 모두 비어 뽑지 못했습니다."); S.phasePaused=false; resumeAfterCutscene(); return;
    }
  }
  const card = S.encounterDeck.shift(); updateEncounterUI();
  addLog("신화 1.4 — 조우 뽑기: "+card.name+".");
  S.phasePaused = true;   // 공개 연출·해결이 끝날 때까지 신화 단계 정지
  revealEncounterCard(card.code, ()=>{
    resolveEncounter(card.code, ()=>{ S.phasePaused=false; resumeAfterCutscene(); });   // 해결 끝 → 조사자 단계로
  });
}

export function rectStageCenter(el){
  const r=el.getBoundingClientRect();
  return { x: toStageX(r.left+r.width/2), y: toStageY(r.top+r.height/2) };
}

export function encRevealDest(code){
  const a=S.cardAbilities[code]||{}, c=S.byCode[code]||{};
  if(c.type_code==="enemy"){ const room=enemySpawnRoom(code); if(room) return roomStagePos(room); }   // 적 = 등장 장소. 장소가 게임에 없으면(null) → 아래 조우 버린 더미로 날아감
  if(a.on_draw==="attach_to_location") return roomStagePos(S.cur);                                                 // 부착(안개) = 현재 장소
  if(a.on_draw==="put_into_play"){ const pa=document.getElementById("play-area"); if(pa) return rectStageCenter(pa); }   // 위협영역 = 플레이 영역
  if(!D.isEncounterCard(code)){ const pd=document.getElementById("discard-pile"); if(pd) return rectStageCenter(pd); }  // 플레이어 약점(편집증 등) = 플레이어 버린 더미
  const dp=document.getElementById("enc-discard"); if(dp) return rectStageCenter(dp);                            // 조우 즉효 = 조우 버린 더미
  return { x:1650, y:420 };
}

export function revealEncounterCard(code, after, opts){
  opts = opts || {};
  const c=S.byCode[code]||{};
  const stage=document.getElementById("stage");
  const d=document.createElement("div"); d.className="enc-reveal";
  d.innerHTML='<img src="'+cardFront(code)+'" alt="">'+
    '<div class="er-info"><h5>'+(c.name||code)+'</h5>'+
    (c.traits?'<div class="er-txt" style="color:var(--muted);font-size:13px;margin-bottom:5px;">'+c.traits+'</div>':"")+
    (cardTextOf(code)?'<div class="er-txt">'+cleanText(cardTextOf(code))+'</div>':"")+
    '<div class="er-hint">클릭하면 바로 진행</div></div>';
  // 딤 배경(어디를 클릭해도 진행)
  const dim=document.createElement("div"); dim.className="enc-reveal-dim"; stage.appendChild(dim);
  // 시작 위치 = 조우덱(기본) 또는 지정 더미(약점=플레이어 덱)
  const encPile=document.getElementById(opts.startEl||"enc-draw");
  const start = encPile ? rectStageCenter(encPile) : {x:1650, y:320};
  d.style.left=start.x+"px"; d.style.top=start.y+"px"; d.style.opacity="0";
  stage.appendChild(d);
  let phase=0;   // 0=표시중 1=날아감
  const flyOut=()=>{
    if(phase===1) return; phase=1;
    dim.remove();
    const dest=encRevealDest(code);
    d.classList.add("er-out");
    d.style.left=dest.x+"px"; d.style.top=dest.y+"px";
    setTimeout(()=>{ d.style.opacity="0"; }, 450);
    setTimeout(()=>{ d.remove(); after(); }, 700);   // 도착 → 실제 해결(배치·등장·테스트)
  };
  dim.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); flyOut(); });
  d.addEventListener("pointerdown", (e)=>{ e.stopPropagation(); flyOut(); });   // 카드/아래 클릭 = 진행
  requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
    d.style.opacity="1";
    d.style.left="960px"; d.style.top="440px";   // 화면 중앙(살짝 위)
  }); });   // 자동 진행 없음 — 클릭할 때까지 대기
}

export function resolveEncounter(code, done){
  done = done || function(){};
  const a=S.cardAbilities[code]||{}, c=S.byCode[code]||{}, name=c.name||code, nd=a.on_draw;
  if(nd==="put_into_play"){ S.playedCards.push({code, uses:initialUses(code)}); onEnterPlay(code); renderPlayArea(); addLog("폭로 — "+name+" 위협영역에 놓임."); done(); return; }
  if(nd==="attach_to_location"){ attachToLocation(code, S.cur, a); done(); return; }
  if(nd==="resolve_and_discard"){ resolveTreachery(code, a, done); return; }
  if(c.type_code==="enemy"){ spawnEnemy(code); done(); return; }   // 적 = 게임판에 등장(조우덱에서 빠짐)
  D.encDiscard(code); done();
}

export function resolveTreachery(code, a, done){
  const ab=(a.abilities||[])[0]||{}, name=(S.byCode[code]||{}).name||code;
  const finish=()=>{ hidePersistentCard(); D.encDiscard(code); done(); };
  if(ab.revelation_test){
    S.phasePaused=true;   // 폭로 테스트 동안 신화 페이즈 멈춤
    // 조우 카드는 커밋 팝업 안에 합쳐 표시(startSkillTestInner) → 커밋 진입 후엔 상단 고정으로 유지
    startSkillTest({ skill:ab.revelation_test.skill, testType:"treachery", difficulty:ab.revelation_test.difficulty, cardCode:code,
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(rm)=>cluesInRoom(rm).length, blanked:D.investigatorBlanked() },
      actionLabel:name, targetLabel:"난이도",
      onResolve:(r)=> showRevelationResult(ab, r, name, ()=> runRevEffects(r.success?(ab.on_success||[]):(ab.on_failure||[]), r, finish)) });
  } else { (ab.do||[]).forEach(eff=> runEffect(eff, null)); finish(); }
}

let persistentCardEl=null;

export function showPersistentCard(code, extraHtml, opts){
  hidePersistentCard();
  opts = opts||{};
  persistentCardEl=document.createElement("div"); persistentCardEl.className="persist-enc"+(opts.center?" pe-center":"");
  persistentCardEl.innerHTML=encCardHeaderHtml(code) + (extraHtml||"");   // 커밋 팝업과 동일 레이아웃 + (선택)커밋 지시문
  document.getElementById("stage").appendChild(persistentCardEl);
}

export function hidePersistentCard(){ if(persistentCardEl){ persistentCardEl.remove(); persistentCardEl=null; } }

export function showRevelationResult(ab, r, name, next){
  const base={ action:name, skill:ab.revelation_test.skill, skillLabel:SKILL_KO[ab.revelation_test.skill]||ab.revelation_test.skill,
    skillVal:r.base, drawn:r.drawn, total:r.total, target:r.difficulty, targetLabel:"난이도", success:r.success, autoFail:r.autoFail };
  const lines = applyCommittedDraws(r);   // 배짱 등 커밋 드로우(모든 판정 성공 시)
  const ex = (r.success?"성공 — 효과 없음.":"실패 — 효과 적용.") + (lines.length?" "+lines.join(" "):"");
  showPopup(testResultHtml({...base, extra: ex}),
    [{label:"확인", primary:true, act:()=>{ hidePopup(); next(); }}], null, "pb-test "+(r.success?"pb-ok":"pb-no"));
}

export function runRevEffects(effs, r, done){ let i=0; const next=()=>{ if(i>=effs.length){ done(); return; } applyRevEffect(effs[i++], r, next); }; next(); }

export function revAmount(spec, r){
  if(typeof spec==="number") return spec;
  // 촉수(autoFail) 시 능력값을 0으로 취급 → fail_by = 난이도 전체 (룰: 자동실패는 스킬값 0으로 실패폭 계산)
  if(spec==="fail_by") return Math.max(0, r.difficulty - (r.autoFail ? 0 : r.total));
  if(spec==="success_by") return Math.max(0, r.total - r.difficulty);
  if(spec && typeof spec==="object"){ let v=revAmount(spec.value, r); if(spec.min!=null)v=Math.max(spec.min,v); if(spec.max!=null)v=Math.min(spec.max,v); return v; }
  return 0;
}

/* 혼돈 토큰(어려움 해골) 효과 —
   룰: "실패 시, 이 판정 후에 조우덱과 버린 더미에서 구울 적을 찾아 뽑는다. 그 뒤 조우덱을 섞는다."
   찾는 곳(덱/버린더미)에 우선순위가 없으므로 어느 쪽이든 플레이어가 고른다.
   (구울 사제는 따로 세팅돼 덱·버린더미에 없으므로 자연히 후보에서 빠진다)
   고른 구울은 spawnEnemy가 등장 장소를 판정 — 지정 장소(다락·지하)가 아직 게임에 없으면 조우 버린 더미로. */
export function spawnGhoulFromEncounter(done){
  done = done || function(){};
  // ※ 조우덱·버린 더미는 코드 문자열이 아니라 {code,name,imagesrc} 객체를 담는다(buildEncounterDeck·encDiscard).
  const codeOf = (c)=> (c && typeof c === "object") ? c.code : c;
  const picks = [];
  (S.encounterDeck   || []).forEach((c,i)=>{ if(isGhoul(codeOf(c))) picks.push({ code:codeOf(c), zone:"deck",    i }); });
  (S.encounterDiscard|| []).forEach((c,i)=>{ if(isGhoul(codeOf(c))) picks.push({ code:codeOf(c), zone:"discard", i }); });
  if(!picks.length){ addLog("혼돈 토큰(해골) — 조우덱·버린 더미에 구울이 없어 등장하지 않았습니다."); done(); return; }

  const take = (sel)=>{
    const arr = (sel.zone==="deck") ? S.encounterDeck : S.encounterDiscard;
    arr.splice(sel.i, 1);                 // 찾은 곳에서 꺼냄
    shuffle(S.encounterDeck);             // 룰: 찾은 뒤 조우덱을 섞는다
    updateEncounterUI();
    const nm = (S.byCode[sel.code]||{}).name || sel.code;
    addLog("혼돈 토큰(해골) — "+nm+"을(를) "+(sel.zone==="deck"?"조우덱":"버린 더미")+"에서 찾아 뽑습니다. (조우덱을 섞습니다)");
    spawnEnemy(sel.code);                 // 등장 장소가 게임에 없으면 spawnEnemy가 버린 더미로 보냄
    done();
  };
  if(picks.length===1){ take(picks[0]); return; }
  // 후보가 여럿 — 일러스트로 고르기(호버 시 카드 텍스트)
  showCardPickPopup("혼돈 토큰(해골) — 등장시킬 구울을 고르세요. (조우덱·버린 더미)",
    picks.map(p=>p.code), (code, idx)=> take(picks[idx]));
}

export function applyRevEffect(eff, r, next){
  if(eff.effect==="damage_investigator"){ takeDamageHorror(revAmount(eff.damage, r), 0, {direct:!!eff.direct}, next); return; }
  if(eff.effect==="horror"){ takeDamageHorror(0, revAmount(eff.value, r), {direct:!!eff.direct}, next); return; }
  if(eff.effect==="discard_owned_asset"){ discardOwnedAsset(eff, next); return; }
  runEffect(eff, null); next();
}

export function discardOwnedAsset(eff, next){   // 통제 자산 1개 버림: 1개=자동, 2+=일러스트 팝업, 0개=fallback(피해2)
  const idxs = S.playedCards.map((p,i)=>i).filter(i=> (S.byCode[S.playedCards[i].code]||{}).type_code==="asset");
  if(!idxs.length){ (eff.fallback||[]).forEach(fx=> applyRevEffect(fx, {difficulty:0,total:0}, ()=>{})); addLog("버릴 자산이 없어 대체 효과를 받습니다."); next(); return; }
  if(idxs.length===1){ discardPlayed(idxs[0]); next(); return; }
  showCardPickPopup("버릴 자산을 선택하세요 (으스스한 한기)", idxs.map(i=>S.playedCards[i].code), (chosen, pi)=>{
    discardPlayed(idxs[pi]); next();   // 인덱스로 정확히(같은 카드 2장 대비)
  });
}
