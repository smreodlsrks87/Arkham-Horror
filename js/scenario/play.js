/* =====================================================================
   scenario/play.js — 플레이 엔진: 카드 플레이(자원·슬롯·이벤트/자산) + 플레이영역 렌더
   + 발동형 능력(능력 메뉴·판정 연계) + 카드 버림.
   전투·적·효과엔진 등 아직 인라인인 것들은 setPlayDeps로 주입한다.
   ===================================================================== */
import { S } from "./state.js";
import { isFastPlay, initialUses, onEnterPlay, onLeavePlay, activatable } from "./abilities.js";
import { renderHand } from "./hand.js";
import { showToast, showPopup, hidePopup } from "./popup.js";
import { cardFront } from "./card-img.js";
import { showCardInfo, hideCardInfo } from "./tooltip.js";
import { updateAP, renderInvestigator } from "./investigator.js";
import { updatePiles } from "./piles.js";
import { addLog } from "./log.js";
import { audio } from "../shared/audio.js";
import { commitMode, canBoost, useBoostAsset, startSkillTest, applyCommittedDraws, testResultHtml } from "./skilltest.js";
import { toStageX, toStageY } from "../shared/stage.js";
import { provokeAoO, enemyAtLocation, openEnemyMenu, enemyHealth } from "./enemy.js";   // 적 코어(기회공격·장소적·적메뉴·적체력)

// 주입(scenario1 인라인: 효과엔진·반응·조사결과 등) — 전부 안정 함수/상수라 게터 불필요.
let D = {
  runEffect(){},
  closeActionMenu(){}, actionSurchargeFor:()=>0, markSurcharge(){}, showCardPickPopup(){},
  attachToLocation(){}, triggerEnterPlayReaction(){}, applyInvestigateResult(){}, cluesInRoom:()=>[],
  investigatorBlanked:()=>false, effShroud:()=>0, isThreatCard:()=>false,
  hasReactionWhen:()=>false, eventReactionPlayable:()=>false, reactionAbilityOpen:()=>false,
  closeAfterDefeatWindow(){}, discardToOrigin(){}, SKILL_KO:{},
};
export function setPlayDeps(o){ Object.assign(D, o); }

export function weaponFightOptions(){
  const opts=[];
  S.playedCards.forEach((p,pi)=>{
    ((S.cardAbilities[p.code]||{}).abilities||[]).forEach((ab,ai)=>{
      if(ab.do && ab.do[0] && ab.do[0].effect==="do_fight" && canActivateAbility(p, ab))
        opts.push({ label:"공격 ("+((S.byCode[p.code]||{}).name||p.code)+")", pi, ai });
    });
  });
  return opts;
}

export const SLOT_CAP = { "Hand":2, "Arcane":2, "Ally":1, "Accessory":1, "Body":1 };

const SLOT_KO  = { "Hand":"손", "Arcane":"비전", "Ally":"조력자", "Accessory":"장신구", "Body":"몸" };

export function slotInfo(code){   // {type,count} 또는 null(무슬롯). "Hand x2"=양손(2칸).
  const rs = ((S.byCode[code]||{}).real_slot || (S.byCode[code]||{}).slot || "").trim();
  if(!rs) return null;
  const m = rs.match(/x\s*(\d+)/i);
  return { type: rs.replace(/\s*x\s*\d+/i,"").trim(), count: m?parseInt(m[1]):1 };
}

export function slotUsed(type){ let u=0; S.playedCards.forEach(p=>{ const s=slotInfo(p.code); if(s&&s.type===type) u+=s.count; }); return u; }

function cannotPlayType(type){
  return S.playedCards.some(p=> ((S.cardAbilities[p.code]||{}).abilities||[]).some(ab=> ab.timing==="constant" && ab.effect==="cannot_play" && (ab.card_types||[]).includes(type)));
}


