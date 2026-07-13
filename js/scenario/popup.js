/* =====================================================================
   scenario/popup.js — 공용 팝업(택1·강제택1·정보)과 토스트(짧은 쪽지).
   순수 UI(DOM만) — 다른 도메인 의존 없음. 여러 화면 로직이 호출한다.
   ※ 우클릭 취소 판단에 쓰는 popupForced·popupCancelAct는 scenario1의 전역
     contextmenu 핸들러가 읽으므로 live-binding으로 export한다.
   ===================================================================== */
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
