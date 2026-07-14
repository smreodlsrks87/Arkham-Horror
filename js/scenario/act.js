/* =====================================================================
   scenario/act.js — 시나리오 진행(막·의제) 로직.
   목표 표시, 의제 파멸 전진(컷신·특별규칙·구울소환), 막 조건·전진버튼, 장소 승점.
   ※ 맵 재구성(advanceToMansion/advanceToAct3 등)·신화/정비 파멸증가(phase 버스 핸들러)는
     3D/phase 계층에 남기고 주입/호출한다.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { totalDoom, updateDoom, setPendingDoomGetter } from "./doom.js";
import { playCutsceneSequence, csActive } from "./cutscene.js";
import { resumeAfterCutscene } from "./phases.js";
import { drawEncounterPhase, rectStageCenter } from "./encounter-resolve.js";
import { updateEncounterUI } from "./encounter.js";
import { shuffle } from "./util.js";
import { cardFront } from "./card-img.js";
import { isGhoul, ghoulsInRoom, spawnEnemy } from "./enemy.js";
import { showPopup, showForcedPopup, hidePopup } from "./popup.js";
import { renderHand } from "./hand.js";
import { updatePiles } from "./piles.js";
import { audio } from "../shared/audio.js";

// 주입(scenario1 인라인: 종료·피해·3D투영·조우버림·마커·데이터·막전환).
let D = {
  endScenario(){}, takeDamageHorror(d,h,o,cb){ if(cb) cb(false); }, roomStagePos:()=>({x:0,y:0}),
  encDiscard(){}, renderEnemyMarkers(){}, ROOMS:{}, ROOM_INFO:{}, cluesInRoom:()=>[],
  advanceToMansion(){}, advanceToAct3(){},
};
export function setActDeps(o){ Object.assign(D, o); }

const AGENDA3A_RULE_TEXT = "1. 교전 중이지 않은 <b>구울</b> 적은 매 라운드(적 단계) <b>거실</b>을 향해 최단 경로로 1칸씩 이동합니다.<br>2. 라운드가 끝날 때 <b>거실</b>과 <b>복도</b>에 있는 구울 적의 수만큼 <b>파멸</b>이 증가합니다.";

let lastGoalText = "—";

export function updateGoal(text){
  lastGoalText = text;
  const rule = S.agenda3aRule
    ? ' <span class="goal-rule">특별 규칙<div class="goal-rule-tip"><b class="hl">특별 규칙</b><br>'+AGENDA3A_RULE_TEXT+'</div></span>'
    : "";
  document.getElementById("tr-goal").innerHTML = "목표: <b>"+text+"</b>"+rule;
}

export function refreshGoal(){ updateGoal(lastGoalText); }   // 특별규칙 박스 토글 등 재렌더

export function setActGoal(multiplier, prefix, suffix){
  S.actGoalClues = S.playerCount * multiplier;
  const text = (prefix||"") + "단서(" + S.actGoalClues + ")" + (suffix||"를 모아라");
  updateGoal(text);
}

function pendingGhoulDoom(){ return S.agenda3aRule ? (ghoulsInRoom("parlor")+ghoulsInRoom("hallway")) : 0; }

setPendingDoomGetter(pendingGhoulDoom);   // 적 결합 예고 파멸을 doom 게이지에 주입

export function checkAgendaAdvance(){
  if(totalDoom() >= S.doomThreshold){
    advanceAgenda();
    return true;
  }
  return false;
}

const AGENDA_STAGES = {
  3:  { cutscene:"agenda1b", next:7,    follow:"agenda2a", effect:agenda1bEffect },
  7:  { cutscene:"agenda2b", next:10,   follow:"agenda3a", effect:agenda2bAndActivate3a },
  10: { cutscene:"agenda3b", next:null, follow:null, effect:agenda3bEnding },   // 마지막 — 시나리오 종료
};

export function agenda3bEnding(){
  D.endScenario(S.currentAct>=3 ? 0 : 3);
}

export function agenda2bAndActivate3a(done){
  done = done || function(){};
  agenda2bEffect(()=>{           // "깊은 곳에서…" + 구울 등장이 끝난 뒤
    S.agenda3aRule = true;
    refreshGoal();               // 목표 옆 '특별 규칙' 배지 표시
    showPopup('<div style="font-size:19px;line-height:1.75;">지금부터 <b class="hl">특별 규칙</b>이 적용됩니다.</div>'+
      '<div style="font-size:17px;line-height:1.8;text-align:left;margin:16px auto 0;max-width:520px;">'+
      '<div style="margin-bottom:12px;">1. 교전 중이지 않은 <b>구울</b> 적은 매 라운드(적 단계) <b>거실</b>을 향해<br>&nbsp;&nbsp;최단 경로로 1칸씩 이동합니다.</div>'+
      '<div>2. 라운드가 끝날 때 <b>거실</b>과 <b>복도</b>에 있는 구울 적의 수만큼<br>&nbsp;&nbsp;<b class="hl">파멸</b>이 증가합니다.</div></div>'+
      '<div style="font-size:14px;color:var(--muted);margin-top:16px;">이 규칙은 언제든 <b>목표 오른쪽의 ‘특별 규칙’ 배지</b>에 마우스를 올려 다시 확인할 수 있습니다.</div>',
      [{label:"확인", primary:true, act:()=>{ hidePopup(); done(); }}]);
  });
}

export function agenda1bEffect(done){
  done = done || function(){};
  showForcedPopup('<div style="font-size:17px;line-height:1.75;">사건이 깊어질수록, 조사자 일행의 등 뒤로 서늘한 어둠이 스며듭니다. 무언가 크게 잘못되어 가고 있음을 직감합니다…<br><br><b class="hl">아래 두 선택지 중 하나를 반드시 골라야 합니다.</b></div>', [
    {label:"각 조사자, 손패에서 무작위 1장 버림", act:()=>{ hidePopup(); discardRandomEachInvestigator(); done(); }},
    {label:"대표조사자, 공포 2를 받음", act:()=>{ hidePopup(); D.takeDamageHorror(0, 2, {source:"agenda"}, done); }},
  ]);   // 강제 택1(우클릭·취소 불가) · 두 버튼 모두 활성색 · 세로 배치
}

export function discardRandomEachInvestigator(){
  // 1인: 활성 조사자만. [다인 훅] order의 각 조사자 손패에서 무작위 1장
  if(!S.playerHand.length){ addLog("의제: 버릴 손패가 없습니다."); return; }
  const i = Math.floor(Math.random()*S.playerHand.length);
  const code = S.playerHand.splice(i,1)[0]; S.playerDiscard.push(code);
  renderHand(); updatePiles();
  addLog("의제 — 손패에서 무작위로 "+(S.byCode[code]?S.byCode[code].name:code)+"을(를) 버렸습니다.");
}

export function encStackPos(id){ const el=document.getElementById(id); return el ? rectStageCenter(el) : {x:1650,y:420}; }

export function flyCard(imgUrl, from, to, ms, onArrive){
  const stage=document.getElementById("stage");
  const el=document.createElement("div"); el.className="fly-card";
  el.innerHTML='<img src="'+imgUrl+'" alt="">';
  el.style.left=from.x+"px"; el.style.top=from.y+"px";
  stage.appendChild(el);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    el.style.transition="left "+ms+"ms cubic-bezier(.3,.85,.35,1), top "+ms+"ms cubic-bezier(.3,.85,.35,1), transform "+ms+"ms ease";
    el.style.left=to.x+"px"; el.style.top=to.y+"px";
  }));
  setTimeout(()=>{ el.remove(); if(onArrive) onArrive(); }, ms+40);
}

export function agenda2bEffect(done){
  done = done || function(){};
  showForcedPopup('<div style="font-size:17px;line-height:1.75;">깊은 곳에서 무언가가 깨어납니다. 버려졌던 것들이 되살아나 어둠 속을 헤집으며 기어 나옵니다…<br><br><b class="hl">버린 조우 더미가 조우덱으로 되돌아가 뒤섞이고, 그 속에서 무언가가 튀어나옵니다.</b></div>', [
    {label:"진행", act:()=>{ hidePopup(); agenda2bResolve(done); }},
  ]);
}

export function agenda2bResolve(done){
  done = done || function(){};
  // 1) 버린 조우 → 조우덱으로 한 장씩 빨려 들어가는 연출
  const discards = S.encounterDiscard.slice();
  S.encounterDiscard.length = 0; updateEncounterUI();
  let di = 0;
  const flyIn = ()=>{
    if(di >= discards.length){
      shuffle(S.encounterDeck); updateEncounterUI();
      audio.sfx("card-shuffle");
      addLog("의제2b — 버린 조우 더미를 조우덱에 섞었습니다.");
      setTimeout(drawStep, 450);
      return;
    }
    const card = discards[di++];
    S.encounterDeck.push(card); updateEncounterUI();
    flyCard(cardFront(card.code), encStackPos("enc-discard"), encStackPos("enc-draw"), 260, null);
    setTimeout(flyIn, 110);
  };
  // 2) 맨 위부터 한 장씩 버리다 구울이 나오면 조사자 앞으로 날려 교전 등장
  const drawStep = ()=>{
    if(!S.encounterDeck.length){ addLog("의제2b — 조우덱에 구울이 없습니다."); done(); return; }
    const card = S.encounterDeck.shift(); updateEncounterUI();
    if(isGhoul(card.code)){
      flyCard(cardFront(card.code), encStackPos("enc-draw"), D.roomStagePos(S.cur), 650, ()=>{
        spawnEnemy(card.code);
        const en = S.enemies[S.enemies.length-1];
        if(en){ en.room = S.cur; en.engaged = true; if(typeof D.renderEnemyMarkers==="function") D.renderEnemyMarkers(); }
        addLog("의제2b — "+card.name+"이(가) "+(D.ROOMS[S.cur]?D.ROOMS[S.cur].name:S.cur)+"에 나타나 대표조사자와 교전합니다!");
        done();
      });
      return;
    }
    D.encDiscard(card.code);
    flyCard(cardFront(card.code), encStackPos("enc-draw"), encStackPos("enc-discard"), 300, null);
    setTimeout(drawStep, 340);
  };
  flyIn();
}

export function advanceAgenda(){
  const stage = AGENDA_STAGES[S.doomThreshold];
  const cut = stage ? stage.cutscene : "agenda1b";
  // 파멸 구슬이 가득 찬 상태를 먼저 보여주고(2초), 그 뒤에 의제 컷신 묶음 재생
  S.phaseBusy = true;    // 구슬 참~컷신 시작(2초)까지도 조작 잠금(틈 방지)
  updateDoom();
  setTimeout(()=>{
    // 묶음 구성: [Xb] 또는 [Xb, (X+1)a]. 묶음이 끝나면 조사자 단계로 복귀(잠금 해제).
    const ids = [cut];
    if(stage && stage.follow) ids.push(stage.follow);
    // 첫 컷신(Xb)이 끝난 직후 파멸 처리를 해야 하므로, playCutscene 콜백 대신
    // 묶음 시작 전에 "b 컷신 후 처리"를 예약할 수 없어 → 묶음 함수에 afterFirst 훅을 쓴다.
    playCutsceneSequence(ids, ()=>{
      // 묶음 전체 종료 → 의제 b면 효과(강제 선택) → (신화 1.3 진행이면) 1.4 조우 뽑기 후 재개 / 아니면 조사자 단계
      const proceed = ()=>{ if(S.pendingEncounter){ S.pendingEncounter=false; drawEncounterPhase(); } else resumeAfterCutscene(); };
      if(stage && stage.effect) stage.effect(proceed);
      else proceed();
    }, 2000, ()=>{
      // afterFirst: 첫 컷신(Xb) 끝난 직후 실행 — 파멸 초기화·임계치 상승
      clearAllDoom();
      if(stage && stage.next!=null){
        S.doomThreshold = stage.next;
        updateDoom();
        addLog("의제가 진행되었습니다. 다음 임계치: 파멸 "+S.doomThreshold+".");
      }else{
        addLog("최종 의제에 도달했습니다.");
      }
    });
  }, 2000);
}

export function clearAllDoom(){
  S.agendaDoom = 0;
  S.doomSources = [];       // 등록된 모든 필드 파멸원 제거
  updateDoom();
}

export function locationVictoryPoints(){
  let v=0;
  Object.keys(D.ROOM_INFO).forEach(k=>{
    const info=D.ROOM_INFO[k];
    if(!info.victory || !D.ROOMS[k]) return;
    if(D.ROOMS[k].stage!==S.currentStage) return;        // 게임에 없던 장소(서재 단계 종료 등)는 제외
    if(D.cluesInRoom(k).length===0) v += info.victory; // 단서를 전부 회수한 장소만
  });
  return v;
}

export function defeatGhoulPriest(){
  if(S.currentAct!==3) return;             // 3막에서만
  addLog("구울 사제를 쓰러뜨렸습니다.");
  hideAdvanceButton();
  // 최종 컷신 [act3b] → 강제 택1(우클릭·취소 불가): 집을 불태운다(결말1) / 불태우지 않는다(결말2)
  playCutsceneSequence(["act3b"], ()=>{
    showForcedPopup('<div style="font-size:17px;line-height:1.75;">구울들의 소굴이 된 이 저택을 이대로 둘 수는 없습니다.<br>하지만 이곳은 당신의 집이기도 합니다…<br><br><b class="hl">어떻게 하시겠습니까?</b></div>', [
      {label:"집을 불태운다", act:()=>{ hidePopup(); D.endScenario(1); }},
      {label:"집을 불태우지 않는다", act:()=>{ hidePopup(); D.endScenario(2); }},
    ]);
  }, 2000);
}

const ACT_STAGES = {
  1: { goal:"서재에서 단서(N)를 모아라", locationKey:"study",   clueMult:2, killTarget:null },
  2: { goal:"복도에서 단서(N)를 모아라", locationKey:"hallway", clueMult:3, killTarget:null },
  3: { goal:"구울 사제를 쓰러뜨려라!",   locationKey:null,       clueMult:0, killTarget:"ghoul_priest" },
};

export function cluesAtLocation(roomKey){
  let sum = 0;
  if(S.cur === roomKey) sum += S.invClue;   // 조사자가 그 장소에 있으면 그 단서 합산
  return sum;
}

export function actCluesNeeded(){
  const st = ACT_STAGES[S.currentAct];
  if(!st) return 0;
  return S.playerCount * st.clueMult;
}

export function advanceConditionMet(){
  const st = ACT_STAGES[S.currentAct];
  if(!st) return false;
  if(st.killTarget) return false;   // 적 처치형(act3) — 단서 조건 아님, 별도 처리
  if(!st.locationKey) return false;
  return cluesAtLocation(st.locationKey) >= actCluesNeeded();
}

export function setActGoalText(){
  const st = ACT_STAGES[S.currentAct];
  if(!st){ updateGoal("—"); return; }
  const text = st.goal.replace("(N)", "("+actCluesNeeded()+")");
  updateGoal(text);
}

export function beginAct(n){
  S.currentAct = n;
  advanceReady = false;
  hideAdvanceButton();
  setActGoalText();
  checkActCondition();
}

const advanceBtn = document.getElementById("advance-btn");

export let advanceReady = false;

let actTipShown = false;   // 진행 안내 팝업(초보자 팁)을 이미 띄웠는지 — 1막에서 한 번만

export function checkActCondition(){
  const met = advanceConditionMet();
  // 버튼 표시/숨김은 조건에 따라 항상 갱신
  if(met) showAdvanceButton(); else hideAdvanceButton();
  advanceReady = met;
}

export function maybeShowAdvanceTip(){
  if(S.currentAct===1 && !actTipShown && advanceConditionMet()){
    actTipShown = true;
    showPopup('제시된 목표를 완수하여 지도 좌측 상단에 활성화 된 <span class="hl">이야기 진행</span> 버튼을 눌러 이야기를 진행할 수 있게 되었습니다.',
      [{label:"확인", primary:true, act:hidePopup}]);
  }
}

export function checkAdvanceCondition(){ checkActCondition(); }

export function showAdvanceButton(){ advanceBtn.style.display="block"; }

export function hideAdvanceButton(){ advanceBtn.style.display="none"; }

advanceBtn.onclick = ()=>{
  // 조사자 단계가 아니거나 입력 잠금 중이면 진행 불가(버튼이 남아있어도 실행 안 함)
  if(S.currentPhase!=="investigation" || S.phaseBusy || csActive) return;
  // 현재 막에 따라 다른 전진 처리(1막→2막, 2막→3막)
  const doAdvance = ()=>{
    hidePopup();
    if(S.currentAct===1) D.advanceToMansion();
    else if(S.currentAct===2) D.advanceToAct3();
  };
  showPopup('이야기를 진행합니다.<br>다음 국면으로 넘어갑니다…',
    [{label:"취소", act:hidePopup},
     {label:"진행", primary:true, act:doAdvance}]);
};