export function tryPlayCard(idx){
  const code=S.playerHand[idx];
  const c=S.byCode[code];
  if(!c){ renderHand(); return; }
  const cost = (c.cost==null||c.cost<0) ? 0 : c.cost;   // X비용·비용없음은 0 취급(임시)
  // 약점은 플레이 불가
  if(c.subtype_code==="weakness"||c.subtype_code==="basicweakness"){
    showToast("약점 카드는 플레이할 수 없습니다."); renderHand(); return;
  }
  // 기술 카드는 플레이가 아니라 판정 커밋 — 지금은 되돌림(판정 시스템에서 처리 예정)
  if(c.type_code==="skill"){
    showToast("기술 카드는 판정에 커밋해 사용합니다."); renderHand(); return;
  }
  // 신속(Fast) 키워드 — 행동 소비 없이 플레이(카드에 '신속' 있을 때만. 능력 timing:fast 와 별개).
  const isFast = isFastPlay(code);
  const needAction = !isFast;   // 신속이 아니면 행동 1 소비

  // when(반응 조건) 있는 카드는 그 상황이 왔을 때만 발동 — 손패에서 드래그로 그냥 못 냄.
  // (예: 보호의 진 = 음모 뽑을 때만. 타이밍 창/반응 시스템에서 처리 예정)
  // 반응(when)만으로 발동하는 카드는 이벤트만 손패에서 직접 못 냄(상황 시 발동).
  // 자산의 when은 플레이영역에서 작동하는 촉발 능력이라 플레이 가능(예: 경비견).
  if(c.type_code==="event" && D.hasReactionWhen(code) && !D.eventReactionPlayable(code)){
    showToast("이 카드는 특정 상황에서만 사용할 수 있습니다. (증거! = 적 처치 직후)"); renderHand(); return;
  }
  // 룰: when 없는 fast 자산·이벤트도 "자기 턴(조사자 페이즈)"에만 낼 수 있다.
  // fast는 행동·기회공격만 면제일 뿐, 신화/적 페이즈에 미리 까는 것은 불가.
  if(S.currentPhase!=="investigation"){
    showToast("지금은 카드를 플레이할 수 없습니다. (자기 턴에만 가능)"); renderHand(); return;
  }
  if(needAction && S.actionPoints<1){
    showToast("행동력이 부족합니다."); renderHand(); return;
  }
  if(S.invResource < cost){
    showToast("자원이 부족합니다. (필요 "+cost+", 보유 "+S.invResource+")");
    renderHand(); return;   // 손패로 되돌아감
  }
  // 시끄러운 소음 등 "자산·이벤트 플레이 불가" 위협 카드가 깔려 있으면 차단(커밋·발동·행동은 가능)
  if((c.type_code==="asset"||c.type_code==="event") && cannotPlayType(c.type_code)){
    showToast("지금은 자산·이벤트를 플레이할 수 없습니다. (시끄러운 소음)"); renderHand(); return;
  }
  // 슬롯 검사(자산) — 차지 슬롯이 부족하면 기존 카드 버리고 플레이할지 물어봄
  const sl = slotInfo(code);
  if(sl){
    const cap=SLOT_CAP[sl.type]||1, used=slotUsed(sl.type), needFree=used+sl.count-cap;
    if(needFree>0){
      renderHand();   // ★ 드래그로 stage에 뜬 카드를 손패로 되돌림(팝업 뜨는 동안 그 자리에 굳는 것 방지)
      const nm=(cc)=>S.byCode[cc]?S.byCode[cc].name:cc;
      const occ=[];   // 같은 슬롯 점유 카드만(무슬롯 카드 null 가드 — 없으면 예외로 플레이가 조용히 실패했음)
      S.playedCards.forEach((p,i)=>{ const s=slotInfo(p.code); if(s && s.type===sl.type) occ.push({i, units:s.count, code:p.code}); });
      const solos=occ.filter(o=>o.units>=needFree);
      if(solos.length>=2 && needFree<used){   // 한 장만 버려도 되는 선택지 여럿 → 어느 걸 버릴지 고르기(예: 한손 2개 중)
        // 카드 일러스트로 고르기 + 호버 시 카드 설명(D.showCardPickPopup)
        D.showCardPickPopup(SLOT_KO[sl.type]+' 슬롯이 찼습니다. 버리고 <b>'+nm(code)+'</b>을(를) 플레이할 카드를 고르세요.',
          solos.map(o=>o.code),
          (c,i)=>{ doPlay([S.playedCards[solos[i].i]]); },   // 버릴 카드는 기회공격 뒤에 버림(룰: 데미지 할당이 먼저)
          { cancelable:true, onCancel:()=>{ renderHand(); } });
        return;
      }
      const sorted=[...occ].sort((a,b)=>b.units-a.units); let freed=0; const kill=[];   // 아니면 최소 집합(양손=한손 2개 다) 버림
      for(const o of sorted){ if(freed>=needFree) break; kill.push(o.i); freed+=o.units; }
      const killImgs = kill.map(i=>{ const cc=S.playedCards[i].code;
        return '<div class="slot-kill" data-code="'+cc+'"><img src="'+cardFront(cc)+'" alt=""><div class="skn">'+nm(cc)+'</div></div>'; }).join("");
      showPopup(SLOT_KO[sl.type]+' 슬롯이 찼습니다. 아래 자산을 버리고 <b>'+nm(code)+'</b>을(를) 플레이하시겠습니까?'+
        '<div class="slot-kill-row">'+killImgs+'</div>', [
        {label:"아니오", act:()=>{ hidePopup(); renderHand(); }},
        {label:"예(버리고 플레이)", primary:true, act:()=>{ hidePopup(); doPlay(kill.map(i=>S.playedCards[i])); }},   // 버릴 카드는 기회공격 뒤에 버림(룰: 데미지 할당이 먼저)
      ], null, "slot-pop");
      document.querySelectorAll("#popup-msg .slot-kill").forEach(el=>{   // 일러스트 호버 → 카드 텍스트
        el.addEventListener("mouseenter", ()=> showCardInfo(el, el.dataset.code));
        el.addEventListener("mouseleave", hideCardInfo);
      });
      return;
    }
  }
  doPlay();

  function doPlay(deferredKill){
    audio.sfx("card-play");   // 카드 플레이 소리
    // 자원·행동 차감
    S.invResource -= cost;
    if(needAction){ S.actionPoints-=1; updateAP(); D.closeAfterDefeatWindow(); }   // 행동을 소비하는 카드 플레이 = 새 행동 → 처치 반응 창 닫힘(증거! 더는 못 씀). 신속(증거!)은 needAction=false라 창 유지
    renderInvestigator();
    S.playerHand.splice(idx,1);
    const actLog = needAction ? "" : " [신속]";
    // 룰: 기회공격은 "행동 효과 적용 전"에 해결 → 슬롯에서 밀려날 기존 자산이 아직 판에 있어 그 데미지를 흡수(사망)할 수 있다.
    // 기회공격이 끝난 뒤에야 밀려난 기존 자산을 버리고(살아남았으면), 새 자산을 등장시킨다.
    const discardDeferred = ()=>{
      (deferredKill||[]).forEach(obj=>{ const i=S.playedCards.indexOf(obj); if(i>=0) discardPlayed(i); });   // 기회공격에 죽어 이미 빠졌으면(indexOf<0) 건너뜀
    };
    if(needAction){ renderHand(); provokeAoO(()=>{ discardDeferred(); playBody(); }); }   // 신속 아님 = 행동 → 기회공격(기존 자산 흡수 가능) → 버림 → 등장
    else { discardDeferred(); playBody(); }
    function playBody(){
    if(c.type_code==="event"){
      // 이벤트: 즉시 효과(on_play) 또는 지금 열린 반응 창(증거!=적 처치 직후) 효과 실행. 부착 이벤트는 붙고, 아니면 버린 더미로.
      addLog(c.name+" 발동 (자원 -"+cost+")"+actLog+".");
      let attached=false;
      ((S.cardAbilities[code]||{}).abilities||[]).forEach(ab=>{
        const isReactionNow = (ab.timing==="fast"||ab.timing==="reaction") && ab.when && D.reactionAbilityOpen(ab);
        if(ab.timing!=="on_play" && !isReactionNow) return;
        (ab.do||[]).forEach(eff=>{ if(eff.effect==="attach_to_location"){ D.attachToLocation(code, S.cur, eff); attached=true; } else D.runEffect(eff, null); }); });
      // 증거!(신속) — 창을 닫지 않음: 같은 처치 창에서 여러 장 사용 가능(룰). 창은 다른 행동/페이즈 전환 시 닫힘.
      if(!attached) S.playerDiscard.push(code);
      updatePiles();
    }else{
      // 자산·조력자 등: 플레이 영역에 배치(uses 초기화) + 상시(constant) 능력 적용
      S.playedCards.push({ code, uses: initialUses(code) });
      onEnterPlay(code);            // 상시 능력치 보너스 등 반영(예: 순찰 경찰 +1 전투)
      renderPlayArea(); renderInvestigator();
      addLog(c.name+" 플레이 (자원 -"+cost+")"+actLog+".");
      D.triggerEnterPlayReaction(code);   // 등장 반응(연구 사서 = 덱에서 서적 검색)
    }
    renderHand();
    }   // playBody 끝
  }
}

