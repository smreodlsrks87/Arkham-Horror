/* =====================================================================
   scenario/abilities.js — 카드 능력 실행 엔진
   데이터(notz의 abilities) + 처리기 하나. 카드별 함수 남발 대신 "효과 타입"으로 분기.

   [단계 1] 플레이 시 상시(constant) 능력을 능력치 보너스(S.statBonus)에 반영/해제.
   [다음]  발동형(action/fast/reaction) 발동 UI + 효과 실행(치유·전투·피해…),
           uses(탄약·보급) 소비, 판정 보너스 커밋. (전투·적 의존 효과는 적 시스템 후)
   ===================================================================== */
import { S } from "./state.js";

// notz에 정의된 이 카드의 ability 배열(없으면 [])
function abilitiesOf(code){
  const a = S.cardAbilities[code];
  return (a && a.abilities) ? a.abilities : [];
}

// 항상 적용되는 상시(조건 없음 or 장착중). while_investigating 같은 조건부는 테스트가 따로 계산.
const ALWAYS_COND = new Set([undefined, null, "is_equipped"]);
// 상시(constant) 능력치 보너스(항상 적용분만) → [{k:'combat', v:1}, ...]
function constantStatBonuses(code){
  const out = [];
  abilitiesOf(code).forEach(ab=>{
    if(ab.timing==="constant" && ab.effect && ab.effect.bonus && ALWAYS_COND.has(ab.effect.condition)){
      for(const k in ab.effect.bonus){ if(k in S.statBonus) out.push({ k, v: ab.effect.bonus[k] }); }
    }
  });
  return out;
}
// 이 테스트(skill, testType)에만 적용되는 조건부 상시 보너스 합(예: 돋보기 = 조사 중 +1 지식)
export function conditionalTestBonus(skill, testType){
  let sum = 0;
  S.playedCards.forEach(p=>{
    const code = p.code || p;
    abilitiesOf(code).forEach(ab=>{
      if(ab.timing==="constant" && ab.effect && ab.effect.bonus && ab.effect.bonus[skill] && !ALWAYS_COND.has(ab.effect.condition)){
        if(condMatches(ab.effect.condition, testType)) sum += ab.effect.bonus[skill];
      }
    });
  });
  return sum;
}
function condMatches(cond, testType){
  if(cond==="while_investigating") return testType==="investigate";
  return false;   // 새 조건은 여기 추가
}
// 신속(Fast) 키워드 — 행동 소비 없이 플레이(능력 timing:fast 와 별개)
export function isFastPlay(code){ return (S.cardAbilities[code]||{}).fast === true; }

// 카드가 플레이영역에 들어옴 → 상시 보너스 적용
export function onEnterPlay(code){
  constantStatBonuses(code).forEach(({k,v})=> S.statBonus[k] += v);
}
// 카드가 플레이영역을 떠남(버림·파괴) → 상시 보너스 해제
export function onLeavePlay(code){
  constantStatBonuses(code).forEach(({k,v})=> S.statBonus[k] -= v);
}

// 카드의 uses(탄약·보급 등) 초기 상태 — 없으면 null
export function initialUses(code){
  const a = S.cardAbilities[code];
  return (a && a.uses) ? { type:a.uses.type, count:a.uses.count, discardIfEmpty:!!a.uses.discard_if_empty } : null;
}

// 발동 가능한 능력(action/fast) 목록 → [{i, ab}] (reaction/constant 제외 — 발동 UI가 사용)
export function activatable(code){
  return abilitiesOf(code).map((ab,i)=>({ i, ab })).filter(x=> x.ab.timing==="action" || x.ab.timing==="fast");
}
