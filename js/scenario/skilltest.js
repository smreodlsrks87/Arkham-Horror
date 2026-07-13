/* =====================================================================
   scenario/skilltest.js — 능력치 테스트 엔진(순수 계산 + 규칙)
   모든 판정(조사·전투·회피·교섭·조우)이 공유하는 파이프라인의 "엔진".
   흐름(구동·UI는 scenario1): 선언 → 커밋 윈도우 → 토큰 공개 → 합계 → 성공/실패.

   커밋: 손패 카드를 소비하면 그 카드 좌상단의 "테스트 능력치와 같은 기호" 수만큼 +.
         만능(?)=skill_wild 은 지금 테스트하는 능력치로 계산.

   이 파일은 "엔진"(순수 계산: commitIcons·resolveTest)과 "UI/커밋 흐름"(선언→커밋창→
   토큰공개→결과)을 함께 담는다. UI는 다른 도메인(hand·investigator·popup·play영역)을 쓰므로
   일부는 import, scenario1 전용(SKILL_KO·showPersistentCard·renderPlayArea·drawCards)은 주입.
   ===================================================================== */
import { drawChaosToken, resolveToken, tokenChip } from "./tokens.js";
import { S } from "./state.js";
import { cardFront, cardTextOf } from "./card-img.js";
import { cleanText } from "../shared/card-text.js";
import { conditionalTestBonus } from "./abilities.js";
import { committableHand, renderHand } from "./hand.js";
import { renderInvestigator } from "./investigator.js";
import { showPopup, hidePopup, showToast } from "./popup.js";
import { addLog } from "./log.js";
import { updatePiles } from "./piles.js";
import { renderPlayArea } from "./play.js";   // 플레이영역 재렌더(커밋 진입/강화/확정 시)

// ── 주입(scenario1 전용 링크) ──
let D = { SKILL_KO:{}, showPersistentCard(){}, drawCards:()=>0 };
export function setSkillTestDeps(o){ Object.assign(D, o); }

const SKILL_FIELD = { willpower:"skill_willpower", intellect:"skill_intellect", combat:"skill_combat", agility:"skill_agility" };

// 이 카드를 테스트에 커밋할 때 더해지는 기호 수(해당 능력치 + 만능)
export function commitIcons(card, skill){
  if(!card) return 0;
  return (card[SKILL_FIELD[skill]] || 0) + (card.skill_wild || 0);
}
// 커밋 가능? (매칭 기호나 만능이 1개 이상)
export function isCommittable(card, skill){ return commitIcons(card, skill) > 0; }

// 판정 해석 — base(기본능력치 + 커밋 + 자산보너스)에 혼돈 토큰을 뽑아 합산.
// ctx = { charCode, myLocation, cluesAt } (엘더사인 등 토큰 해석용)
// 반환: { drawn, tokenMod, base, total, difficulty, success, autoFail }
export function resolveTest(base, difficulty, ctx){
  const drawn = [];
  const first = resolveToken(drawChaosToken(), ctx);
  drawn.push(first);
  let mod = first.value, autoFail = first.autoFail;
  for(let i=0; i<(first.drawMore||0); i++){           // 추가 뽑기(예: 추종자 어려움)
    const more = resolveToken(drawChaosToken(), ctx);
    drawn.push(more); mod += more.value; if(more.autoFail) autoFail = true;
  }
  // 능력치는 최소 0 — 토큰 페널티로 (능력치+커밋+보너스+토큰)이 음수가 돼도 0으로 계산.
  // 예: 지식2 + 토큰(-5) = -3 → 0. 은폐0이면 0>=0 성공(단, 촉수=autoFail이면 실패).
  const total = Math.max(0, base + mod);
  return { drawn, tokenMod: mod, base, total, difficulty, success: !autoFail && total >= difficulty, autoFail };
}

/* ===================================================================
   여기서부터: 능력 테스트 UI / 커밋 흐름 (scenario1 인라인에서 이관)
   =================================================================== */
const SKILL_ICON = { willpower:["a","#5a9ad4"], intellect:["f","#c98adc"], combat:["d","#d47a4a"], agility:["s","#7ac48a"] };

