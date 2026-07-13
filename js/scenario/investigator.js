/* =====================================================================
   scenario/investigator.js — 세로형 조사자 카드 렌더 + 행동력(AP) 표시.
   S(invCard·능력치·피해/공포/트라우마·자원/단서·행동력)를 읽어 화면을 그린다.
   표식(elder sign) 값은 호버 순간 계산하는데, 그때 필요한 현재 단서수·무력화 여부는
   각각 clues·enemy 도메인 함수라 setInvDeps로 주입한다.
   ===================================================================== */
import { S } from "./state.js";
import { cleanText } from "../shared/card-text.js";
import { elderSignValue } from "./tokens.js";

// ── 주입(다른 도메인 링크) ──
let D = { cluesInRoom: ()=>[], investigatorBlanked: ()=>false };
export function setInvDeps(o){ Object.assign(D, o); }

// 세로형 조사자 카드 설정(편집기 확정 값)
const INV_CROP = {
  cardW:216, cutRight:47.81,
  abX:50, abY:50, abW:98.5,
  statY:80, wX:14, iX:35.5, cX:57.5, aX:79,
  statFs:22, statBg:"#eee6cd", padV:1,
  hX:35, hY:93.5, snX:66, snY:93.5, hsFs:23
};

export function renderInvestigator(){
  if(!S.invCard) return;
  const EN="https://arkhamdb.com";
  const card=document.getElementById("inv-card");
  const illus=document.getElementById("inv2-illus");
  const ability=document.getElementById("inv2-ability");
  const overlay=document.getElementById("inv2-overlay");
  const info=document.getElementById("inv-info");
  const cf=INV_CROP;

  card.style.width=cf.cardW+"px";

  // 능력치·체력/정신 값(상시 보너스·피해·공포·트라우마 반영)
  const baseH=S.invCard.health||0, baseS=S.invCard.sanity||0;
  const maxH=Math.max(0,baseH-S.invHTrauma), maxS=Math.max(0,baseS-S.invSTrauma);
  const curH=Math.max(0,maxH-S.invDamage), curS=Math.max(0,maxS-S.invHorror);
  const w=(S.invCard.skill_willpower||0)+S.statBonus.willpower, ii=(S.invCard.skill_intellect||0)+S.statBonus.intellect,
        c=(S.invCard.skill_combat||0)+S.statBonus.combat, a=(S.invCard.skill_agility||0)+S.statBonus.agility;

  // 일러스트: 원본 640×450을 CSS로 크롭(우측 cutRight% 잘라내기)
  const keep=(100-cf.cutRight)/100 || 0.01;                 // 남긴 가로 비율
  const url = S.invCard.imagesrc ? EN+S.invCard.imagesrc : "";
  illus.style.height=(cf.cardW * (450/(640*keep)))+"px";     // 세로형 높이
  illus.style.backgroundImage= url ? "url('"+url+"')" : "none";
  illus.style.backgroundSize=(100/keep)+"% 100%";            // 가로만 확대, 세로 100%
  illus.style.backgroundPosition="left top";                 // 왼쪽 정렬 → 우측 잘림

  // 능력치 칸 이미지(ability.png)
  ability.style.left=cf.abX+"%"; ability.style.top=cf.abY+"%";
  ability.style.width=(cf.cardW*cf.abW/100)+"px";

  // 능력치 숫자(칸 색 배경으로 기존 숫자 가림) + 체력/정신 박스
  const stat=(x,val)=>'<div class="badge stat" style="left:'+x+'%;top:'+cf.statY+'%;'+
    'font-size:'+cf.statFs+'px;background:'+cf.statBg+';padding:'+cf.padV+'px 0;">'+val+'</div>';
  overlay.innerHTML =
    stat(cf.wX,w)+stat(cf.iX,ii)+stat(cf.cX,c)+stat(cf.aX,a)+
    '<div class="badge hp"  style="left:'+cf.hX+'%;top:'+cf.hY+'%;font-size:'+cf.hsFs+'px;">'+curH+'/'+maxH+'</div>'+
    '<div class="badge san" style="left:'+cf.snX+'%;top:'+cf.snY+'%;font-size:'+cf.hsFs+'px;">'+curS+'/'+maxS+'</div>';

  // 한글 정보(마우스오버)
  info.innerHTML =
    '<h4>'+(S.invCard.name||"조사자")+'</h4>'+
    '<div class="sub">'+[S.invCard.subname,S.invCard.faction_name].filter(Boolean).join(" · ")+'</div>'+
    (S.invCard.text? '<div class="txt">'+cleanText(S.invCard.text)+'</div>':"")+
    '<div class="inv-es" style="margin-top:9px;border-top:1px solid #2a2238;padding-top:9px;font-size:19px;">'+
      '<span style="font-family:\'ArkhamIcons\',serif;color:#6ab0e0;font-size:24px;vertical-align:-4px;">x</span>'+
      ' = <span id="inv-es-val" style="color:#6ab0e0;font-weight:700;">–</span></div>';
  // 표식(elder sign) 값은 호버 순간 계산(pull) — 현재 위치·단서로 그 자리서 산출
  if(card) card.onmouseenter = ()=>{
    const el=document.getElementById("inv-es-val");
    if(el && S.activeInvestigator){
      const ctx={ charCode:S.activeInvestigator.investigator, myLocation:S.cur, cluesAt:(room)=>D.cluesInRoom(room).length, blanked:D.investigatorBlanked() };
      const v=elderSignValue(S.activeInvestigator.investigator, ctx);
      el.textContent=(v>=0?"+":"")+v;
    }
  };
  document.getElementById("st-resource").textContent=S.invResource;
  document.getElementById("st-clue").textContent=S.invClue;
}

export function updateAP(){
  document.getElementById("ap-n").textContent = S.actionPoints;
  document.getElementById("ap").classList.toggle("empty", S.actionPoints<=0);
}
