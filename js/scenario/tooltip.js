/* =====================================================================
   scenario/tooltip.js — 카드 호버 정보(번역 툴팁) + 카드 확대 보기.
   S로 카드 데이터를 읽어 카드 위/옆에 한글 정보를 띄우고, 확대뷰를 연다.
   의존이 전부 공용 모듈(state·card-img·card-text·stage)이라 주입이 필요 없다.
   ※ 확대뷰를 여닫는 트리거(우클릭·키·클릭 핸들러)는 다른 관심사와 섞여 scenario1에 남고,
     여기 openCardZoom/closeCardZoom을 호출하며 zoomOpen(live export)을 읽는다.
   ===================================================================== */
import { S } from "./state.js";
import { cardFront } from "./card-img.js";
import { cardTextOf } from "./card-img.js";
import { cleanText } from "../shared/card-text.js";
import { toStageX, toStageY, stageScale } from "../shared/stage.js";

// 공용 카드 정보 — 카드 위(stage 좌표)에 정방향. side="left"면 카드 왼쪽에.
// 표시용 카드 텍스트 — notz의 text_ko(직접 번역)가 있으면 그걸, 없으면 cards.json text.
// cards.json은 수정 금지라, 영문뿐인 조우 카드는 notz_encounter_cards.json의 text_ko로 한글 출력.
export function showCardInfo(el, code, side){
  const c=S.byCode[code]; const info=document.getElementById("card-info");
  if(!c){ return; }
  const isEnemy = c.type_code==="enemy";
  const imgLine = isEnemy ? '<img class="hi-img" src="'+cardFront(code)+'" alt="">' : "";   // 적은 카드 크게(능력치 인쇄됨)
  const costLine = (c.cost!=null && c.cost>=0) ? '<div class="hi-cost">비용: '+c.cost+'</div>' : "";
  const statLine = isEnemy ? '<div class="hi-stat">체력 '+c.health+' · 전투 '+c.enemy_fight+' · 회피 '+c.enemy_evade+' · 피해 '+(c.enemy_damage||0)+' · 공포 '+(c.enemy_horror||0)+'</div>' : "";
  const txt = cardTextOf(code);
  info.innerHTML=imgLine+'<h5>'+(c.name||"")+'</h5>'+costLine+
    '<div class="hi-sub">'+[c.type_name,c.faction_name].filter(Boolean).join(" · ")+'</div>'+statLine+
    (txt?'<div class="hi-txt">'+cleanText(txt)+'</div>':"");
  info.classList.add("show");
  const r=el.getBoundingClientRect();
  const iw=360, ih=info.offsetHeight||180;
  const cardLeft=toStageX(r.left), cardTop=toStageY(r.top);
  const cardW=r.width/stageScale, cardH=r.height/stageScale;
  let left, topPos;
  if(side==="left"){
    left=cardLeft-iw-12;                    // 카드 왼쪽
    if(left<6) left=cardLeft+cardW+12;      // 왼쪽 공간 없으면 오른쪽
    topPos=cardTop;
    topPos=Math.max(6, Math.min(topPos, 1080-ih-6));
  }else{
    left=cardLeft+cardW/2-iw/2;
    left=Math.max(6, Math.min(left, 1920-iw-6));
    topPos=cardTop-ih-12;
    if(topPos<6) topPos=cardTop+cardH+12;
  }
  info.style.left=left+"px";
  info.style.top=topPos+"px";
}
export function hideCardInfo(){ document.getElementById("card-info").classList.remove("show"); }

/* ===== 카드 확대 보기 — 커서 위 카드 우클릭 → 화면 중앙 대형 + 한글정보(텍스트박스 자리). 아무 키/클릭이면 닫기 ===== */
export let zoomOpen=false;   // 확대뷰 열림 여부 — scenario1의 우클릭/키/클릭 핸들러가 읽음(live export)
export function openCardZoom(code){
  const c=S.byCode[code]; if(!c) return;
  document.getElementById("cz-img").src=cardFront(code);
  const meta=[c.type_name, c.faction_name, (c.cost!=null&&c.cost>=0?"비용 "+c.cost:null)].filter(Boolean).join(" · ");
  document.getElementById("cz-info").innerHTML=
    '<h3>'+(c.name||"")+'</h3>'+
    '<div class="cz-sub">'+meta+'</div>'+
    (c.traits?'<div class="cz-sub">'+c.traits+'</div>':"")+
    (cardTextOf(code)?'<div class="cz-txt">'+cleanText(cardTextOf(code))+'</div>':"");
  document.getElementById("card-zoom").classList.add("show");
  hideCardInfo(); zoomOpen=true;
}
export function closeCardZoom(){ document.getElementById("card-zoom").classList.remove("show"); zoomOpen=false; }
