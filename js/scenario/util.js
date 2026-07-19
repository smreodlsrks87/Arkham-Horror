/* =====================================================================
   scenario/util.js — 시나리오 공용 소도구(순수 함수).
   ===================================================================== */

// 능력치 한글명 — 판정·결과 표시에서 여러 모듈이 함께 쓰는 상수 표.
export const SKILL_KO = { willpower:"의지", intellect:"지식", combat:"전투", agility:"민첩" };

// 배열 제자리 셔플(Fisher–Yates). 덱·조우덱·멀리건 등에서 공용.
export function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