const HS_REF_W = 280;   // 에디터 카드 폭(hs_layout fs의 기준 폭)

const ASSET_HS_DEFAULT = { hX:39, hY:93, snX:61.5, snY:93, fs:22 };   // 아컴 자산 카드 공통 위치(체력 좌하·정신 우하). 카드별 hs_layout으로 덮어씀

function assetHSLayout(code){ return Object.assign({}, ASSET_HS_DEFAULT, (S.cardAbilities[code]||{}).hs_layout||{}); }

function assetHSBadges(p, c){
  c = c || S.byCode[p.code] || {};
  const hasH = c.health>0, hasS = c.sanity>0;
  if(!hasH && !hasS) return "";   // 체력·정신력 없는 자산('-') → 배지 자체를 출력 안 함
  const L=assetHSLayout(p.code);
  const fsq = ((L.fs||22)/HS_REF_W*100).toFixed(2)+"cqw";   // 카드 폭 대비 비율 → 크기 무관 동일
  let h="";
  if(hasH) h += '<div class="pc-hp" style="left:'+L.hX+'%;top:'+L.hY+'%;font-size:'+fsq+';">'+Math.max(0,c.health-(p.dmg||0))+'/'+c.health+'</div>';
  if(hasS) h += '<div class="pc-san" style="left:'+L.snX+'%;top:'+L.snY+'%;font-size:'+fsq+';">'+Math.max(0,c.sanity-(p.hor||0))+'/'+c.sanity+'</div>';
  return h;
}

