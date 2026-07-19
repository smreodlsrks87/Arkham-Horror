/* =====================================================================
   scenario/popup.js — 공용 팝업(택1·강제택1·정보)과 토스트(짧은 쪽지) + 카드 고르기 팝업.
   대부분 순수 UI(DOM만). 카드 고르기(showCardPickPopup)만 카드 그림·호버툴팁이 필요해
   card-img·tooltip을 쓴다(그 둘은 popup을 import하지 않아 순환 없음).
   ※ 우클릭 취소 판단에 쓰는 popupForced·popupCancelAct는 scenario1의 전역
     contextmenu 핸들러가 읽으므로 live-binding으로 export한다.
   ===================================================================== */
import { S } from "./state.js";
import { cardFront } from "./card-img.js";
import { showCardInfo, hideCardInfo } from "./tooltip.js";

const popup=document.getElementById("popup");
export let popupCancelAct=null;   // 우클릭 시 실행할 동작(없으면 그냥 닫기)
export let popupForced=false;     // 강제 팝업(우클릭으로도 못 닫음 — 반드시 버튼 택1)

export function popupOpen(){ return document.getElementById("popup").style.display!=="none"; }

export function showPopup(msgHtml, buttons, onCancel, boxClass){
  const box=document.querySelector("#popup .popup-box");
  if(box) box.className = "popup-box" + (boxClass ? " "+boxClass : "");   // 판정 등 특수 팝업 스타일
  document.getElementById("popup-msg").innerHTML=msgHtml;
  const bb=document.getElementById("popup-btns"); bb.innerHTML="";
  buttons.forEach(b=>{
    const el=document.createElement("button");
    el.textContent=b.label; if(b.primary) el.className="primary";
    el.onclick=b.act; bb.appendChild(el);
  });
  popupCancelAct = onCancel || null;
  popupForced = false;
  popup.style.display="flex";
}
// 강제 택1 팝업(우클릭·취소 불가). buttons는 전부 활성색으로 표시.
export function showForcedPopup(msgHtml, buttons, boxClass){
  showPopup(msgHtml, buttons.map(b=>({...b, primary:true})), null, (boxClass?boxClass+" ":"")+"vpop");
  popupForced = true;
}
export function hidePopup(){ popup.style.display="none"; popupCancelAct=null; popupForced=false; }

// 짧은 쪽지(토스트) — 자동 페이즈를 막지 않는 안내(행동력 부족 등)
let toastTimer=null;
export function showToast(msg){
  let t=document.getElementById("toast");
  if(!t){ t=document.createElement("div"); t.id="toast"; document.getElementById("stage").appendChild(t); }
  t.textContent=msg; t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"), 1800);
}

/* 카드 고르기 — 일러스트를 늘어놓고 하나 고르게 한다(호버하면 카드 텍스트 툴팁).
   같은 코드가 여럿일 수 있어(쥐 떼×2) onPick에 인덱스도 넘긴다. */
export function showCardPickPopup(title, codes, onPick, opts){
  opts = opts || {};
  const grid = codes.map((c,i)=>'<div class="cpick" data-code="'+c+'" data-i="'+i+'"><img src="'+cardFront(c)+'" alt=""><span>'+((S.byCode[c]||{}).name||c)+'</span></div>').join("");
  const html = '<div class="cpick-title">'+title+'</div><div class="cpick-row">'+grid+'</div>';
  const cancel = opts.cancelable ? ()=>{ hidePopup(); if(opts.onCancel) opts.onCancel(); } : null;
  showPopup(html, cancel ? [{label:"취소", act:cancel}] : [], cancel, "cpick-pop");
  document.querySelectorAll("#popup-msg .cpick").forEach(el=>{
    el.onclick = ()=>{ hideCardInfo(); hidePopup(); onPick(el.dataset.code, +el.dataset.i); };
    el.addEventListener("mouseenter", ()=> showCardInfo(el, el.dataset.code));
    el.addEventListener("mouseleave", hideCardInfo);
  });
}
