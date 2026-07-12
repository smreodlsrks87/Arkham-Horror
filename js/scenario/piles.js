/* =====================================================================
   scenario/piles.js — 카드더미·버린더미 시각화.
   S(playerDeck/Discard/byCode)만 읽어 DOM(겹 레이어·개수·구성 목록)을 그린다.
   공개: updatePiles(). renderPileStack/renderPileList는 내부용.
   ===================================================================== */
import { S } from "./state.js";
import { cardFront, PLAYER_BACK } from "./card-img.js";

// 더미 두께 겹 레이어 — 카드 수에 따라 층을 쌓아 두께감을 준다.
function renderPileStack(stackId, count, topImgId){
  const stack=document.getElementById(stackId);
  if(!stack) return;
  stack.innerHTML="";
  const layers = count<=1 ? 0 : Math.min(6, Math.floor(count/3)+1);
  const step=3;
  const shift=layers*step;
  // 겹 레이어: 맨윗장(-shift)부터 원래자리(0)까지 연결되게 배치
  for(let i=1;i<=layers;i++){
    const d=document.createElement("div");
    d.className="layer";
    const p=-shift + i*step;   // i=1: 맨윗장 바로 밑, i=layers: 원래자리(0)
    d.style.top=p+"px"; d.style.left=p+"px";
    d.style.zIndex=-i;
    stack.appendChild(d);
  }
  // 맨 윗장을 두께만큼 좌상단으로 올림(맨아랫장이 원래 자리)
  if(topImgId){
    const img=document.getElementById(topImgId);
    if(img) img.style.transform = layers>0 ? "translate(-"+shift+"px,-"+shift+"px)" : "none";
  }
}

export function updatePiles(){
  document.getElementById("deck-cnt").textContent = S.playerDeck.length;
  document.getElementById("deck-top").src = PLAYER_BACK;
  renderPileStack("deck-stack", S.playerDeck.length, "deck-top");
  // 버린 더미: 맨 위 = 가장 최근 버린 카드 앞면
  const dTop=document.getElementById("discard-top"), dEmpty=document.getElementById("discard-empty"), dCnt=document.getElementById("discard-cnt");
  if(S.playerDiscard.length){
    dEmpty.style.display="none"; dTop.style.display="block"; dCnt.style.display="block";
    dTop.src = cardFront(S.playerDiscard[S.playerDiscard.length-1]);
    dCnt.textContent = S.playerDiscard.length;
  }else{
    dEmpty.style.display="flex"; dTop.style.display="none"; dCnt.style.display="none";
  }
  renderPileStack("discard-stack", S.playerDiscard.length, "discard-top");
  renderPileList("deck-list", S.playerDeck, "카드더미 구성");
  renderPileList("discard-list", S.playerDiscard, "버린 더미");
}

// 더미 카드 목록(OO × N)만 — 우측에 표시
function renderPileList(id, arr, title){
  const box=document.getElementById(id); if(!box) return;
  const counts={};
  arr.forEach(code=>{ const nm=(S.byCode[code]?S.byCode[code].name:code)||code; counts[nm]=(counts[nm]||0)+1; });
  const names=Object.keys(counts).sort();
  let html='<div class="pl-title">'+title+' ('+arr.length+')</div>';
  if(!names.length) html+='<div class="pl-empty">비어 있음</div>';
  else names.forEach(nm=>{ html+='<div class="pl-row"><span>'+nm+'</span><span class="pl-q">× '+counts[nm]+'</span></div>'; });
  box.innerHTML=html;
}
