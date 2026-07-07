/* =====================================================================
   scenario/skilltest.js — 능력치 테스트 엔진(순수 계산 + 규칙)
   모든 판정(조사·전투·회피·교섭·조우)이 공유하는 파이프라인의 "엔진".
   흐름(구동·UI는 scenario1): 선언 → 커밋 윈도우 → 토큰 공개 → 합계 → 성공/실패.

   커밋: 손패 카드를 소비하면 그 카드 좌상단의 "테스트 능력치와 같은 기호" 수만큼 +.
         만능(?)=skill_wild 은 지금 테스트하는 능력치로 계산.
   ===================================================================== */
import { drawChaosToken, resolveToken } from "./tokens.js";

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
