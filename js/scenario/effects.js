/* =====================================================================
   scenario/effects.js — 효과 실행 엔진.
   EFFECTS 테이블("데이터 + 처리기 하나") + runEffect 진입점 + 그 효과들이 쓰는 공용 동작:
   자원 획득·카드 뽑기(빈 덱 규칙 포함)·폭로(on_draw) 처리·덱 검색/맨위보기·기억상실 버림·
   장소 선택 효과·자동 페이즈 재개.
   ※ 소리·연출(playCoinSound·flyLastCardFromDeck)·출신 버림·정비 자원·약점 판별·카드선택 팝업 등
     시나리오 인라인 잔류분은 setEffectsDeps로 주입받는다.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { shuffle } from "./util.js";
import { audio } from "../shared/audio.js";
import { showPopup, showForcedPopup, hidePopup, showToast } from "./popup.js";
import { renderInvestigator } from "./investigator.js";
import { renderHand } from "./hand.js";
import { updatePiles } from "./piles.js";
import { renderPlayArea } from "./play.js";
import { initialUses, onEnterPlay } from "./abilities.js";
import { ROOMS, ADJ } from "./rooms-data.js";
import { cluesInRoom, discoverClues } from "./clues.js";
import { enemiesAt, damageEnemy, startFightAction, spawnEnemy } from "./enemy.js";
import { revealEncounterCard } from "./encounter-resolve.js";
import { totalDoom, updateDoom } from "./doom.js";
import { checkAgendaAdvance } from "./act.js";
import { resumeUpkeep, resumeEnemy, resumeAfterCutscene } from "./phases.js";
import { takeDamageHorror, applyToInvestigator } from "./damage.js";   // 조사자 피해·공포 할당·직접 적용(damage)

// 주입(scenario1 인라인: 소리·연출·출신버림·정비자원·약점판별·카드선택·처치반응·능력치 한글명)
let D = {
  playCoinSound(){}, flyLastCardFromDeck(){}, discardToOrigin(){}, gainUpkeepResource(){},
  isWeakness:()=>false, showCardPickPopup(){}, flushDefeatReaction(){}, SKILL_KO:{},
};
export function setEffectsDeps(o){ Object.assign(D, o); }

// ★ 자원 획득 단일 경로 — 어떤 방법으로 얻든 이걸 거치면 소리·표시가 함께 처리됨(앞으로 자원 획득은 이걸로).
export function gainResources(v){ S.invResource += (v||0); renderInvestigator(); D.playCoinSound(); }

// 공용 카드 뽑기 — 덱→손패 연출 포함. 모든 드로우가 이 한 곳을 거치게(애니메이션 누락 방지). 실제 뽑은 수 반환.
export function drawCards(n){
  let drew=0, toHand=0;
  for(let k=0;k<(n||1);k++){
    if(!S.playerDeck.length){
      if(!S.playerDiscard.length) break;   // 덱·버린 더미 모두 비면 더 못 뽑음
      // 빈 덱 규칙: 뽑아야 하는데 덱이 비면 → 버린 더미를 섞어 새 덱 + 공포 1 (리셔플할 때마다). 그 뒤 계속 뽑음.
      S.playerDeck = S.playerDiscard.slice(); S.playerDiscard.length = 0;
      shuffle(S.playerDeck);
      audio.sfx("card-shuffle");
      addLog("덱이 비어 버린 더미를 섞어 새 덱을 만들었습니다. (공포 1)");
      applyToInvestigator(0, 1, "빈 덱");   // 공포 1 — 초상화 표시 + 쓰러짐 판정 일원화
      updatePiles();
    }
    const code=S.playerDeck.shift(); drew++;
    if(handleOnDraw(code)) continue;      // 폭로가 별도 처리(위협영역 배치 등) → 손패 안 감
    S.playerHand.push(code); toHand++;
  }
  if(drew){ renderHand(); updatePiles(); if(toHand) D.flyLastCardFromDeck(); }
  return drew;
}
// 폭로(on_draw) 처리 — 손패에 안 넣고 별도 처리했으면 true. (put_into_play는 다른 약점과도 공용)
export function handleOnDraw(code){
  const nd=(S.cardAbilities[code]||{}).on_draw;
  if(!nd) return false;
  const name=S.byCode[code]?S.byCode[code].name:code;
  if(nd==="put_into_play"){                 // 폭로: 위협영역에 배치 + uses(은폐=단서 카운터)
    drawRevealPlace(code, ()=>{             // 덱→중앙 공개(번역) → 클릭 → 위협영역으로 날아가 배치
      const uses=initialUses(code);
      S.playedCards.push({ code, uses });
      onEnterPlay(code);                     // 상시 보너스(귀신들리다 -1 등)
      renderPlayArea();
      addLog("폭로 — "+name+"이(가) 위협영역에 놓였습니다"+(uses?" (단서 "+uses.count+"개).":". "));
    });
    return true;
  }
  if(nd==="resolve_and_discard"){           // 폭로: 덱→중앙 공개 → 효과 실행 후 자신은 버린 더미로(편집증 등)
    drawRevealPlace(code, ()=>{
      ((S.cardAbilities[code]||{}).abilities||[]).forEach(ab=> (ab.do||[]).forEach(eff=> runEffect(eff, null)));
      D.discardToOrigin(code); updatePiles();   // 조우 음모=조우 버림, 플레이어 약점=플레이어 버림
      addLog("폭로 — "+name+" 효과 처리 후 버렸습니다.");
    });
    return true;
  }
  if(nd==="spawn_enemy"){                    // 폭로: 적으로 등장(고지식한 탐정 등 적 약점)
    drawRevealPlace(code, ()=> spawnEnemy(code));   // 덱→중앙 공개 → 클릭 → 등장 장소로 날아가 배치
    return true;
  }
  addLog("폭로("+nd+") — "+name+" (해당 폭로 처리 미구현, 일단 손패로).");
  return false;
}
// 폭로(약점 등)를 조우처럼 "덱→중앙 공개 → 클릭 → 목적지 배치" 연출로. 자동 페이즈 중이면 배치까지 진행 정지.
export function drawRevealPlace(code, placeFn){
  const autoPhase = (S.currentPhase!=="investigation");   // 정비 드로우 등 자동 진행이면 연출 동안 정지
  if(autoPhase) S.phasePaused = true;
  revealEncounterCard(code, ()=>{
    placeFn();
    // 정비 4.4 — 편집증 등 폭로가 리빌로 지연됐으면, 폭로(자원 상실) '후'에 자원 +1을 준다(순서 보정)
    if(S.pendingUpkeepResource){ S.pendingUpkeepResource=false; D.gainUpkeepResource(); }
    if(autoPhase){ S.phasePaused=false; resumeCurrentPhase(); }
  }, { startEl:"deck-pile" });   // 시작점 = 플레이어 덱 더미
}
// 효과 실행기(비전투만 실제 동작)
export const EFFECTS = {
  gain_resources(eff){ const v=eff.value||1; gainResources(v); addLog("자원 +"+v+" (보유 "+S.invResource+")."); },
  draw(eff){ const got=drawCards(eff.value||1); addLog(got?("카드 "+got+"장을 뽑았습니다."):"덱이 비어 뽑지 못했습니다."); },
  heal(eff){
    const h = eff.heal || {};
    if(h.choose_one){   // 피해/공포 선택(응급처치)
      const v = h.value||1, canDmg=S.invDamage>0, canHor=S.invHorror>0;
      const doHeal=(k)=>{ if(k==="damage"){ S.invDamage=Math.max(0,S.invDamage-v); addLog("피해 "+v+" 회복."); } else { S.invHorror=Math.max(0,S.invHorror-v); addLog("공포 "+v+" 회복."); } renderInvestigator(); };
      if(canDmg&&canHor){   // (응급치료는 activateAbility가 '선택 시 지불'로 가로챔 — 여기는 그 외 폴백)
        showPopup("무엇을 회복할까요?",
          [{label:"피해 "+v, primary:true, act:()=>{ hidePopup(); doHeal("damage"); }},
           {label:"공포 "+v, primary:true, act:()=>{ hidePopup(); doHeal("horror"); }}], ()=>{ hidePopup(); });
      }
      else if(canDmg) doHeal("damage"); else if(canHor) doHeal("horror"); else addLog("회복할 피해·공포가 없습니다.");
    } else if(h.damage){   // 피해만(의학 서적)
      const v=Math.min(h.damage, S.invDamage); if(v>0){ S.invDamage-=v; renderInvestigator(); addLog("피해 "+v+" 회복."); } else addLog("회복할 피해가 없습니다.");
    } else if(h.horror){
      const v=Math.min(h.horror, S.invHorror); if(v>0){ S.invHorror-=v; renderInvestigator(); addLog("공포 "+v+" 회복."); } else addLog("회복할 공포가 없습니다.");
    }
  },
  damage(){ addLog("피해 효과 — 적 시스템 미구현(보류)."); },
  do_fight(){ addLog("공격(전투 판정) — 적 시스템 미구현(보류)."); },
  bonus(){ addLog("능력치 강화 — 판정 커밋 시스템 이후(보류)."); },
  discover_clue(eff){ const want=(eff&&eff.value)||1, n=Math.min(want, cluesInRoom(S.cur).length);   // 직감 등 직접 발견 — 은폐 있으면 discoverClues가 가로챔
    if(n<=0){ addLog(ROOMS[S.cur].name+"에 발견할 단서가 없습니다."); return; }
    discoverClues(n, S.cur); },
  skill_substitute(eff){ S.roundEffects.push({ kind:"skill_substitute", from:eff.from||[], to:eff.to, auto:eff.auto===true, duration:eff.duration||"this_round" });
    addLog("이번 라운드 동안 "+(eff.from||[]).map(s=>D.SKILL_KO[s]||s).join("·")+" 판정을 "+(D.SKILL_KO[eff.to]||eff.to)+"으로 대체할 수 있습니다."); },
  damage_investigator(eff){ takeDamageHorror(eff.damage||1, 0, {direct:!!eff.direct}, ()=>{}); },   // direct면 조사자 직접, 아니면 할당 시스템
  damage(eff){   // 적에게 피해(순찰경찰 자유격발 등)
    const v=eff.value||1;
    const targets=enemiesAt(S.cur);
    if(!targets.length){ showToast("이 장소에 적이 없습니다."); return; }
    if(targets.length===1){ damageEnemy(targets[0], v); D.flushDefeatReaction(); }
    else D.showCardPickPopup("피해를 줄 적을 선택하세요", targets.map(e=>e.code), (c,i)=>{ damageEnemy(targets[i], v); D.flushDefeatReaction(); });
  },
  horror(eff){ takeDamageHorror(0, eff.value||1, {direct:!!eff.direct}, ()=>{}); },                  // 직접 공포=할당 불가(심기증)
  search_deck(eff){ searchDeckToHand(eff); },
  look_top_draw(eff){ lookTopDraw(eff); },
  lose_all_resources(){ const had=S.invResource; S.invResource=0; renderInvestigator(); addLog("폭로: 자원을 모두 잃었습니다. ("+had+" → 0)"); },   // 편집증
  do_fight(eff, p){   // 무기 공격(45구총·마체테·단도·로랜드 권총…) — 보너스·추가피해·조건부(bonus_if=전투, conditional=피해)
    startFightAction({ bonus:(eff.bonus&&eff.bonus.combat)||0, extraDamage:eff.extra_damage||0,
      conditional:eff.conditional, bonusIf:eff.bonus_if,
      weaponCode:(p&&p.code)||null,   // 45구경(01516) 전투 모션 트리거용
      label:(p&&S.byCode[p.code]?S.byCode[p.code].name:"공격") });
  },
  discard(eff){ if(eff.target==="hand") memoryLossDiscard(eff.keep||1); },   // 기억상실=손패 keep장만 남기고 버림(약점 우선 남김)
  place_doom(eff){ if(eff.target==="agenda"){ S.agendaDoom += (eff.value||1); updateDoom(); addLog("파멸 +"+(eff.value||1)+" — 의제 (현재 "+totalDoom()+"/"+S.doomThreshold+")."); } },   // 고대의 악
  check_agenda_advance(){ checkAgendaAdvance(); },   // 임계값 이상이면 의제 진행(신화 1.3 밖에서도 — 고대의 악)
  choose_location(eff){   // 다이너마이트: 현재+연결 장소 중 택1 → 그 장소에 eff.then 효과 적용
    const rooms = [S.cur].concat(ADJ[S.cur]||[]).filter((k,i,a)=> a.indexOf(k)===i && ROOMS[k]);
    pickLocation("어느 장소에 효과를 적용할까요?", rooms, (room)=> (eff.then||[]).forEach(e=> runEffectAtLocation(e, room)));
  },
};
// 장소 선택 팝업(현재/연결 장소 버튼)
export function pickLocation(title, rooms, cb){
  if(rooms.length<=1){ cb(rooms[0]||S.cur); return; }
  showPopup(title, rooms.map(k=>({ label:ROOMS[k].name+(k===S.cur?" (현재)":""), primary:(k===S.cur), act:()=>{ hidePopup(); cb(k); } })));
}
// 특정 장소에 효과 적용(다이너마이트 등 "선택 장소" 대상 효과)
export function runEffectAtLocation(eff, room){
  if(eff.effect==="damage_all"){ dealDamageAllAt(room, eff.value||1); return; }
  runEffect(eff, null);   // 그 외는 일반 실행(확장 여지)
}
// 선택 장소의 모든 적 + (그 장소에 있는)조사자에게 피해. 조사자 피해는 자산 할당 가능.
export function dealDamageAllAt(room, v){
  addLog(ROOMS[room].name+"에 폭발 — 모든 적·조사자에게 피해 "+v+".");
  S.enemies.filter(e=>e.room===room).slice().forEach(en=> damageEnemy(en, v));
  if(S.cur===room) takeDamageHorror(v, 0, {source:"card_effect"}, ()=> D.flushDefeatReaction());   // [다인 훅] 그 장소의 각 조사자
  else D.flushDefeatReaction();
}
// 기억상실: 손패에서 keepN장(기본1)만 남기고 나머지 버림. 약점은 임의로 못 버리므로 우선 남긴다.
export function memoryLossDiscard(keepN){
  if(S.playerHand.length <= keepN){ addLog("기억상실: 버릴 카드가 없습니다."); return; }
  const wIdx = S.playerHand.map((code,i)=> D.isWeakness(code)?i:-1).filter(i=>i>=0);
  if(wIdx.length===1) keepOneDiscardRest(wIdx[0]);   // 약점 1장 → 자동으로 그걸 남김
  else if(wIdx.length>=2) promptKeepOne(wIdx, "기억상실 — 손에 남길 <b>약점</b>을 고르세요 (나머지 전부 버림)");   // 약점 2+ → 약점 중 택1
  else promptKeepOne(S.playerHand.map((_,i)=>i), "기억상실 — 손에 남길 카드 1장을 고르세요 (나머지 전부 버림)");   // 약점 없음 → 아무 1장
}
export function keepOneDiscardRest(keepIdx){
  const keep=S.playerHand[keepIdx];
  const dumped=S.playerHand.filter((_,i)=>i!==keepIdx);
  dumped.forEach(c=>S.playerDiscard.push(c));
  S.playerHand=[keep];
  renderHand(); updatePiles();
  addLog("기억상실: "+(S.byCode[keep]?S.byCode[keep].name:keep)+"만 남기고 "+dumped.length+"장 버렸습니다.");
}
// 자동 진행 페이즈(신화·적·정비)를 알맞은 지점부터 재개. 조사자 단계면 잠금만 해제.
export function resumeCurrentPhase(){
  if(S.currentPhase==="upkeep") resumeUpkeep();
  else if(S.currentPhase==="enemy") resumeEnemy();
  else resumeAfterCutscene();   // mythos/investigation
}
// 약점 선택(기억상실 등) — 반드시 택1(강제·우클릭 불가). 자동 페이즈 중이면 선택 전까지 진행 정지.
export function promptKeepOne(idxs, title){
  const autoPhase = (S.currentPhase!=="investigation");   // 정비 드로우 등 자동 진행 중이면 정지 필요
  if(autoPhase) S.phasePaused = true;                     // phases.js가 이 지점에서 멈춤 → 선택 후 재개
  showForcedPopup(title, idxs.map(i=>({ label:(S.byCode[S.playerHand[i]]?S.byCode[S.playerHand[i]].name:S.playerHand[i]),
    act:()=>{ hidePopup(); keepOneDiscardRest(i); if(autoPhase){ S.phasePaused=false; resumeCurrentPhase(); } } })));
}
// 덱에서 조건(유형·특성) 맞는 카드 검색 → 팝업 선택 → 손패 + 셔플 (연구 사서)
export function searchDeckToHand(eff){
  const uniq = [...new Set(S.playerDeck.filter(code=>{ const c=S.byCode[code]; return c && (!eff.card_type || c.type_code===eff.card_type) && (!eff.trait || (c.real_traits||"").includes(eff.trait)); }))];   // 영어 특성(Tome 등)
  if(!uniq.length){ addLog("덱에서 조건에 맞는 카드를 찾지 못했습니다."); shuffle(S.playerDeck); audio.sfx("card-shuffle"); updatePiles(); return; }
  showPopup("덱에서 손에 들 <span class='hl'>"+(eff.trait||"")+"</span> 카드를 고르세요.",
    uniq.map(code=>({ label:(S.byCode[code]?S.byCode[code].name:code), act:()=>{ hidePopup(); pickFromDeck(code); } })));
}
export function pickFromDeck(code){
  const i = S.playerDeck.indexOf(code);
  if(i>=0){ S.playerDeck.splice(i,1); S.playerHand.push(code); }
  shuffle(S.playerDeck);
  audio.sfx("card-shuffle");
  renderHand(); updatePiles(); D.flyLastCardFromDeck();
  addLog((S.byCode[code]?S.byCode[code].name:code)+"을(를) 덱에서 찾아 손에 들었습니다. 덱을 섞었습니다.");
}
// 덱 맨 위 count장을 보고 (filter 있으면 그중) 1장 골라 뽑음. 나머지는 덱에 넣고 셔플 (낡은 지식의 서·비술 입문자)
export function lookTopDraw(eff){
  const n = eff.count||3;
  const top = S.playerDeck.slice(0, n);
  if(!top.length){ addLog("덱이 비어 있습니다."); return; }
  const drawable = eff.trait ? top.filter(code=>{ const c=S.byCode[code]; return c && (c.real_traits||"").includes(eff.trait); }) : top;   // 영어 특성(Spell 등)
  if(!drawable.length){ addLog("덱 맨 위 "+n+"장 중 조건에 맞는 카드가 없습니다."); shuffle(S.playerDeck); audio.sfx("card-shuffle"); updatePiles(); return; }
  const pick=(code)=>{ const i=S.playerDeck.indexOf(code); if(i>=0){ S.playerDeck.splice(i,1); S.playerHand.push(code); } shuffle(S.playerDeck); audio.sfx("card-shuffle"); renderHand(); updatePiles(); D.flyLastCardFromDeck(); addLog((S.byCode[code]?S.byCode[code].name:code)+"을(를) 뽑았습니다. 나머지는 덱에 넣고 섞었습니다."); };
  if(drawable.length===1) pick(drawable[0]);
  else D.showCardPickPopup("덱 맨 위 "+n+"장 중에서 뽑을 카드를 고르세요. (일러스트에 마우스를 올리면 설명)", drawable, (code)=> pick(code));   // 일러스트+호버 텍스트
}
export function runEffect(eff, p){
  if(eff.spend && p && p.uses){ for(const k in eff.spend){ if(p.uses.type===k) p.uses.count -= eff.spend[k]; } }   // uses 소비(플레이 자산만)
  const h = EFFECTS[eff.effect];
  if(h) h(eff, p); else addLog("(효과 '"+eff.effect+"' 미구현)");
}
