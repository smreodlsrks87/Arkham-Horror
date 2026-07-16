/* =====================================================================
   scenario/clues.js — 단서 배열 + 조사 판정 로직.
   clueMeshes(3D 마커는 map3d가 생성·애니메이트, 여기선 배열 데이터로 소유)·조사 성공 시
   단서 발견/은폐 리다이렉트/결과 팝업. 순수 로직(THREE 직접 접근 없음).
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";
import { showPopup, hidePopup } from "./popup.js";
import { renderPlayArea } from "./play.js";
import { committedBonusClues, applyCommittedDraws, testResultHtml } from "./skilltest.js";
import { maybeShowAdvanceTip } from "./act.js";
import { updateLocInfo } from "./map3d.js";   // 장소 정보 갱신(map3d)

// 주입(scenario1 인라인: 단서변경·방데이터·부착버림·반응·조사자피해).
let D = {
  changeClue(){}, ROOMS:{}, discardAttachedOnInvestigate(){},
  firePlayedReactions(w,cb){ if(cb) cb(); }, applyToInvestigator(){},
};
export function setCluesDeps(o){ Object.assign(D, o); }

export function nearestClueTo(pos, list){
  let best=list[0], bd=Infinity;
  list.forEach(c=>{ const dx=c.mesh.position.x-pos.x, dz=c.mesh.position.z-pos.z, d=dx*dx+dz*dz; if(d<bd){ bd=d; best=c; } });
  return best;
}

export const clueMeshes = [];   // {mesh, room}

export function cluesInRoom(key){ return clueMeshes.filter(c=>c.room===key && !c.collected); }

export function coverUpRedirect(){
  return S.playedCards.find(p=>{
    if(!p.uses || p.uses.count<=0) return false;
    return ((S.cardAbilities[p.code]||{}).abilities||[]).some(ab=> ab.timing==="reaction" && ab.when==="you_would_discover_clue");
  }) || null;
}

export function gainRoomClues(n, roomKey, prefer){
  let g=0; let list=cluesInRoom(roomKey);
  if(prefer && !prefer.collected && list.includes(prefer)) list=[prefer].concat(list.filter(m=>m!==prefer));   // 클릭한 단서 먼저 수거
  for(let i=0;i<n && i<list.length;i++){ list[i].mesh.visible=false; list[i].collected=true; g++; }
  if(g){ D.changeClue(g); addLog(D.ROOMS[roomKey].name+"에서 단서 "+g+"개 획득 (현재 "+S.invClue+"개)."); updateLocInfo(); }
  return g;
}

export function discoverClues(n, roomKey, done, prefer){
  done = done || function(){};
  const cover = (roomKey===S.cur && n>0) ? coverUpRedirect() : null;   // 내 위치에서만 가로챔
  if(!cover){ done(gainRoomClues(n, roomKey, prefer), 0); return; }
  const cn = S.byCode[cover.code] ? S.byCode[cover.code].name : cover.code;
  const maxR = Math.min(n, cover.uses.count);   // 은폐서 버릴 수 있는 실제 수(잔량 상한)
  const takeClues = ()=>{ hidePopup(); done(gainRoomClues(n, roomKey, prefer), 0); };   // 아니오 = 평소대로 단서 획득
  showPopup(cn+': 단서 <b>'+n+'개</b> 발견을 <span class="hl">대신</span>해 은폐서 '+maxR+'개를 버리시겠습니까?<br>(선택 시 <b>단서 획득 0</b> · 맵 단서는 모두 유지 · 은폐 남은 '+cover.uses.count+'개)', [
    {label:"아니오(단서 "+n+"개 획득)", act:takeClues},
    {label:"예(은폐서 "+maxR+"개 버림)", primary:true, act:()=>{ hidePopup();
      cover.uses.count -= maxR; renderPlayArea();
      addLog(cn+": 단서 "+n+"개 발견을 대신해 은폐서 "+maxR+"개 버림 (남은 "+cover.uses.count+"). 맵 단서 유지, 획득 0.");
      done(0, maxR);   // 발견 전체가 대체됨 — 초과분도 획득 X(맵에 그대로 남음)
    }},
  ],
  // 우클릭 = "아니오(단서 획득)". 취소 콜백을 안 넘기면 window 핸들러가 팝업만 닫아 done이 안 불리고,
  // 단서도 못 얻고 은폐도 안 줄며 조사 결과 팝업도 없이 행동만 증발한다.
  // setTimeout: 같은 우클릭이 뒤이어 뜨는 결과 팝업을 닫는 것 방지(판정 커밋 팝업과 동일 패턴).
  ()=>{ hidePopup(); setTimeout(takeClues, 0); });
}

export function resolveInvestigateSuccess(r, base, boxCls, cm){
  D.discardAttachedOnInvestigate(S.cur);   // 자욱한 안개 등 "조사 성공 시 버림" — 은폐 성공 시점(단서 유무 무관)
  const present = cluesInRoom(S.cur).length;
  const entitled = 1 + committedBonusClues(r);        // 본 조사 1 + 추론 등 추가 발견
  const wouldDiscover = Math.min(entitled, present);  // 있는 단서 수가 상한(0개면 0)
  discoverClues(wouldDiscover, S.cur, (gained, redirected)=>{
    const drawLines = applyCommittedDraws(r);                             // 배짱=드로우
    let mainExtra;
    if(present===0)            mainExtra = '이 장소엔 획득할 단서가 없습니다.';
    else if(redirected && gained) mainExtra = '단서 '+gained+'개 획득 · 은폐에서 '+redirected+'개 제거.';
    else if(redirected)        mainExtra = '은폐에서 '+redirected+'개 제거 (맵 단서는 유지).';
    else                       mainExtra = '단서 '+gained+'개를 획득했습니다. (보유 '+S.invClue+'개)';
    const gotClue = gained>0;
    const extra = [mainExtra].concat(drawLines).filter(Boolean).join(' ');
    showPopup(testResultHtml({...base, extra}),
      [{label:"확인", primary:true, act:()=>{ hidePopup();
        D.firePlayedReactions("after_investigate_success", ()=>{ if(gotClue) maybeShowAdvanceTip(); });   // 밀란=조사 성공 후 자원(확인 팝업)
      }}], null, boxCls);
  }, cm);   // cm = 클릭한 단서(우선 수거)
}

export function applyInvestigateResult(cm, r){
  let horror=0;   // 실패 시 토큰 추가효과(공포). 구울 의존은 적 미구현 → 보류.
  r.drawn.forEach(t=>{
    if(!r.success && t.onFail){
      if(t.onFail.horror) horror += t.onFail.horror;
      if(t.onFail.spawnGhoul) addLog("토큰 효과: 조우덱서 구울 등장 — 적 시스템 미구현(보류).");
    }
  });
  if(horror){ D.applyToInvestigator(0, horror, "혼돈 토큰"); }   // 초상화에 공포 표시 + 쓰러짐 판정 일원화

  const base = { action:"조사", skill:"intellect", skillLabel:"지식", skillVal:r.base,
                 drawn:r.drawn, total:r.total, target:r.difficulty, targetLabel:"은폐", targetBreak:r.difficultyBreak,
                 success:r.success, autoFail:r.autoFail };
  const boxCls = "pb-test " + (r.success ? "pb-ok" : "pb-no");

  if(r.success){
    resolveInvestigateSuccess(r, base, boxCls, cm);   // cm = 클릭한 단서(우선 수거). 발견 합산·은폐 리다이렉트는 내부에서
  }else{
    showPopup(testResultHtml({...base, extra:'단서를 얻지 못했습니다.'+(horror?' 공포 '+horror+' 획득.':'')}),
      [{label:"확인", primary:true, act:hidePopup}], null, boxCls);
  }
}
