/* =====================================================================
   scenario/hand.js — 손패 렌더 + 드래그 플레이 + 멀리건/시작 딜.
   renderHand은 여러 모드(멀리건·정리·커밋·플레이)를 분기하는 렌더 허브라,
   각 모드의 소유 도메인(정리=upkeep, 커밋=skilltest, 플레이엔진, 툴팁)과의 링크는
   setHandDeps()로 주입한다. 멀리건/시작 딜 상태는 이 모듈이 소유.
   ===================================================================== */
import { S } from "./state.js";
import { cardFront } from "./card-img.js";
import { toStageX, toStageY } from "../shared/stage.js";
import { isCommittable } from "./skilltest.js";
import { updatePiles } from "./piles.js";
import { addLog } from "./log.js";
import { shuffle } from "./util.js";
import { audio } from "../shared/audio.js";

// ── 주입(다른 도메인으로의 링크) — scenario1이 setHandDeps로 채운다 ──
let D = {
  showCardInfo(){}, hideCardInfo(){},           // 툴팁(호버 카드 정보)
  canAct: ()=>true, tryPlayCard(){}, eventReactionPlayable: ()=>false,   // 플레이 엔진
  discardMode: ()=>false, discardOne(){},        // 정비 손패 정리(upkeep)
  commitMode: ()=>false, commitSel: ()=>new Set(), commitSkill: ()=>null, // 커밋(skilltest UI)
  commitLimitReached: ()=>false, toggleCommit(){},
  isWeakness: ()=>false, playOpeningCutscenes(){},  // 약점 판별 / 도입 컷신
};
export function setHandDeps(o){ Object.assign(D, o); }

// ── 멀리건/시작 딜 상태(이 모듈 소유) ──
export let mulliganMode=false;   // 외부 contextmenu 핸들러가 읽음 → live binding export
let mulliganSel=new Set();
let mullRefilling=false;   // 멀리건 확정 후 덱→손패 채우는 연출 중(손패 좌측 정렬 유지)
let setAsideWeaknesses=[]; // 시작 손패 뽑는 동안 빼둔 약점(멀리건 끝나면 도로 셔플)
let mulliganAside=[];      // 멀리건으로 뺀 카드 — 새로 뽑는 동안 덱에서 제외했다가 뽑기 끝난 뒤 도로 셔플
let handDrag=null;