const USES_KO = { ammo:"탄약", supply:"보급", secret:"비밀", charge:"충전", clue:"단서" };

function usesTokensHtml(uses){
  if(!uses || !uses.type) return "";
  const n = Math.max(0, uses.count|0);
  const ko = USES_KO[uses.type] || uses.type;
  const one = (uses.type==="clue")
    ? '<span class="rtok tk-clue"><img src="images/clue.png" alt=""></span>'
    : '<span class="rtok tk-'+uses.type+'"></span>';
  let inner=""; for(let i=0;i<n;i++) inner+=one;
  return '<div class="pc-tokens" title="'+ko+' '+n+'개">'+inner+'</div>';   // 0개면 빈 컨테이너(토큰 없음)
}

export function renderPlayArea(){
  const area=document.getElementById("play-area");
  const engaged = (S.enemies||[]).filter(e=>e.engaged);   // 교전 중인 적 = 룰상 위협영역 → 카드로도 표시
  if(!S.playedCards.length && !engaged.length){ area.innerHTML='<div class="play-placeholder">플레이된 자산</div>'; return; }
  const assetsHtml = S.playedCards.map((p,idx)=>{
    const badge = usesTokensHtml(p.uses);   // 탄약·보급·충전·비밀·단서 = 종류별 토큰
    const c=S.byCode[p.code]||{};
    const hsB = assetHSBadges(p, c);   // 체력/정신력 배지(있는 자산만) — 조사자와 동일 스타일, 위치는 hs_layout
    const boostCls = commitMode ? (canBoost(idx) ? ' pc-boost-ok' : ' pc-boost-no') : "";   // 커밋 중: 강화 가능 자산만 밝게
    const usableCls = (!commitMode && !D.isThreatCard(p.code) && hasUsableAbility(p)) ? ' pc-usable' : "";   // 지금 발동 가능한 능력 있는 자산(초록)
    return '<div class="played-card'+(D.isThreatCard(p.code)?' threat-card':'')+(p.exhausted?' pc-exhausted':'')+boostCls+usableCls+'" data-idx="'+idx+'" data-code="'+p.code+'"><img src="'+cardFront(p.code)+'" alt="">'+badge+hsB+'</div>';
  }).join("");
  const enemyHtml = engaged.map(en=>{
    const ei=S.enemies.indexOf(en);
    return '<div class="played-card pc-enemy threat-card'+(en.exhausted?' pc-exhausted':'')+(commitMode?' pc-boost-no':'')+'" data-ei="'+ei+'" data-code="'+en.code+'"><img src="'+cardFront(en.code)+'" alt="">'+
      '<span class="pc-eng">🎯 교전</span><div class="pc-ehp">'+(enemyHealth(en)-en.dmg)+'/'+enemyHealth(en)+'</div></div>';
  }).join("");
  area.innerHTML = assetsHtml + enemyHtml;
  area.querySelectorAll(".played-card:not(.pc-enemy)").forEach(el=>{
    const idx=+el.dataset.idx; const code=S.playedCards[idx].code;
    el.addEventListener("mouseenter", ()=>showCardInfo(el, code, "left"));   // 호버는 카드 왼쪽(격발 메뉴는 위 → 겹침 방지)
    el.addEventListener("mouseleave", hideCardInfo);
    if(commitMode){ if(canBoost(idx)){ el.classList.add("boost-ok"); el.addEventListener("click", ()=>useBoostAsset(idx)); } }
    else el.addEventListener("click", ()=>{ hideCardInfo(); openAbilityMenu(idx, el); });   // 클릭 → 호버 끄고 발동 메뉴
  });
  area.querySelectorAll(".played-card.pc-enemy").forEach(el=>{   // 위협영역 교전 적 카드 = 맵 말과 동일한 액션 메뉴
    const en=S.enemies[+el.dataset.ei]; if(!en) return;
    el.addEventListener("mouseenter", ()=> showCardInfo(el, en.code, "left"));
    el.addEventListener("mouseleave", hideCardInfo);
    el.addEventListener("click", (e)=>{ e.stopPropagation(); hideCardInfo(); openEnemyMenu(en, e.clientX, e.clientY); });
  });
}

