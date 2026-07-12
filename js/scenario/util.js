/* =====================================================================
   scenario/util.js — 시나리오 공용 소도구(순수 함수).
   ===================================================================== */

// 배열 제자리 셔플(Fisher–Yates). 덱·조우덱·멀리건 등에서 공용.
export function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}