export function renderHand(){
  const area=document.getElementById("hand-area");
  D.hideCardInfo();   // 재렌더 시 정보 잔상 제거
  // 드래그로 stage에 떠 있던 카드 잔재 제거
  document.querySelectorAll("#stage > .hand-card").forEach(el=>el.remove());
  area.innerHTML="";
  const n=S.playerHand.length;
  if(!n) return;
  const areaW=area.clientWidth||784;
  const cardW=182;   // 카드 폭(+30%). CSS .hand-card 와 일치
  const usable=areaW-cardW-16;
  // 4장 이하: 부채꼴 대신 평평·중앙정렬(자리 널널하니 억지로 안 벌림).
  // 5장 이상: 좌측(조사자 옆) 부채꼴, 많을수록 매끄럽게 겹침.
  const fewCards = !mullRefilling && n <= 4;   // 멀리건 채우는 중엔 좌측 부채꼴 유지(중앙정렬 X)
  let step;
  if(n<=1) step = 0;
  else if(fewCards) step = 196;                          // 평평·간격(4장 이하, 안 겹침)
  else step = Math.min(cardW+14, usable/(n-1));          // 부채꼴
  const totalW=(n-1)*step;
  const startX = fewCards ? (areaW-totalW-cardW)/2 : -30;  // 적으면 중앙, 많으면 좌측(조사자 옆)
  const mid=(n-1)/2;
  const maxAngle = fewCards ? 0 : Math.min(22, n*3);       // 적으면 평평(각도 0)
  S.playerHand.forEach((code,i)=>{
    const c=S.byCode[code];
    const off = mid===0 ? 0 : (i-mid)/mid;
    const angle = off * maxAngle;
    const lift = fewCards ? 0 : Math.abs(off)*Math.abs(off)*24;   // 적으면 arc 없음
    const el=document.createElement("div");
    el.className="hand-card";
    el.style.left=(startX+i*step)+"px";
    el.style.bottom=(70-lift)+"px";   // 부채꼴 높이(예전 110에서 40px 낮춤)
    el.style.setProperty("--fan","rotate("+angle+"deg)");
    el.style.transform="rotate("+angle+"deg)";
    el.style.zIndex=i;
    el.dataset.idx=i;
    el.innerHTML='<div class="hc-img"><img src="'+cardFront(code)+'" alt=""></div>';
    if(mulliganMode){
      if(mulliganSel.has(i)) el.classList.add("mull-sel");        // 선택되어 솟은 카드
      el.addEventListener("mouseenter", ()=>D.showCardInfo(el, code));  // 호버 정보는 그대로
      el.addEventListener("mouseleave", D.hideCardInfo);
      el.onclick=(e)=>{   // 좌클릭: 선택 토글(솟음 유지, 재클릭 시 해제)
        e.stopPropagation();
        if(mulliganSel.has(i)){ mulliganSel.delete(i); el.classList.remove("mull-sel"); }
        else{ mulliganSel.add(i); el.classList.add("mull-sel"); }
        updateMullCount();
      };
    }else if(D.discardMode()){   // 정비 4.5 손패 정리 — 클릭한 카드를 버림
      el.addEventListener("mouseenter", ()=>D.showCardInfo(el, code));
      el.addEventListener("mouseleave", D.hideCardInfo);
      el.onclick=()=>D.discardOne(i);
    }else if(D.commitMode()){   // 커밋: 테스트 기호 있는 카드만 선택 가능
      const selected = D.commitSel().has(i);
      // 기호 있음 + (이미 선택했거나 / 매수제한에 안 걸림). 같은 카드 1장 커밋되면 나머지는 비활성.
      const ok = isCommittable(S.byCode[code], D.commitSkill()) && (selected || !D.commitLimitReached(code, i));
      el.classList.add(ok ? "commit-ok" : "commit-no");
      if(ok){ if(selected) el.classList.add("mull-sel"); el.onclick=()=>D.toggleCommit(i); }
      el.addEventListener("mouseenter", ()=>D.showCardInfo(el, code));
      el.addEventListener("mouseleave", D.hideCardInfo);
    }else{
      if(S.afterDefeatWindow && D.eventReactionPlayable(code)) el.classList.add("react-ok");   // 증거! 등 지금 낼 수 있는 반응 이벤트 = 초록 테두리
      el.addEventListener("mousedown", (e)=>startHandDrag(e, i, el));
      el.addEventListener("mouseenter", ()=>D.showCardInfo(el, code));
      el.addEventListener("mouseleave", D.hideCardInfo);
    }
    area.appendChild(el);
  });
}

// 커밋 가능한 손패 인덱스(테스트 기호나 만능 보유)
export function committableHand(skill){ return S.playerHand.map((c,i)=>i).filter(i=> isCommittable(S.byCode[S.playerHand[i]], skill)); }

/* ===== 손패 드래그 — 진짜 들고 가는 느낌 =====
   손패 밖(우측/맵)으로 놓으면 플레이, 손패 안이면 순서 바꾸기, 아니면 되돌아감 */
function startHandDrag(e, idx, el){
  if(e.button!==0) return;
  // 맵 말 조작과 동일한 잠금(canAct) — 컷신·페이즈전환·조사자 단계 아닐 땐 카드 플레이 불가
  if(!D.canAct()) return;
  e.preventDefault();
  el.style.animation="none";
  el.classList.remove("dealing");
  const r=el.getBoundingClientRect();
  // 마우스가 카드 안 어디를 잡았는지(stage 좌표 기준)
  const grabX=toStageX(e.clientX)-toStageX(r.left);
  const grabY=toStageY(e.clientY)-toStageY(r.top);
  handDrag={ idx, el, code:S.playerHand[idx],
    grabX, grabY, startX:e.clientX, startY:e.clientY, moved:false };
  document.body.classList.add("dragging");
  el.classList.add("drag-ghost");
  el.style.transition="none";
  // stage 직속으로 옮겨서 stage 좌표로 배치(부모 hand-area 밖으로)
  const stage=document.getElementById("stage");
  stage.appendChild(el);
  el.style.position="absolute";
  el.style.left=toStageX(r.left)+"px";
  el.style.top=toStageY(r.top)+"px";
  el.style.bottom="auto";
  el.style.transform="rotate(0deg)";
  el.style.zIndex=900;
  window.addEventListener("mousemove", onHandDragMove);
  window.addEventListener("mouseup", onHandDragUp);
}
function onHandDragMove(e){
  if(!handDrag) return;
  const dx=e.clientX-handDrag.startX, dy=e.clientY-handDrag.startY;
  if(Math.abs(dx)>4||Math.abs(dy)>4) handDrag.moved=true;
  handDrag.el.style.left=(toStageX(e.clientX)-handDrag.grabX)+"px";
  handDrag.el.style.top=(toStageY(e.clientY)-handDrag.grabY)+"px";
  handDrag.el.style.transform="rotate(0deg) scale(1.05)";
}
function onHandDragUp(e){
  window.removeEventListener("mousemove", onHandDragMove);
  window.removeEventListener("mouseup", onHandDragUp);
  document.body.classList.remove("dragging");
  D.hideCardInfo();   // 드래그 끝 → 남아있을 수 있는 정보 잔상 제거
  if(!handDrag){ return; }
  const d=handDrag; handDrag=null;
  if(!d.moved){ renderHand(); return; }   // 클릭만 한 경우

  const area=document.getElementById("hand-area");
  const ar=area.getBoundingClientRect();
  const inHand = e.clientY>=ar.top-20 && e.clientX>=ar.left-20 && e.clientX<=ar.right+20 && e.clientY<=ar.bottom+40;

  if(inHand){
    // 손패 안 → 순서 바꾸기(놓은 x 위치로 재삽입)
    reorderHand(d.idx, e.clientX);
  }else{
    // 손패 밖 → 플레이 시도
    D.tryPlayCard(d.idx);
  }
}