const EFFECT_LABEL = { do_fight:"공격", heal:"치유", damage:"피해", bonus:"능력치 강화", gain_resources:"자원 얻기", draw:"카드 뽑기", look_top_draw:"덱 위 카드 뽑기", search_deck:"덱 검색" };

const STUB_EFFECTS = new Set(["bonus"]);   // 남은 스텁(초지각 등 판정강화). do_fight·damage는 실동작

function abilityLabel(ab, cardName){
  if(ab.label) return ab.label + " (" + (ab.timing==="fast" ? "신속" : "행동") + ")";   // 명시 라벨(의학 서적=치유 판정)
  const eff = (ab.do && ab.do[0] && ab.do[0].effect) || "능력";
  if(eff==="do_fight" && cardName) return "공격 (" + cardName + ")";   // 무기 공격 = "공격 (무기명)" (적 메뉴와 통일)
  return (EFFECT_LABEL[eff] || eff) + " (" + (ab.timing==="fast" ? "신속" : "행동") + ")";
}

function canActivateAbility(p, ab){
  const first = ab.do && ab.do[0] && ab.do[0].effect;
  if(STUB_EFFECTS.has(first)) return false;
  if((first==="do_fight"||first==="damage") && !enemyAtLocation()) return false;   // 무기 공격·적 피해는 내 장소에 적이 있어야
  if(S.currentPhase!=="investigation" || S.phaseBusy) return false;
  let apNeed = (ab.cost && ab.cost.action) ? ab.cost.action : (ab.timing==="action" ? 1 : 0);   // 행동 비용(심기증 버리기=2)
  if(first==="do_fight") apNeed += D.actionSurchargeFor("fight");   // 무기 공격도 공포에 얼어붙다 추가행동
  if(apNeed && S.actionPoints < apNeed) return false;
  if(ab.cost && ab.cost.resources && S.invResource < ab.cost.resources) return false;
  if(ab.cost && ab.cost.exhaust && p.exhausted) return false;   // 이미 소진이면 소진 능력 못 씀
  if(ab.do && p.uses){ for(const eff of ab.do){ if(eff.spend && eff.spend[p.uses.type] && p.uses.count < eff.spend[p.uses.type]) return false; } }
  if(ab.requires){ for(const k in ab.requires){ const need=parseInt((ab.requires[k]+"").replace(/[^0-9]/g,""))||1;
    if(k==="resources"){ if(S.invResource<need) return false; } else if(p.uses && p.uses.type===k){ if(p.uses.count<need) return false; } } }
  return true;
}

