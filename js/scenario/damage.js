/* =====================================================================
   scenario/damage.js — 피해·공포 할당 시스템.
   순서(직접 제외): ①취소/상쇄 카드 제안 → ②soak 자산 할당 팝업 → 남은 건 조사자(재확인) → 우클릭/취소=조사자.
   직접(direct) 피해/공포는 취소·할당 없이 조사자에게 바로.
   ※ 쓰러짐 판정(checkInvestigatorDefeat)·에필로그는 시나리오 고유라 인라인 잔류 → 주입받는다.
     반응격발 아이콘(RX_ICON)·요구조건(requiresMet)·처치반응 flush도 인라인 공용이라 주입.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { showPopup, hidePopup } from "./popup.js";
import { cardFront } from "./card-img.js";
import { renderInvestigator } from "./investigator.js";
import { renderHand } from "./hand.js";
import { updatePiles } from "./piles.js";
import { renderPlayArea, discardPlayed } from "./play.js";
import { floatTextAt, hitFlash } from "./combat-fx.js";
import { enemyCard, damageEnemy } from "./enemy.js";
import { isThreatCard } from "./threats.js";   // 위협영역 카드엔 피해·공포 할당 X(threats)
import { audio } from "../shared/audio.js";

// 주입(scenario1 인라인: 쓰러짐 판정·요구조건·처치반응·반응 아이콘)
let D = {
  checkInvestigatorDefeat(){}, requiresMet:()=>true, flushDefeatReaction(){}, RX_ICON:"",
};
export function setDamageDeps(o){ Object.assign(D, o); }

export function assetHP(p){ return (S.byCode[p.code]||{}).health || 0; }
export function assetSN(p){ return (S.byCode[p.code]||{}).sanity || 0; }
export function assetRemain(p, kind){ return kind==="damage" ? assetHP(p)-(p.dmg||0) : assetSN(p)-(p.hor||0); }
// 조사자에게 직접 적용(격파 확인 포함)
export function applyToInvestigator(dmg, hor, tag){
  // 좌측하단 초상화 위에 크게 — 피해=빨강 −N, 공포=파랑 −N (둘 다면 좌우로 나눠 표시)
  const invEl = document.querySelector(".bt-investigator");
  if(dmg && hor){ floatTextAt(invEl, "−"+dmg, "portrait-hit dmg-num", 0.3); floatTextAt(invEl, "−"+hor, "portrait-hit hor-num", 0.7); }
  else if(dmg){ floatTextAt(invEl, "−"+dmg, "portrait-hit dmg-num"); }
  else if(hor){ floatTextAt(invEl, "−"+hor, "portrait-hit hor-num"); }
  if(dmg||hor) hitFlash(invEl);
  if(dmg) S.invDamage+=dmg; if(hor) S.invHorror+=hor;
  renderInvestigator();
  if(dmg||hor) addLog((tag?tag+" ":"")+"조사자 "+[dmg?"피해 "+dmg:"",hor?"공포 "+hor:""].filter(Boolean).join("·")+" 받음.");
  if(dmg||hor) D.checkInvestigatorDefeat();   // 체력/정신 0 → 쓰러짐(에필로그)
}
// 피해/공포 받기 진입점
// done(canceled) — canceled=true면 공격이 취소됨(재빨리 피하다). 호출부는 이때 "공격한 후" 강제효과를 건너뜀.
export function takeDamageHorror(dmg, hor, opts, done){
  opts=opts||{}; done=done||function(){}; dmg=dmg||0; hor=hor||0;
  if(dmg<=0 && hor<=0){ done(false); return; }
  // 취소는 직접이든 아니든 거침. 직접은 이후 "자산 할당만" 불가 → 조사자 직접.
  proposeCancel(opts, ()=>done(true), ()=>{
    if(opts.direct){ applyToInvestigator(dmg, hor, "직접"); done(false); return; }
    assignBoth(dmg, hor, opts, ()=>done(false));   // 피해+공포 한 팝업에서 함께 할당
  });
}
// ① 취소/상쇄 — 재빨리 피하다 등(적 공격 한정). 손에 있고 requires(자원) 충족 시만 제안.
export function proposeCancel(opts, onCancelled, onProceed){
  if(opts.source!=="enemy_attack"){ onProceed(); return; }
  let hi=-1, hab=null;
  S.playerHand.forEach((code,i)=>{
    if(hi>=0) return;
    const ab=((S.cardAbilities[code]||{}).abilities||[]).find(a=> a.when==="enemy_attacks_investigator_at_your_location" && (a.do||[]).some(e=>e.effect==="cancel"));
    if(ab && D.requiresMet(ab.requires)){ hi=i; hab=ab; }
  });
  if(hi<0){ onProceed(); return; }
  const code=S.playerHand[hi], nm=S.byCode[code]?S.byCode[code].name:code, cost=(S.byCode[code].cost||0);
  showPopup('<b>'+enemyCard(opts.attackingEnemy).name+'</b>의 공격 — <b>'+nm+'</b>을(를) 플레이해 취소하시겠습니까? (자원 -'+cost+')', [
    {label:"아니오", act:()=>{ hidePopup(); onProceed(); }},
    {label:"예("+nm+")", primary:true, act:()=>{ hidePopup();
      audio.sfx("card-play"); S.invResource-=cost; S.playerHand.splice(hi,1); S.playerDiscard.push(code);
      renderHand(); renderInvestigator(); updatePiles();
      addLog(nm+" — 공격을 취소했습니다."); onCancelled(); }},
  ]);
}
// ② 종류별 할당(damage/horror)
// 피해+공포 통합 할당 — 한 팝업에서 자산에 피해/공포 각각 배정, 남은 건 조사자.
export function assignBoth(dmg, hor, opts, next){
  const soakAll = S.playedCards.filter(p=> !isThreatCard(p.code) && (assetHP(p)>0 || assetSN(p)>0));
  if(!soakAll.length){ applyToInvestigator(dmg, hor); checkAssetsDefeat(); next(); return; }
  const dA={}, hA={};   // playedCards index → 피해/공포 배정
  soakAll.forEach(p=>{ const i=S.playedCards.indexOf(p); dA[i]=0; hA[i]=0; });
  const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
  const commit=()=>{
    const dogRx=[];   // 경비견 등 피해 반응(할당 커밋 후 순차 확인)
    soakAll.forEach(p=>{ const i=S.playedCards.indexOf(p);
      if(dA[i]>0){ p.dmg=(p.dmg||0)+dA[i]; addLog(S.byCode[p.code].name+"에 피해 "+dA[i]+" 할당."); collectAssetDamageReaction(p, opts, dogRx); }
      if(hA[i]>0){ p.hor=(p.hor||0)+hA[i]; addLog(S.byCode[p.code].name+"에 공포 "+hA[i]+" 할당."); }
    });
    applyToInvestigator(dmg-sum(dA), hor-sum(hA));
    renderPlayArea(); checkAssetsDefeat();
    askAssetDamageReactions(dogRx, next);   // 반응 확인 팝업들 끝난 뒤 다음 진행
  };
  const open=()=>{
    const render=()=>{
      const remD=dmg-sum(dA), remH=hor-sum(hA);
      let h='<div class="asg-title">피해·공포 할당 — 남은 '+(dmg?'<span class="asg-rem">피해 '+remD+'</span>':'')+(dmg&&hor?' · ':'')+(hor?'<span class="asg-rem">공포 '+remH+'</span>':'')+' (남은 만큼 조사자)</div><div class="asg-row">';
      soakAll.forEach(p=>{ const i=S.playedCards.indexOf(p), capD=assetRemain(p,"damage"), capH=assetRemain(p,"horror");
        h+='<div class="asg-item"><img src="'+cardFront(p.code)+'"><div class="asg-nm">'+S.byCode[p.code].name+'</div>';
        if(dmg>0 && capD>0) h+='<div class="asg-ctrl"><span class="ai-lab">🩸</span><button data-t="d" data-i="'+i+'" data-x="-1">−</button><span>'+dA[i]+'/'+capD+'</span><button data-t="d" data-i="'+i+'" data-x="1">＋</button></div>';
        if(hor>0 && capH>0) h+='<div class="asg-ctrl"><span class="ai-lab">🧠</span><button data-t="h" data-i="'+i+'" data-x="-1">−</button><span>'+hA[i]+'/'+capH+'</span><button data-t="h" data-i="'+i+'" data-x="1">＋</button></div>';
        h+='</div>';
      });
      h+='</div>';
      document.getElementById("popup-msg").innerHTML=h;
      document.querySelectorAll("#popup-msg .asg-ctrl button").forEach(b=>{ b.onclick=()=>{
        const t=b.dataset.t, i=+b.dataset.i, x=+b.dataset.x, p=S.playedCards[i];
        const alloc=t==="d"?dA:hA, cap=assetRemain(p, t==="d"?"damage":"horror"), total=t==="d"?dmg:hor;
        const others=Object.entries(alloc).reduce((a,[k,v])=>a+(+k===i?0:v),0);
        alloc[i]=Math.max(0, Math.min(cap, Math.min(alloc[i]+x, total-others)));
        render();
      }; });
    };
    showPopup("", [
      {label:"취소(전부 조사자)", act:()=>{ hidePopup(); applyToInvestigator(dmg, hor); checkAssetsDefeat(); next(); }},
      {label:"확인", primary:true, act:()=>{
        const remD=dmg-sum(dA), remH=hor-sum(hA);
        if(remD>0 || remH>0){ hidePopup(); showPopup('남은 '+(remD?'<b>피해 '+remD+'</b>':'')+(remD&&remH?' · ':'')+(remH?'<b>공포 '+remH+'</b>':'')+'이(가) <b>조사자</b>에게 적용됩니다. 괜찮으십니까?', [
          {label:"아니오(다시 할당)", act:()=>{ hidePopup(); open(); }},
          {label:"예", primary:true, act:()=>{ hidePopup(); commit(); }},
        ], ()=>{ hidePopup(); open(); }); }   // 우클릭 = 스킵이 아니라 "다시 할당"으로 되돌림(정지·미적용 버그 방지)
        else { hidePopup(); commit(); }
      }},
    ], ()=>{ hidePopup(); applyToInvestigator(dmg, hor); checkAssetsDefeat(); next(); }, "asg-pop");   // 우클릭 = 전부 조사자
    render();
  };
  open();
}
// 경비견 등: 자산이 적 공격 피해를 받을 때 → "공격한 적에게 피해?" 반응(수집만; 커밋 후 순차 확인 팝업)
export function collectAssetDamageReaction(p, opts, into){
  if(!opts.attackingEnemy) return;
  ((S.cardAbilities[p.code]||{}).abilities||[]).forEach(ab=>{
    if(ab.timing==="reaction" && ab.when==="self_takes_damage_from_enemy_attack")
      (ab.do||[]).forEach(e=>{ if(e.effect==="damage" && e.target==="attacking_enemy")
        into.push({ p, enemy:opts.attackingEnemy, value:e.value||1 }); });
  });
}
// 수집된 자산 피해 반응 → 반응격발 아이콘 확인 팝업 순차(이미 처치·부재 적은 스킵) → 끝나면 done()
export function askAssetDamageReactions(list, done){
  done = done || function(){};
  (function next(){
    while(list.length && (!list[0].enemy || !S.enemies.includes(list[0].enemy))) list.shift();   // 죽었/사라진 적은 스킵
    if(!list.length){ done(); return; }
    const { p, enemy, value } = list.shift();
    const name = S.byCode[p.code] ? S.byCode[p.code].name : p.code;
    const enName = enemyCard(enemy) ? enemyCard(enemy).name : "적";
    showPopup(D.RX_ICON+' <b>반응 격발</b> — '+name+'<br>방금 피해를 입힌 <b>'+enName+'</b>에게 피해 <b>'+value+'</b>을(를) 주시겠습니까?', [
      {label:"아니오", act:()=>{ hidePopup(); next(); }},
      {label:"예(피해 "+value+")", primary:true, act:()=>{ hidePopup();
        addLog(name+" 반응 — "+enName+"에게 피해 "+value+"."); damageEnemy(enemy, value); D.flushDefeatReaction(); next(); }},
    ]);
  })();
}
// 자산 파괴(체력/정신 초과) → 버림
export function checkAssetsDefeat(){
  [...S.playedCards].forEach(p=>{
    const h=assetHP(p), s=assetSN(p);
    if((h>0 && (p.dmg||0)>=h) || (s>0 && (p.hor||0)>=s)){
      addLog((S.byCode[p.code].name)+"이(가) 파괴되었습니다.");
      const i=S.playedCards.indexOf(p); if(i>=0) discardPlayed(i);
    }
  });
}