// 손패 내 순서 변경 — 놓은 가로 위치 기준으로 몇 번째인지 계산
function reorderHand(fromIdx, dropX){
  const area=document.getElementById("hand-area");
  const ar=area.getBoundingClientRect();
  const n=S.playerHand.length;
  const relX=dropX-ar.left;
  let target=Math.round((relX/ar.width)*n);
  target=Math.max(0, Math.min(n-1, target));
  const [card]=S.playerHand.splice(fromIdx,1);
  S.playerHand.splice(target,0,card);
  renderHand();
}

export function dealOpeningHand(){
  S.playerHand=[]; renderHand(); updatePiles();
  // 시작 손패 뽑기 전, 덱에서 약점을 빼둔다(디지털 방식: 처음부터 제외)
  setAsideWeaknesses = S.playerDeck.filter(D.isWeakness);
  S.playerDeck = S.playerDeck.filter(c=>!D.isWeakness(c));
  let dealt=0;
  const dealOne=()=>{
    if(dealt>=5){ setTimeout(openMulligan, 1200); return; }  // 시작 손패 5장(아컴 기본 규칙)
    if(!S.playerDeck.length){ return; }
    audio.sfx("card-deal");   // 초반 딜 소리
    const code=S.playerDeck.shift();
    S.playerHand.push(code);
    dealt++;
    renderHand(); updatePiles();
    const cards=document.querySelectorAll(".hand-card");
    const last=cards[cards.length-1];
    if(last){
      // 덱 더미 위치 → 손패 슬롯으로 날아오는 FLIP 연출
      const deck=document.getElementById("deck-pile");
      if(deck){
        const dr=deck.getBoundingClientRect(), cr=last.getBoundingClientRect();
        const dx=toStageX(dr.left+dr.width/2)-toStageX(cr.left+cr.width/2);   // stage 좌표 이동량
        const dy=toStageY(dr.top+dr.height/2)-toStageY(cr.top+cr.height/2);
        const finalT=last.style.transform||"";   // 최종 부채꼴 회전
        last.style.transition="none";
        last.style.transform="translate("+dx+"px,"+dy+"px) rotate(0deg) scale(.8)";  // 시작=덱 위
        last.style.opacity="0";
        void last.offsetWidth;   // 강제 reflow
        last.style.transition="transform .45s cubic-bezier(.2,.85,.3,1), opacity .25s";
        last.style.transform=finalT;   // 손패 자리로 날아옴
        last.style.opacity="1";
      }
    }
    setTimeout(dealOne, 240);
  };
  dealOne();
}

function openMulligan(){
  mulliganMode=true; mulliganSel.clear(); renderHand();
  document.getElementById("stage").classList.add("mull-active");   // 손패 외 나머지 딤
  document.getElementById("mull-hint").classList.add("show");      // 안내 패널
  updateMullCount();
}
function updateMullCount(){
  const el=document.getElementById("mh-n");
  if(el) el.textContent = mulliganSel.size;
}