function hasUsableAbility(p){
  return ((S.cardAbilities[p.code]||{}).abilities||[]).some(ab=>
    (ab.timing==="action"||ab.timing==="fast"||ab.timing==="free") && canActivateAbility(p, ab));
}

export function activateAbility(pi, ai){
  const p = S.playedCards[pi]; if(!p) return;
  const ab = ((S.cardAbilities[p.code]||{}).abilities || [])[ai]; if(!ab) return;
  if(!canActivateAbility(p, ab)){ showToast("지금 발동할 수 없습니다."); return; }
  const isFight = ab.do && ab.do[0] && ab.do[0].effect==="do_fight";
  let apCost = (ab.cost && ab.cost.action) ? ab.cost.action : (ab.timing==="action" ? 1 : 0);   // 행동 비용(기본 1, cost.action이면 그 값=심기증 버리기 2)
  if(isFight) apCost += D.actionSurchargeFor("fight");   // 무기 공격 = 공포에 얼어붙다 추가행동
  // 실제 비용 지불(행동·자원·소진·ab.cost 소모품). eff.spend 소모품은 D.runEffect가 소비.
  const pay = ()=>{
    if(apCost){ if(isFight) D.markSurcharge("fight"); S.actionPoints-=apCost; updateAP(); }
    if(ab.cost && ab.cost.resources){ S.invResource-=ab.cost.resources; renderInvestigator(); }
    if(ab.cost && ab.cost.exhaust){ p.exhausted=true; }
    if(ab.cost && p.uses && ab.cost[p.uses.type]){ p.uses.count -= ab.cost[p.uses.type]; }
  };
  // 회복 선택(응급치료) — 피해·공포 둘 다 회복 가능하면 "선택할 때 지불"(우클릭=아무것도 안 함).
  const he = ab.do && ab.do[0];
  if(he && he.effect==="heal" && he.heal && he.heal.choose_one && S.invDamage>0 && S.invHorror>0){
    const v = he.heal.value||1, nm = S.byCode[p.code]?S.byCode[p.code].name:p.code;
    const spendUse = (he.spend && p.uses && he.spend[p.uses.type]) ? he.spend[p.uses.type] : 0;
    const commit=(k)=>{
      pay(); if(spendUse && p.uses) p.uses.count -= spendUse;   // 선택 순간에만 지불
      provokeAoO(()=>{                                          // 행동 소비 → 기회공격 후 회복
        if(k==="damage"){ S.invDamage=Math.max(0,S.invDamage-v); addLog(nm+" — 피해 "+v+" 회복."); }
        else { S.invHorror=Math.max(0,S.invHorror-v); addLog(nm+" — 공포 "+v+" 회복."); }
        renderInvestigator();
        if(p.uses && p.uses.discardIfEmpty && p.uses.count<=0) discardPlayed(pi); else renderPlayArea();
      });
    };
    showPopup('무엇을 회복할까요? <span style="color:var(--muted);font-size:13px;">(우클릭 = 취소)</span>',
      [{label:"피해 "+v, primary:true, act:()=>{ hidePopup(); commit("damage"); }},
       {label:"공포 "+v, primary:true, act:()=>{ hidePopup(); commit("horror"); }}],   // 두 버튼 색 통일
      ()=>{ hidePopup(); });   // 우클릭 = 비용 지불 없이 취소(아무 행동도 안 함)
    return;
  }
  pay();
  // 기회공격 — 행동 소비 능력 중 공격(do_fight) 지정이 아닌 것(손전등 조사·의학서적·심기증 버리기 등)
  if(apCost>0 && !isFight){ provokeAoO(()=> abilityBody()); } else abilityBody();
  function abilityBody(){
  if(ab.action_type==="investigate"){                                              // 손전등: 장막 수정 조사(현재 장소)
    const name = S.byCode[p.code] ? S.byCode[p.code].name : p.code;
    const shroud = D.effShroud(S.cur), mod = ab.difficulty_mod||0;   // 안개 등 수정치 포함
    startSkillTest({ skill:"intellect", testType:"investigate", location:S.cur,
      difficulty: Math.max(0, shroud+mod), difficultyBreak:{ base:shroud, mod },   // 은폐 하한 0 + 표시용(0=2-2)
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(room)=>D.cluesInRoom(room).length, blanked:D.investigatorBlanked() },
      actionLabel:"조사("+name+")", targetLabel:"은폐",
      onResolve:(r)=> D.applyInvestigateResult(null, r) });
    renderPlayArea();
    return;
  }
  if(ab.test){                                                                     // 능력이 판정을 굴림(의학 서적)
    const name = S.byCode[p.code] ? S.byCode[p.code].name : p.code;
    startSkillTest({ skill:ab.test.skill, testType:"ability", difficulty:ab.test.difficulty,
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(room)=>D.cluesInRoom(room).length, blanked:D.investigatorBlanked() },
      actionLabel:name, targetLabel:"난이도",
      onResolve:(r)=> applyAbilityTestResult(ab, p, name, r) });
    renderPlayArea();
    return;
  }
  (ab.do||[]).forEach(eff=> D.runEffect(eff, p));                                     // 즉시 효과
  if(ab.cost && ab.cost.discard==="self") discardPlayed(pi);                        // 자기 버림 비용
  else if(p.uses && p.uses.discardIfEmpty && p.uses.count<=0) discardPlayed(pi);    // uses 소진 → 버림
  else renderPlayArea();
  }   // abilityBody 끝
}