// 판정 토큰 1개 → 칩(심볼=아이콘, 숫자=값 내장)
function tokenChipFor(t){
  if(t.type==="number") return tokenChip((t.value>=0?"+":"")+t.value);
  return tokenChip(t.type);
}
// 인라인 능력치 아이콘(계산줄용). 폰트 글리프가 없으면 빈 문자열.
function skillIcoInline(skill){ const [ch,col]=SKILL_ICON[skill]||["",""]; return ch?'<span class="tr-skill-i" style="color:'+col+'">'+ch+'</span>':""; }
/* 능력 판정 결과 팝업 HTML — 능력치·토큰 아이콘으로 가시성↑. */
export function testResultHtml(o){
  const [ch,col]=SKILL_ICON[o.skill]||["",""];
  const skIco = ch ? '<span class="tr-skill" style="color:'+col+'">'+ch+'</span>' : "";
  const resCls = o.success ? "tr-ok" : "tr-no";
  const head = '<div class="tr-head">'+o.action+' '+skIco+' <span class="'+resCls+'">'+(o.success?"성공!":"실패…")+'</span></div>';
  let calc;
  if(o.autoFail){
    calc = '<div class="tr-calc">'+tokenChip("tentacle")+' <span class="tr-no">촉수 · 자동 실패</span></div>';
  }else{
    const chips = o.drawn.map(t=>{
      const chip=tokenChipFor(t);
      if(t.type==="number") return chip;                      // 숫자칩엔 값 내장
      const v=(t.value>=0?"+":"")+t.value;
      return chip+'<span class="tr-tv">'+v+'</span>';          // 심볼 + 값
    }).join('<span class="tr-op">+</span>');
    // 대상 표시 — 적 전투/회피는 아이콘으로("적 ⚔ 3"), 그 외(난이도·은폐)는 텍스트 유지
    const tgtLead = o.targetSkill ? (o.targetLabel+' '+skillIcoInline(o.targetSkill)) : o.targetLabel;
    let tgt = tgtLead+' '+o.target;
    if(o.targetBreak && o.targetBreak.mod){ const m=o.targetBreak.mod; tgt += ' <span class="tr-op">('+o.targetBreak.base+(m<0?'−'+(-m):'+'+m)+')</span>'; }
    // 조사자 능력치 — 아이콘 우선(글리프 없으면 텍스트 라벨로 폴백)
    const myLead = skillIcoInline(o.skill) || o.skillLabel;
    calc = '<div class="tr-calc">'+myLead+' '+o.skillVal+' <span class="tr-op">+</span> '+chips+
           ' <span class="tr-op">=</span> <b class="'+resCls+'">'+o.total+'</b> '+(o.success?"≥":"<")+' '+tgt+'</div>';
  }
  return '<div class="test-result">'+head+calc+(o.extra?'<div class="tr-extra">'+o.extra+'</div>':"")+'</div>';
}

function skillValue(skill){ return (S.invCard ? (S.invCard["skill_"+skill]||0) : 0) + (S.statBonus[skill]||0); }
// 이 능력치 테스트를 올려주는 플레이 자산의 bonus 능력(비용 지불 가능한 것) 찾기
function boostAbilityFor(p, skill){
  const abils=(S.cardAbilities[p.code]||{}).abilities||[];
  for(let ai=0; ai<abils.length; ai++){
    const ab=abils[ai];
    const eff = ab.do && ab.do.find(e=> e.effect==="bonus" && e.bonus && e.bonus[skill]);
    if(!eff) continue;
    const cost=(ab.cost && ab.cost.resources)||0;
    if(cost && S.invResource < cost) continue;
    return { ai, ab, amount:eff.bonus[skill], cost };
  }
  return null;
}
function boostAssets(skill){ return S.playedCards.map((p,pi)=>({pi, b:boostAbilityFor(p,skill)})).filter(x=>x.b); }

// 커밋 상태 — commitMode/Sel/Cfg는 hand(손패 렌더)·scenario1(플레이영역·우클릭)이 읽으므로 export(live).
export let commitMode=false, commitSel=new Set(), commitCfg=null;
let commitAssetBonus=0;