export function doMulligan(){
  document.getElementById("stage").classList.remove("mull-active");  // 딤 해제
  document.getElementById("mull-hint").classList.remove("show");
  const selIdx=[...mulliganSel].sort((a,b)=>b-a);   // 뒤에서부터 제거(인덱스 안 꼬이게)
  // 남길 카드(선택 안 한)들의 현재 화면 위치 기록 — 좌측 슬라이드 FLIP용
  const keptOldRects=[];
  document.querySelectorAll("#hand-area .hand-card").forEach(el=>{
    if(!mulliganSel.has(+el.dataset.idx)) keptOldRects.push(el.getBoundingClientRect());
  });
  const removed=[];
  selIdx.forEach(i=>{ removed.push(S.playerHand[i]); S.playerHand.splice(i,1); });
  mulliganMode=false; mulliganSel.clear();
  if(!removed.length){ renderHand(); finishMulligan(); return; }   // 0장: 그대로 확정

  mullRefilling=true;
  mulliganAside=removed;   // 뺀 카드는 "새로 뽑을 후보"에서 제외 — 뽑기가 끝난 뒤(finishMulligan) 약점과 함께 덱에 셔플
  renderHand(); updatePiles();   // 남은 카드가 좌측 정렬로 재배치

  // ① 남은 카드: 예전 위치 → 새 좌측 위치로 미끄러짐(몰기)
  document.querySelectorAll("#hand-area .hand-card").forEach((el,j)=>{
    const old=keptOldRects[j]; if(!old) return;
    const cur=el.getBoundingClientRect();
    const dx=toStageX(old.left+old.width/2)-toStageX(cur.left+cur.width/2);
    const finalT=el.style.transform||"";
    el.style.transition="none";
    el.style.transform="translateX("+dx+"px) "+finalT;
    void el.offsetWidth;   // 강제 reflow
    el.style.transition="transform .4s cubic-bezier(.2,.85,.3,1)";
    el.style.transform=finalT;
  });

  // ② 슬라이드 끝난 뒤 → 선택 수만큼 덱에서 날아와 채우기
  const drawCount=Math.min(removed.length, S.playerDeck.length);
  let dealt=0;
  const flyOne=()=>{
    if(dealt>=drawCount){
      addLog("멀리건: "+removed.length+"장을 교체했습니다.");
      mullRefilling=false; renderHand(); finishMulligan(); return;
    }
    audio.sfx("card-deal");   // 멀리건 교체 카드 뽑는 소리
    S.playerHand.push(S.playerDeck.shift());
    dealt++;
    renderHand(); updatePiles();
    const cards=document.querySelectorAll("#hand-area .hand-card");
    const last=cards[cards.length-1];
    if(last){
      const deck=document.getElementById("deck-pile");
      if(deck){
        const dr=deck.getBoundingClientRect(), cr=last.getBoundingClientRect();
        const dx=toStageX(dr.left+dr.width/2)-toStageX(cr.left+cr.width/2);
        const dy=toStageY(dr.top+dr.height/2)-toStageY(cr.top+cr.height/2);
        const finalT=last.style.transform||"";
        last.style.transition="none";
        last.style.transform="translate("+dx+"px,"+dy+"px) rotate(0deg) scale(.8)";
        last.style.opacity="0";
        void last.offsetWidth;
        last.style.transition="transform .45s cubic-bezier(.2,.85,.3,1), opacity .25s";
        last.style.transform=finalT;
        last.style.opacity="1";
      }
    }
    setTimeout(flyOne, 240);
  };
  setTimeout(flyOne, 430);   // 남은 카드 슬라이드(.4s) 끝난 뒤 채우기 시작
}

function finishMulligan(){
  // 멀리건 확정 → 교체로 뺀 카드 + 빼뒀던 약점을 덱에 도로 넣고 한 번에 섞는다(뽑기가 끝난 뒤라 다시 안 뽑힘)
  const back = mulliganAside.concat(setAsideWeaknesses);
  if(back.length){
    back.forEach(c=>S.playerDeck.push(c));
    shuffle(S.playerDeck);
    if(mulliganAside.length) addLog("교체한 "+mulliganAside.length+"장을 덱에 도로 섞었습니다.");
    if(setAsideWeaknesses.length) addLog("약점 "+setAsideWeaknesses.length+"장을 덱에 섞었습니다.");
    mulliganAside=[]; setAsideWeaknesses=[];
  }
  updatePiles();
  addLog("시작 손패가 준비되었습니다. ("+S.playerHand.length+"장)");
  S.phaseBusy = true;         // 도입 컷신(agenda1a→act1a) 끝나 조사자 단계 시작 전까지 조작 잠금
  D.playOpeningCutscenes();   // 멀리건 끝 → 도입 컷신(agenda1a → act1a)
}
