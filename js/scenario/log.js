/* =====================================================================
   scenario/log.js — 게임 로그(중요 정보 자동 출력, 최신이 아래).
   addLog(text)로 기록하고 renderLog()로 #log-lines에 그린다.
   로그 자체만 다루며 다른 게임 상태에 의존하지 않는다.
   ===================================================================== */

let gameLog = [];

// 로그 한 줄 기록(시각 + 내용). 최신이 아래로 쌓이고 최대 200줄 유지.
export function addLog(text){
  const now = new Date();
  const t = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
  gameLog.push({ t, text });
  if(gameLog.length > 200) gameLog.shift();
  renderLog();
}

// #log-lines 에 로그를 그림(자동으로 맨 아래로 스크롤).
export function renderLog(){
  const box = document.getElementById("log-lines");
  if(!box) return;
  if(!gameLog.length){ box.innerHTML = '<div class="lg-empty">기록이 없습니다.</div>'; return; }
  box.innerHTML = gameLog.map(l =>
    '<div class="lg"><span class="lg-t">'+l.t+'</span>'+l.text+'</div>').join("");
  box.scrollTop = box.scrollHeight;
}
