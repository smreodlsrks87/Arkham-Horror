/* =====================================================================
   scenario/enemy.js — 적 코어 + 전투 엔진.
   적 데이터·수명(등장/교전/피해)·전투(공격/회피/기회공격/보복)·전투UI·적 액션 메뉴·적 단계.
   ※ 적 마커 렌더(renderEnemyMarkers)는 프레임 루프(updateEnemyMarkers)와 wrap/enemyRowEls를
     공유하므로 scenario1에 남기고 주입받는다. 효과엔진·피해할당은 effects.js·damage.js에서 import.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { startSkillTest, testResultHtml, applyCommittedDraws } from "./skilltest.js";
import { updateAP, renderInvestigator } from "./investigator.js";
import { showPopup, hidePopup, showToast } from "./popup.js";
import { renderPlayArea, weaponFightOptions, activateAbility } from "./play.js";
import { floatTextAt, hitFlash } from "./combat-fx.js";
import { resumeEnemy } from "./phases.js";
import { renderEnemyMarkers, pawnMoving } from "./map3d.js";   // 적 마커 렌더·말 이동중 게터(map3d)
import { canEnemyEnterLocation, actionSurchargeFor, markSurcharge } from "./threats.js";   // 바리케이드 진입차단·행동 추가비용(threats)
import { takeDamageHorror } from "./damage.js";   // 조사자 피해·공포 할당(damage)
import { runEffect } from "./effects.js";   // 효과 실행 엔진(effects)

// 주입(scenario1 인라인: 마커렌더·반응·메뉴·데이터) — 대부분 안정 함수/상수.
let D = {
  closeAfterDefeatWindow(){}, showCardPickPopup(){}, cluesInRoom:()=>[], countInvestigatorsAt:()=>0,
  leadInvestigatorName:()=>"", investigatorBlanked:()=>false,
  discardToOrigin(){}, flushDefeatReaction(){},
  renderMenu(){}, isEncounterCard:()=>false, ROOMS:{}, ADJ:{},
};
export function setEnemyDeps(o){ Object.assign(D, o); }

export function enemyAtLocation(){ return (S.enemies||[]).some(e=>e.room===S.cur); }   // 내 장소의 적(교전 여부 무관)

export function enemyParleyAbility(en){ return ((S.cardAbilities[en.code]||{}).abilities||[]).find(ab=> ab.timing==="action" && ab.action_type==="parley") || null; }

export function doParley(en){
  const ab = enemyParleyAbility(en); if(!ab){ return; }
  D.closeAfterDefeatWindow();
  const cost = ab.cost||{}, res = cost.resources||0;
  if(S.actionPoints < 1){ showToast("행동력이 부족합니다."); return; }
  if(S.invResource < res){ showToast("자원이 부족합니다. (필요 "+res+")"); return; }
  S.actionPoints -= 1; updateAP();               // 협상 = 행동 1 (기회공격 면제 — provokeAoO 호출 안 함)
  if(res){ S.invResource -= res; renderInvestigator(); }
  const nm = enemyCard(en).name;
  addLog(nm+"과(와) 협상"+(res?" (자원 -"+res+")":"")+".");
  (ab.do||[]).forEach(eff=> runEffect(eff, null));
  if(cost.discard==="self"){                       // 행동대장 = 자신을 버림(게임에서 제거)
    const i=S.enemies.indexOf(en); if(i>=0) S.enemies.splice(i,1);
    D.discardToOrigin(en.code);                       // 플레이어 약점 → 플레이어 버림
    addLog(nm+"을(를) 버렸습니다. (협상)");
  }
  renderEnemyMarkers(); renderPlayArea();
}

export function openEnemyMenu(en, clientX, clientY){
  if(!en) return;
  const atCur = en.room===S.cur, myTurn = S.currentPhase==="investigation" && !S.phaseBusy;
  const canAct=(extra)=> (atCur && myTurn && S.actionPoints>=1+extra) ? "active":"disabled";
  const items=[];
  // 공격(맨손)
  items.push({ label:"공격 (맨손)", state:canAct(actionSurchargeFor("fight")),
    run:()=>{ const x=actionSurchargeFor("fight"); markSurcharge("fight"); S.actionPoints-=(1+x); updateAP(); startFightAction({ label:"공격(맨손)", target:en }); } });
  // 공격(무기) — 지금 쓸 수 있는 do_fight 자산마다
  weaponFightOptions().forEach(w=>{
    items.push({ label:w.label, state:(atCur && myTurn)?"active":"disabled",
      run:()=>{ fightTargetOverride=en; activateAbility(w.pi, w.ai); } });   // 무기 비용은 activateAbility가 처리, 대상은 오버라이드
  });
  // 회피(교전 중일 때만)
  items.push({ label:"회피", state: en.engaged ? canAct(actionSurchargeFor("evade")) : "hidden",
    run:()=>{ const x=actionSurchargeFor("evade"); markSurcharge("evade"); S.actionPoints-=(1+x); updateAP(); startEvadeAction({ target:en }); } });
  // 교전(비교전 적) — 대표조사자가 이 적과 교전
  items.push({ label:"교전", state: (!en.engaged && atCur && myTurn && S.actionPoints>=1) ? "active":"hidden",
    run:()=>{ S.actionPoints--; updateAP(); provokeAoO(()=>{ en.engaged=true; en.exhausted=false; renderEnemyMarkers(); renderPlayArea();
              addLog(enemyCard(en).name+"과(와) 교전했습니다. (행동)"); }); } });
  // 협상(카드·장소가 허용할 때만)
  // 협상 — 이 적이 협상 능력을 가졌을 때만(교전 무관, 같은 장소)
  const pab = enemyParleyAbility(en);
  if(pab) items.push({ label:(pab.label||"협상"), state:(atCur && myTurn && S.actionPoints>=1)?"active":"disabled", run:()=> doParley(en) });
  D.renderMenu(items, clientX, clientY);
}

export function ghoulsInRoom(room){ return S.enemies.filter(e=> isGhoul(e.code) && e.room===room).length; }

export function isGhoul(code){ return ((S.byCode[code]||{}).real_traits||"").includes("Ghoul"); }

export function enemyCard(en){ return S.byCode[en.code]||{}; }

export function enemyHealth(en){ const c=enemyCard(en); const base=c.health||1; return c.health_per_investigator ? base*S.playerCount : base; }   // 구울 사제=조사자당 5

export function enemyHasKeyword(en, kw){ return ((S.cardAbilities[en.code]||{}).keywords||[]).includes(kw); }

export function enemiesAt(k){ return S.enemies.filter(e=>e.room===k); }

export function enemySpawnRoom(code){
  const a=S.cardAbilities[code]||{};
  if(a.spawn && D.ROOMS[a.spawn]) return (D.ROOMS[a.spawn].stage===S.currentStage) ? a.spawn : null;
  return S.cur;
}

export function spawnEnemy(code){
  const name=(S.byCode[code]||{}).name||code;
  const room = enemySpawnRoom(code);
  if(!room){   // 등장 장소가 현재 게임에 없음 → 등장 못 함 → 조우 버린 더미로(효과 없음)
    addLog(name+" — 등장 장소("+((D.ROOMS[(S.cardAbilities[code]||{}).spawn]||{}).name||"?")+")가 아직 게임에 없어 버립니다.");
    D.discardToOrigin(code); return;
  }
  const a=S.cardAbilities[code]||{};
  S.enemies.push({ code, room, dmg:0, exhausted:false, engaged:false });
  addLog("적 등장 — "+name+" ("+D.ROOMS[room].name+")"+((a.keywords||[]).includes("hunter")?" [사냥꾼]":""));
  renderEnemyMarkers(); resolveEngagements();
}

export function provokeAoO(done){
  done = done || function(){};
  D.closeAfterDefeatWindow();   // 다른 행동을 시작함 → "적 처치 직후" 반응 창 닫힘
  const foes = S.enemies.filter(en=> en.engaged && !en.exhausted && en.room===S.cur);
  if(!foes.length){ done(); return; }
  let i=0;
  const next=()=>{
    if(i>=foes.length){ done(); return; }
    const en=foes[i++], c=enemyCard(en);
    addLog(c.name+"의 기회공격!");
    takeDamageHorror(c.enemy_damage||0, c.enemy_horror||0, {source:"enemy_attack", attackingEnemy:en}, (canceled)=>{ if(!canceled) triggerEnemyAfterAttack(en); next(); });   // 취소(재빨리 피하다) 시 "공격한 후" 강제 건너뜀
  };
  next();
}

export function triggerEnemyAfterAttack(en){
  ((S.cardAbilities[en.code]||{}).abilities||[]).forEach(ab=>{
    if(ab.timing==="forced" && ab.when==="after_this_attacks") (ab.do||[]).forEach(eff=> runEffect(eff, null));
  });
}

export function resolveEngagements(){
  let changed=false;
  // 교전 유지 불변식: 같은 방이 아니게 되면(막 전환·강제이동 등 — 기본이동은 따라와서 해당 없음) 교전 해제
  if(!pawnMoving()) S.enemies.forEach(en=>{
    if(en.engaged && en.room!==S.cur){ en.engaged=false; changed=true; addLog(enemyCard(en).name+"과(와)의 교전이 풀렸습니다. (장소가 달라짐)"); }
  });
  S.enemies.forEach(en=>{
    if(en.engaged || en.exhausted) return;
    if(D.countInvestigatorsAt(en.room) >= 1){
      en.engaged = true; changed=true;   // 1인: 자동 교전. 다인: prey 기준 선택은 D.countInvestigatorsAt 확장 시 함께.
      addLog(enemyCard(en).name+"이(가) 당신과 교전했습니다!");
    }
  });
  if(changed){ renderEnemyMarkers(); renderPlayArea(); }   // 매 프레임 호출되므로 변경 시에만 재렌더(위협영역 카드도 갱신)
}

export function enemyEl(en){   // 적의 화면 요소(교전 카드 우선, 없으면 맵 마커)
  const ei = S.enemies.indexOf(en);
  return document.querySelector('.pc-enemy[data-ei="'+ei+'"]') || document.querySelector('.em-item[data-ei="'+ei+'"]') || null;
}

export function ensureCombatBanner(){ let b=document.getElementById("combat-banner");
  if(!b){ b=document.createElement("div"); b.id="combat-banner"; document.body.appendChild(b); } return b; }

export function combatBanner(text){   // 전투 시작 → 커밋 위쪽에 지속 표시(공격 수행 전까지 유지)
  const b=ensureCombatBanner(); clearTimeout(b._t); b.className="cb-banner show"; b.textContent=text;
}

export function hideCombatBanner(){ const b=document.getElementById("combat-banner"); if(b){ clearTimeout(b._t); b.classList.remove("show"); } }

export function combatResult(text, cls){   // 공격 수행 → 배너 자리에 결과 1.5초 후 사라짐
  const b=ensureCombatBanner(); clearTimeout(b._t);
  b.className="cb-result "+cls+" show"; b.textContent=text;
  b._t=setTimeout(()=>{ b.classList.remove("show"); }, 1500);
}

export function playBattleMotion(done){
  done = done || function(){};
  let ov=document.getElementById("battle-motion"); if(ov) ov.remove();
  ov=document.createElement("div"); ov.id="battle-motion";
  ov.innerHTML =
    '<video class="bm-left"  src="battleMotions/ghoul_hit.webm" playsinline></video>'+
    '<video class="bm-right" src="battleMotions/roland_gun.webm" playsinline></video>';
  document.body.appendChild(ov);
  // 소리 포함 재생(공격 확정=사용자 조작이라 허용). 정책상 막히면 음소거로 폴백해 영상은 뜨게.
  ov.querySelectorAll("video").forEach(v=>{ v.muted=false; v.volume=1;
    const p=v.play(); if(p&&p.catch) p.catch(()=>{ v.muted=true; v.play().catch(()=>{}); }); });
  requestAnimationFrame(()=> ov.classList.add("show"));
  let ended=false;
  const finish=()=>{ if(ended) return; ended=true; ov.classList.remove("show"); setTimeout(()=>{ ov.remove(); done(); }, 300); };
  setTimeout(finish, 6000);   // 6초(영상 길이) 후 진행. 파일 없어도 이 타이머로 계속됨
}

export function damageEnemy(en, n, o){
  o=o||{};
  const anchor = enemyEl(en);                 // 재렌더 전에 위치 캡처
  hitFlash(anchor);                           // 붉은 피격 플래시
  if(!o.noFloat) floatTextAt(anchor, "−"+n, "dmg-num");   // 피해 숫자(전투 명중 스탬프가 따로 뜨면 생략)
  en.dmg += n;
  addLog(enemyCard(en).name+"에게 피해 "+n+". ("+Math.max(0,enemyHealth(en)-en.dmg)+"/"+enemyHealth(en)+")");
  if(en.dmg >= enemyHealth(en)){
    addLog(enemyCard(en).name+" 격파!");
    const wasAtCur = (en.room===S.cur);
    const wasGhoulPriest = (en.code==="01116");
    S.enemies.splice(S.enemies.indexOf(en),1);
    const vc = enemyCard(en);
    if(D.isEncounterCard(en.code) && vc.victory){   // 승점 적 = 버린 더미 대신 승리 더미 + 승점 누적
      S.victoryDisplay.push(en.code);
      S.enemyVictoryPoints += vc.victory;
      addLog(vc.name+" — 승점 "+vc.victory+" 획득! (누적 "+S.enemyVictoryPoints+")");
    }else{
      D.discardToOrigin(en.code);   // 격파된 적 → 출신 더미(조우=조우버림, 플레이어 약점=플레이어버림)
    }
    if(wasAtCur) S.pendingDefeatReaction=true;   // 로랜드=단서 발견 등 → 결과 팝업 닫힌 뒤 물어봄(D.flushDefeatReaction)
    if(wasGhoulPriest && S.currentAct===3) S.ghoulPriestDefeated=true;   // 3막 해결 → 결과 팝업 닫힌 뒤 act3b
  }
  renderEnemyMarkers(); renderPlayArea();   // 위협영역 교전 적 카드도 갱신(격파 시 제거)
}

let fightTargetOverride=null;

export function startFightAction(opts){
  opts = opts||{};
  D.closeAfterDefeatWindow();   // 새 공격 = 이전 "처치 직후" 반응 창 닫힘
  const forced = opts.target || fightTargetOverride; fightTargetOverride=null;   // 적 메뉴에서 지정한 대상
  const targets = enemiesAt(S.cur);
  if(!targets.length){ showToast("이 장소에 적이 없습니다."); return; }
  const doIt=(en)=>{
    combatBanner("⚔ "+D.leadInvestigatorName()+"  →  "+enemyCard(en).name);   // 전투 시작 배너(D)
    let bonus = opts.bonus||0;
    if(opts.bonusIf && opts.bonusIf.cond==="clue_at_your_location" && D.cluesInRoom(S.cur).length>0)
      bonus = (opts.bonusIf.bonus && opts.bonusIf.bonus.combat) || bonus;   // 로랜드 권총: 단서 있으면 +1→+3
    startSkillTest({ skill:"combat", testType:"fight", location:S.cur, difficulty:(enemyCard(en).enemy_fight||1),
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(rm)=>D.cluesInRoom(rm).length, blanked:D.investigatorBlanked() },
      actionLabel:(opts.label||"공격"), targetLabel:"적 전투",
      extraTestBonus:bonus,
      onResolve:(r)=> applyFightResult(en, r, opts) });
  };
  if(forced && targets.indexOf(forced)>=0){ doIt(forced); return; }   // 지정 대상 우선
  if(targets.length===1) doIt(targets[0]);
  else D.showCardPickPopup("공격할 적을 선택하세요", targets.map(e=>e.code), (c,i)=> doIt(targets[i]));
}

export function committedAttackDamage(r){
  let extra=0;
  (r.committed||[]).forEach(code=>{
    ((S.cardAbilities[code]||{}).abilities||[]).forEach(ab=>{
      const cond=ab.conditional;
      if(cond && cond.if==="attack_test_succeeded" && cond.extra_effect && cond.extra_effect.effect==="extra_damage")
        extra += (cond.extra_effect.value||0);
    });
  });
  return extra;
}

export function enemyHasTrait(en, trait){ return ((S.byCode[en.code]||{}).real_traits||"").includes(trait); }

export function monsterAttackExtra(en){
  if(!enemyHasTrait(en, "Monster")) return 0;
  let extra=0;
  S.playedCards.forEach(p=>{
    ((S.cardAbilities[p.code]||{}).abilities||[]).forEach(ab=>{
      if(ab.timing==="reaction" && ab.when==="after_successful_attack" && ab.condition==="target_is_monster")
        (ab.do||[]).forEach(eff=>{ if(eff.effect==="extra_damage") extra += (eff.value||0); });
    });
  });
  return extra;
}

export function applyFightResult(en, r, opts){
  opts=opts||{}; const label=opts.label||"공격";
  let dmg = 1 + (opts.extraDamage||0);   // 기본 1 + 무기 추가피해
  // 마체테: 공격 대상이 나와 교전 중인 유일한 적이면 +1
  if(opts.conditional && opts.conditional.if==="only_enemy_engaged_with_you"
     && en.engaged && enemiesAt(S.cur).filter(e=>e.engaged).length===1)
    dmg += (opts.conditional.extra_damage||0);
  const commitDmg = committedAttackDamage(r);   // 무자비한 일격 등
  const monsterExtra = r.success ? monsterAttackExtra(en) : 0;   // 리타 챈들러: 괴물 적 공격 성공 시 +피해
  const total = dmg + commitDmg + monsterExtra;
  const base={ action:label, skill:"combat", skillLabel:"전투", skillVal:r.base, drawn:r.drawn,
    total:r.total, target:r.difficulty, targetLabel:"적", targetSkill:"combat", success:r.success, autoFail:r.autoFail };
  const lines = applyCommittedDraws(r);   // 배짱 등 커밋 드로우
  S.pendingDefeatReaction = false;          // 이 공격 시작 — 이전 잔여 반응 무시(스테일 방지)
  hideCombatBanner();                     // 공격 수행(판정 확정) → 배너 사라짐(D)

  const finish = ()=>{
    if(r.success){ combatResult("명중! −"+total, "hit"); hitFlash(enemyEl(en)); damageEnemy(en, total, {noFloat:true}); }
    else { combatResult("빗나감", "miss"); }
    // 보복(Retaliate): 준비된 보복 적 공격을 '실패'하면 결과 적용 후 그 적이 공격자에게 공격 1회(적 소진 X)
    const willRetaliate = !r.success && S.enemies.includes(en) && !en.exhausted && enemyHasKeyword(en,"retaliate");
    const extraTxt = (r.success ? ("명중! 피해 "+total+((commitDmg||monsterExtra)?" (기본 "+dmg+(commitDmg?" + 커밋 "+commitDmg:"")+(monsterExtra?" + 리타 "+monsterExtra:"")+")":"")+".") : "빗나감.")
      + (willRetaliate ? " "+enemyCard(en).name+"의 <span class=\"warn\">보복!</span>" : "");
    showPopup(testResultHtml({...base, extra: extraTxt+(lines.length?" "+lines.join(" "):"")}),
      [{label:"확인", primary:true, act:()=>{ hidePopup(); D.flushDefeatReaction(); if(willRetaliate) doRetaliate(en); }}], null, "pb-test "+(r.success?"pb-ok":"pb-no"));   // 결과 확인 후 처치 반응(로랜드) / 보복
  };

  if(opts.weaponCode==="01516" && isGhoul(en.code)) playBattleMotion(finish);   // 45구경 자동 권총 + 구울 대상 = 전투 영상 6초 후 결과(ghoul_hit는 구울에게만)
  else finish();
}

export function doRetaliate(en){
  if(!S.enemies.includes(en) || en.exhausted) return;
  const c=enemyCard(en);
  addLog(c.name+"의 보복 공격!");
  takeDamageHorror(c.enemy_damage||0, c.enemy_horror||0, {source:"enemy_attack", attackingEnemy:en}, (canceled)=>{ if(!canceled) triggerEnemyAfterAttack(en); });
}

export function startEvadeAction(opts){
  opts = opts||{};
  D.closeAfterDefeatWindow();
  const targets = enemiesAt(S.cur).filter(e=>e.engaged);
  if(!targets.length){ showToast("교전 중인 적이 없습니다."); return; }
  const doIt=(en)=>{
    startSkillTest({ skill:"agility", testType:"evade", location:S.cur, difficulty:(enemyCard(en).enemy_evade||1),
      ctx:{ charCode: S.activeInvestigator?S.activeInvestigator.investigator:null, myLocation:S.cur, cluesAt:(rm)=>D.cluesInRoom(rm).length, blanked:D.investigatorBlanked() },
      actionLabel:"회피", targetLabel:"적 회피",
      onResolve:(r)=>{
        const base={ action:"회피", skill:"agility", skillLabel:"민첩", skillVal:r.base, drawn:r.drawn,
          total:r.total, target:r.difficulty, targetLabel:"적", targetSkill:"agility", success:r.success, autoFail:r.autoFail };
        const lines = applyCommittedDraws(r);
        if(r.success){ en.exhausted=true; en.engaged=false; renderEnemyMarkers(); renderPlayArea(); }   // 회피 성공 → 교전 해제 → 위협영역서 제거
        showPopup(testResultHtml({...base, extra:(r.success?"회피 성공 — 적이 소진되고 교전이 풀렸습니다.":"회피 실패.")+(lines.length?" "+lines.join(" "):"")}),
          [{label:"확인", primary:true, act:hidePopup}], null, "pb-test "+(r.success?"pb-ok":"pb-no"));
      } });
  };
  if(opts.target && targets.indexOf(opts.target)>=0){ doIt(opts.target); return; }   // 적 메뉴에서 지정한 대상
  if(targets.length===1) doIt(targets[0]);
  else D.showCardPickPopup("회피할 적을 선택하세요", targets.map(e=>e.code), (c,i)=> doIt(targets[i]));
}

export function nextStepToward(from, to){
  if(from===to) return null;
  const q=[[from]], seen=new Set([from]);
  while(q.length){
    const path=q.shift(), last=path[path.length-1];
    for(const nb of (D.ADJ[last]||[])){
      if(seen.has(nb)) continue; seen.add(nb);
      const np=path.concat(nb);
      if(nb===to) return np[1];
      q.push(np);
    }
  }
  return null;
}

export function runEnemyPhase(){
  S.enemies.forEach(en=>{
    if(en.engaged || en.exhausted) return;
    const kw=(S.cardAbilities[en.code]||{}).keywords||[];
    // 목적지 결정: 특별규칙 발동 시 구울=거실 우선, 아니면 사냥꾼=가장 가까운 조사자(1인=S.cur)
    let dest=null, tag="[사냥꾼]";
    if(S.agenda3aRule && isGhoul(en.code)){ dest="parlor"; tag="[특별규칙]"; }
    else if(kw.includes("hunter")) dest=S.cur;
    if(!dest || en.room===dest) return;
    const next=nextStepToward(en.room, dest);
    if(next && canEnemyEnterLocation(next, en)){
      en.room=next;
      addLog(enemyCard(en).name+"이(가) "+D.ROOMS[next].name+"(으)로 이동했습니다. "+tag);
    } else if(next){
      addLog(enemyCard(en).name+"의 이동이 바리케이드에 막혔습니다.");
    }
  });
  renderEnemyMarkers();   // 이동 반영(방 이동 + 구울 예측 배지 갱신)
  resolveEngagements();
  // 3.3 교전 적 공격 — 순차(피해/공포 할당 팝업이 있어 하나씩)
  const attackers = S.enemies.filter(en=>en.engaged && !en.exhausted && en.room===S.cur);   // 같은 방일 때만(교전 적은 따라오므로 원칙상 항상 같은 방)
  if(!attackers.length) return;
  S.phasePaused = true;   // 공격 할당 끝날 때까지 정비로 안 넘어감
  let i=0;
  const nextAttack=()=>{
    if(i>=attackers.length){ S.phasePaused=false; resumeEnemy(); return; }
    const en=attackers[i++]; const c=enemyCard(en);
    addLog(c.name+"의 공격!");
    takeDamageHorror(c.enemy_damage||0, c.enemy_horror||0, {source:"enemy_attack", attackingEnemy:en}, (canceled)=>{ if(!canceled) triggerEnemyAfterAttack(en); nextAttack(); });   // 취소 시 "공격한 후"(시종 파멸) 건너뜀
  };
  nextAttack();
}
