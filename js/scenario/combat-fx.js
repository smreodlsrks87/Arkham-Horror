/* =====================================================================
   scenario/combat-fx.js — 전투 피드백용 공용 DOM 이펙트(도메인 결합 없음).
   요소 위로 뜨는 텍스트(피해 숫자·명중/빗나감 도장)와 붉은 피격 플래시.
   적 피해(enemy.js)와 조사자 피해(takeDamageHorror)가 함께 쓴다.
   ===================================================================== */

// 요소 위로 떠오르는 텍스트(피해 숫자·명중/빗나감 도장). dx/dy=요소 폭·높이 대비 위치(기본 0.5/0.32)
export function floatTextAt(el, text, cls, dx, dy){
  if(!el) return;
  const r = el.getBoundingClientRect(); if(!r.width && !r.height) return;
  const d = document.createElement("div"); d.className="float-txt "+(cls||"");
  d.textContent = text; d.style.left=(r.left+r.width*(dx!=null?dx:0.5))+"px"; d.style.top=(r.top+r.height*(dy!=null?dy:0.32))+"px";
  document.body.appendChild(d); setTimeout(()=>d.remove(), 1300);
}
// 붉은 피격 플래시(클래스 재적용으로 애니메이션 리트리거)
export function hitFlash(el){ if(!el) return; el.classList.remove("hit-fx"); void el.offsetWidth; el.classList.add("hit-fx"); }