function applyAbilityTestResult(ab, p, name, r){
  (r.success ? (ab.on_success||[]) : (ab.on_failure||[])).forEach(eff=> D.runEffect(eff, p));
  const base = { action:name, skill:ab.test.skill, skillLabel:D.SKILL_KO[ab.test.skill]||ab.test.skill, skillVal:r.base,
                 drawn:r.drawn, total:r.total, target:r.difficulty, targetLabel:"난이도", success:r.success, autoFail:r.autoFail };
  const lines = applyCommittedDraws(r);   // 배짱 등 커밋 드로우(능력 판정도)
  const ex = (r.success ? "성공 — 효과 적용." : "실패 — 효과 적용.") + (lines.length?" "+lines.join(" "):"");
  showPopup(testResultHtml({...base, extra: ex}),
    [{label:"확인", primary:true, act:hidePopup}], null, "pb-test "+(r.success?"pb-ok":"pb-no"));
}

export function discardPlayed(idx){
  const p = S.playedCards[idx]; if(!p) return;
  onLeavePlay(p.code);
  S.playedCards.splice(idx,1);
  D.discardToOrigin(p.code);   // 조우=조우 버림 더미, 플레이어(약점 포함)=플레이어 버림 더미
  renderPlayArea(); renderInvestigator(); updatePiles();
  addLog((S.byCode[p.code]?S.byCode[p.code].name:p.code)+" 버림.");
}

let abilityMenuOpen=false;

function openAbilityMenu(pi, cardEl){
  D.closeActionMenu();
  const p = S.playedCards[pi]; if(!p) return;
  const list = activatable(p.code);
  if(!list.length){ showToast("발동할 능력이 없습니다."); return; }
  const menu = document.getElementById("ability-menu");
  menu.innerHTML = list.map(({i,ab})=>{
    const ok = canActivateAbility(p, ab);
    return '<div class="am-item'+(ok?"":" am-disabled")+'" data-pi="'+pi+'" data-ai="'+i+'" data-en="'+(ok?1:0)+'">'+abilityLabel(ab, (S.byCode[p.code]||{}).name)+'</div>';
  }).join("");
  menu.style.display="block";
  const r = cardEl.getBoundingClientRect();
  let sx=toStageX(r.left), sy=toStageY(r.top)-menu.offsetHeight-6;
  if(sy<8) sy = toStageY(r.bottom)+6;   // 위 공간 없으면 카드 아래로
  menu.style.left=Math.max(8,sx)+"px"; menu.style.top=Math.max(8,sy)+"px";
  abilityMenuOpen=true;
}

function closeAbilityMenu(){ const m=document.getElementById("ability-menu"); if(m) m.style.display="none"; abilityMenuOpen=false; }

document.addEventListener("mousedown",(e)=>{
  if(!abilityMenuOpen) return;
  const item = e.target.closest && e.target.closest("#ability-menu .am-item");
  if(item){
    if(e.button===0){ e.preventDefault(); e.stopPropagation();
      if(item.dataset.en==="1"){ closeAbilityMenu(); activateAbility(+item.dataset.pi, +item.dataset.ai); } }
    return;
  }
  const onCard = e.target.closest && e.target.closest(".played-card");
  if(e.button===0 && !onCard) closeAbilityMenu();
}, true);
