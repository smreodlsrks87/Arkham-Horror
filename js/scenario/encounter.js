/* =====================================================================
   scenario/encounter.js — 조우덱 구성 + 더미/버린더미 UI.
   S(encounterDeck/Discard/byCode)만 읽어 조우 UI를 그린다.
   ※ 조우 뽑기·공개·해결(적 소환·폭로효과·판정)은 scenario1에 남는다(적/치레커리 결합).
   조우덱 세트(어느 조우 세트로 덱을 구성하나)는 시나리오가 setEncounterSets로 주입.
   ===================================================================== */
import { S } from "./state.js";
import { cardFront, cardTextOf, CARD_IMG_BASE } from "./card-img.js";
import { cleanText } from "../shared/card-text.js";
import { shuffle } from "./util.js";

// ── 주입(시나리오별 조우 세트 구성) ──
let ENC_SETS = [], ENC_ASIDE = new Set();
export function setEncounterSets(sets, aside){ ENC_SETS = sets || []; ENC_ASIDE = aside || new Set(); }

// 조우덱 구성: 지정 세트의 core 적·음모 카드(따로 빼둔 것 제외)를 수량만큼 담아 섞는다.
export function buildEncounterDeck(){
  const deck=[];
  Object.keys(S.byCode).forEach(function(code){
    const c=S.byCode[code];
    if(c.pack_code!=="core" || !ENC_SETS.includes(c.encounter_code)) return;
    if(c.type_code!=="enemy" && c.type_code!=="treachery") return;   // 조우덱=적+음모(장소·막·의제 제외)
    if(ENC_ASIDE.has(code)) return;
    for(let i=0;i<(c.quantity||1);i++) deck.push({ code:code, name:c.name, imagesrc:c.imagesrc });
  });
  shuffle(deck);
  return deck;
}

export function updateEncounterUI(){
  document.getElementById("enc-draw-num").textContent = S.encounterDeck.length;
  document.getElementById("enc-discard-num").textContent = S.encounterDiscard.length;
  // 0장이면 겹침(쌓임) 숨김
  document.getElementById("enc-draw").classList.toggle("empty", S.encounterDeck.length<=1);
  document.getElementById("enc-discard").classList.toggle("empty", S.encounterDiscard.length<=1);

  // 버린 더미 맨 위 = 가장 최근 버린 조우(앞면)
  const topCard = S.encounterDiscard[S.encounterDiscard.length-1];
  const dimg = document.getElementById("enc-discard-img");
  const dface = document.getElementById("enc-discard-face");
  if(topCard && topCard.imagesrc){
    dimg.src = CARD_IMG_BASE + topCard.imagesrc; dimg.style.display="block"; dface.style.display="none";
  }else if(topCard){
    dface.textContent = topCard.name||"조우"; dface.style.display="flex"; dimg.style.display="none";
  }else{
    dface.textContent = "—"; dface.style.display="flex"; dimg.style.display="none";
  }

  // 호버 목록 — 조우덱은 순서 숨기려 이름별 수량으로 정렬 / 버린 더미는 내역 + 맨 위 카드 정보(2단)
  renderEncList("enc-draw-list", S.encounterDeck, "조우덱 구성");
  renderEncDiscardList();
}
// 버린 조우 더미 호버 — 한쪽 내역, 한쪽 맨 위 카드 정보(이미지+번역). 플레이어 버린더미와 같은 방식.
function renderEncDiscardList(){
  const box=document.getElementById("enc-discard-list"); if(!box) return;
  const arr=S.encounterDiscard, top=arr[arr.length-1];
  const counts={}; arr.forEach(c=>{ const nm=c.name||"조우"; counts[nm]=(counts[nm]||0)+1; });
  const names=Object.keys(counts).sort();
  let list='<div class="el-title">버린 더미 ('+arr.length+')</div>';
  if(!names.length) list+='<div class="el-empty">없음</div>';
  else names.forEach(nm=>{ list+='<div class="el-row"><span>'+nm+'</span><span class="el-q">× '+counts[nm]+'</span></div>'; });
  let info;
  if(top){
    info='<div class="eld-info"><div class="eld-cap">맨 위 카드</div>'+
      '<img class="eld-img" src="'+cardFront(top.code)+'" alt="">'+
      '<div class="eld-nm">'+((S.byCode[top.code]||{}).name || top.name || top.code)+'</div>'+
      (cardTextOf(top.code)?'<div class="eld-txt">'+cleanText(cardTextOf(top.code))+'</div>':'')+'</div>';
  }else{
    info='<div class="eld-info eld-none">비어 있음</div>';
  }
  box.innerHTML='<div class="eld-two"><div class="eld-list">'+list+'</div>'+info+'</div>';
}
function renderEncList(id, arr, title){
  const box=document.getElementById(id);
  const counts={};
  arr.forEach(c=>{ const nm=c.name||"조우"; counts[nm]=(counts[nm]||0)+1; });
  const names=Object.keys(counts).sort();   // 이름순 정렬(순서 노출 방지)
  let html='<div class="el-title">'+title+' ('+arr.length+')</div>';
  if(!names.length){ html+='<div class="el-empty">없음</div>'; }
  else names.forEach(nm=>{
    html+='<div class="el-row"><span>'+nm+'</span><span class="el-q">× '+counts[nm]+'</span></div>';
  });
  box.innerHTML=html;
}