export function startSkillTest(cfg){
  // 라운드 대체 효과(정신력에 달린 문제): 전투/민첩 판정을 지식으로 대체할지 먼저 확인(강제 X)
  const sub = S.roundEffects.find(e=> e.kind==="skill_substitute" && e.from.includes(cfg.skill));
  if(sub){
    if(sub.auto){ startSkillTestInner({...cfg, skill:sub.to}); return; }   // auto=강제 대체(안 물어봄)
    showPopup(D.SKILL_KO[cfg.skill]+' 판정을 <span class="hl">'+D.SKILL_KO[sub.to]+'</span>으로 대체하시겠습니까?<br>(정신력에 달린 문제)', [
      {label:"아니오("+D.SKILL_KO[cfg.skill]+")", act:()=>{ hidePopup(); startSkillTestInner(cfg); }},
      {label:"예("+D.SKILL_KO[sub.to]+")", primary:true, act:()=>{ hidePopup(); startSkillTestInner({...cfg, skill:sub.to}); }},
    ]);
    return;
  }
  startSkillTestInner(cfg);
}
// 조우 능력테스트 팝업 상단 — 좌:일러스트 / 우:번역 (커밋 코멘트 위에 얹음)
export function encCardHeaderHtml(code){
  const c=S.byCode[code]||{};
  return '<div class="stc-head">'+
    '<img class="stc-img" src="'+cardFront(code)+'" alt="">'+
    '<div class="stc-info"><div class="stc-nm">'+(c.name||code)+'</div>'+
    (cardTextOf(code)?'<div class="stc-txt">'+cleanText(cardTextOf(code))+'</div>':'')+'</div></div>';
}
function startSkillTestInner(cfg){
  const hand = committableHand(cfg.skill);
  const assets = boostAssets(cfg.skill);
  const header = cfg.cardCode ? encCardHeaderHtml(cfg.cardCode) : "";
  // 조우 카드면 커밋 모드/판정 동안 상단에 카드를 계속 띄운다(팝업 닫힌 뒤 기호 확인용)
  const keepCard = ()=>{ if(cfg.cardCode) D.showPersistentCard(cfg.cardCode); };
  if(!hand.length && !assets.length){ keepCard(); resolveTestNow(cfg, 0); return; }   // 커밋 옵션 없음 → 즉시 판정
  const cmt = '<div class="stc-cmt"><span class="hl">'+cfg.actionLabel+'</span> 판정 — 커밋하거나 도움을 받으시겠습니까?<br>손패 기호·강화 자산으로 판정값을 올릴 수 있습니다.</div>';
  showPopup(header + cmt, [
    {label:"아니오(바로 판정)", act:()=>{ hidePopup(); keepCard(); resolveTestNow(cfg, 0); }},
    {label:"예(커밋)", primary:true, act:()=>{ hidePopup(); keepCard(); enterCommit(cfg); }},
  ], ()=>{ hidePopup(); keepCard(); setTimeout(()=>resolveTestNow(cfg, 0), 0); }, cfg.cardCode?"stc-pop":"");   // 우클릭 = 커밋 없이 판정. setTimeout: 같은 우클릭이 결과 팝업 닫는 것 방지
}
function enterCommit(cfg){
  commitMode=true; commitSel.clear(); commitCfg=cfg; commitAssetBonus=0;
  document.getElementById("stage").classList.add("commit-active");   // 손패·플레이자산만 밝게
  // 커밋 지시문 + 보너스 카운터(선택 팝업과 이어지는 문구)
  const commitBody =
    '<div class="stc-commit"><div class="stc-cmt"><b class="hl">'+cfg.actionLabel+'</b> 판정 — 커밋 중.<br>'+
    '테스트 기호 있는 <b>손패</b>(파란 테두리)·강화 <b>자산</b>을 <b>좌클릭</b>해 추가, 다 골랐으면 <b>우클릭</b>으로 판정.</div>'+
    '<div class="stc-bonus">추가 보너스 <b id="cm-b">+0</b></div></div>';
  if(cfg.cardCode){
    // 조우 능력테스트: 커밋 선택 팝업(정중앙)과 "같은 박스·같은 위치·같은 크기"로 그대로 이어지게 정중앙에 카드+지시문
    D.showPersistentCard(cfg.cardCode, commitBody, {center:true});
  }else{
    // 그 외(전투·조사·능력 판정): 카드가 없으므로 기존 하단 힌트 박스 사용
    const hint=document.getElementById("mull-hint");
    hint.innerHTML =
      '<div class="mh-title">'+cfg.actionLabel+' 판정 — 커밋</div>'+
      '<div class="mh-body">테스트 기호가 있는 <b>손패</b>(파란 테두리)·강화 <b>자산</b>을 <b>좌클릭</b>해 추가.<br>다 골랐으면 <b>우클릭</b>으로 판정.</div>'+
      '<div class="mh-count">추가 보너스 <b id="cm-b">+0</b></div>';
    hint.classList.add("show");
  }
  renderHand(); renderPlayArea(); updateCommitBonus();
}
function updateCommitBonus(){
  let icons=0; commitSel.forEach(i=> icons += commitIcons(S.byCode[S.playerHand[i]], commitCfg.skill));
  const el=document.getElementById("cm-b"); if(el) el.textContent = "+" + (icons + commitAssetBonus);
}
// "능력 테스트당 최대 N장" — 같은 코드 카드가 이미 한도만큼 커밋됐는지(카드 단위 제한). exceptIdx는 자기 자신 제외.
export function commitLimitReached(code, exceptIdx){
  const lim = (S.cardAbilities[code]||{}).commit_limit || 0;
  if(!lim) return false;
  let cnt=0; commitSel.forEach(j=>{ if(j!==exceptIdx && S.playerHand[j]===code) cnt++; });
  return cnt >= lim;
}
export function toggleCommit(i){
  if(!commitMode) return;
  if(commitSel.has(i)){ commitSel.delete(i); }
  else{
    if(commitLimitReached(S.playerHand[i], i)){ showToast("이 카드는 능력 테스트당 1장만 커밋할 수 있습니다."); return; }
    commitSel.add(i);
  }
  renderHand(); updateCommitBonus();
}
export function canBoost(pi){ return !!(commitMode && S.playedCards[pi] && boostAbilityFor(S.playedCards[pi], commitCfg.skill)); }
export function useBoostAsset(pi){
  const p=S.playedCards[pi]; if(!p||!commitMode) return;
  const b=boostAbilityFor(p, commitCfg.skill); if(!b){ return; }
  if(b.cost){ S.invResource-=b.cost; renderInvestigator(); }
  commitAssetBonus += b.amount;
  addLog((S.byCode[p.code]?S.byCode[p.code].name:p.code)+" 사용 — "+commitCfg.actionLabel+" +"+b.amount+(b.cost?" (자원 -"+b.cost+")":"")+".");
  renderPlayArea(); updateCommitBonus();
}
export function confirmCommit(){
  if(!commitMode) return;
  const cfg=commitCfg;
  const idxs=[...commitSel].sort((a,b)=>b-a);
  let icons=0; const committed=[];
  idxs.forEach(i=> icons += commitIcons(S.byCode[S.playerHand[i]], cfg.skill));
  const bonus = icons + commitAssetBonus;
  idxs.forEach(i=>{ const code=S.playerHand.splice(i,1)[0]; committed.push(code); S.playerDiscard.push(code); });   // 커밋 카드 버림(코드 기록)
  commitMode=false; commitSel.clear();
  document.getElementById("stage").classList.remove("commit-active");
  document.getElementById("mull-hint").classList.remove("show");
  renderHand(); renderPlayArea(); updatePiles();
  if(bonus) addLog("커밋 보너스 +"+bonus+".");
  if(cfg.cardCode) D.showPersistentCard(cfg.cardCode);   // 커밋 끝 → 결과 팝업(정중앙)과 안 겹치게 카드는 상단 참조용으로 전환
  resolveTestNow(cfg, bonus, committed);
}
function resolveTestNow(cfg, extraBonus, committed){
  const base = skillValue(cfg.skill) + conditionalTestBonus(cfg.skill, cfg.testType) + (cfg.extraTestBonus||0) + (extraBonus||0);   // 조건부 자산(돋보기) + 무기 보너스(do_fight) + 커밋
  const r = resolveTest(base, cfg.difficulty, cfg.ctx);
  r.committed = committed || [];   // 커밋된 카드 코드(판정후 효과용)
  r.testType = cfg.testType;
  r.location = cfg.location;
  r.difficultyBreak = cfg.difficultyBreak;   // 은폐 감소 표시용(손전등 등)
  cfg.onResolve(r);
}
// 커밋 후처리 조건 통과 여부 (조건 없으면 통과)
function commitCondOK(cond, r){
  if(cond==="investigate_success") return r.success && r.testType==="investigate";
  if(cond==="test_success") return r.success;                 // 모든 판정 성공(배짱·통찰력·제압·손재주)
  return true;
}
// 추론 등 커밋 카드가 성공 시 추가로 "발견"하는 단서 총수(은폐 리다이렉트 합산용 — 실제 수거는 discoverClues가 일괄)
export function committedBonusClues(r){
  let n=0;
  (r.committed||[]).forEach(code=>{
    ((S.cardAbilities[code]||{}).abilities||[]).forEach(ab=>{
      if(ab.timing==="on_commit_resolve" && commitCondOK(ab.condition, r))
        (ab.do||[]).forEach(eff=>{ if(eff.effect==="discover_clue") n += (eff.value||1); });
    });
  });
  return n;
}
// 배짱 등 커밋 카드의 성공 시 드로우(단서와 무관). 팝업 문구 배열 반환.
export function applyCommittedDraws(r){
  const extra=[];
  (r.committed||[]).forEach(code=>{
    ((S.cardAbilities[code]||{}).abilities||[]).forEach(ab=>{
      if(ab.timing!=="on_commit_resolve" || !commitCondOK(ab.condition, r)) return;
      const name=S.byCode[code]?S.byCode[code].name:code;
      (ab.do||[]).forEach(eff=>{
        if(eff.effect==="draw"){ const got=D.drawCards(eff.value||1);   // draw_to:committer(1인=활성 조사자)
          if(got){ addLog(name+": 카드 "+got+"장을 뽑았습니다. (성공)"); extra.push("("+name+") 카드 "+got+"장"); }
          else addLog(name+": 덱이 비어 뽑지 못했습니다."); }
      });
    });
  });
  return extra;
}
