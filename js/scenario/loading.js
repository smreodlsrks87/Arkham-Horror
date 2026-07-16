/* =====================================================================
   scenario/loading.js — 로딩 화면(게이지·프리로드·"계속하려면 아무 키나").
   카드 이미지·컷신 영상/음성 프리로드, 진행률 게이지, 최소시간 보정(smoothFillTo100),
   입력 대기 후 게임 시작. 부팅 순서는 scenario1의 boot()가 소유하고 여기 함수를 호출한다.
   ※ 로딩 완료 뒤 시작 지점(startScenarioIntro)은 시나리오 고유라 인라인 잔류 → 주입받는다.
   ===================================================================== */
import { S } from "./state.js";
import { addLog } from "./log.js";

// 주입(scenario1 인라인: 로딩 끝난 뒤 도입 시작)
let D = { startScenarioIntro(){} };
export function setLoadingDeps(o){ Object.assign(D, o); }

/* 시나리오에서 쓸 모든 카드 이미지를 미리 불러옴(진입 즉시 호출 → 컷신 도는 동안 캐싱) */
let preloadedImgs = [];
export function preloadAllCardImages(){
  const EN="https://arkhamdb.com";
  const urls = new Set();
  const add = (src)=>{ if(src) urls.add(src.startsWith("http")?src:EN+src); };
  // 조사자 앞·뒷면
  if(S.invCard){ add(S.invCard.imagesrc); }
  // 덱에 포함된 모든 카드(앞·뒷면)
  const cs = S.activeInvestigator && S.activeInvestigator.cards ? S.activeInvestigator.cards : {};
  Object.keys(cs).forEach(code=>{ const c=S.byCode[code]; if(c){ add(c.imagesrc); add(c.backimagesrc); } });
  // 시그니처·약점
  if(S.activeInvestigator){
    (S.activeInvestigator.signatures||[]).forEach(code=>{ const c=S.byCode[code]; if(c){ add(c.imagesrc); add(c.backimagesrc); } });
    if(S.activeInvestigator.randomWeakness){ const c=S.byCode[S.activeInvestigator.randomWeakness]; if(c){ add(c.imagesrc); } }
  }
  // 조우 카드(있으면)
  S.encounterDeck.forEach(c=>{ if(c&&c.imagesrc) add(c.imagesrc); });
  // 실제 프리로드
  urls.forEach(u=>{ const im=new Image(); im.src=u; preloadedImgs.push(im); });
  addLog("카드 이미지 "+urls.size+"장을 미리 불러왔습니다.");
}

// 초반 컷신 영상·음성을 미리 받아둔다(진입 시 호출) → 재생할 때 안 끊김
let preloadedMedia = [];
export function preloadCutsceneMedia(ids){
  ids.forEach(id=>{
    // 영상 미리 다운로드(숨긴 video로 버퍼링)
    const v=document.createElement("video");
    v.preload="auto"; v.muted=true; v.src="cutscenes/"+id+".mp4";
    v.load?.(); preloadedMedia.push(v);
    // 음성도 미리
    const a=document.createElement("audio");
    a.preload="auto"; a.src="cutscenes/"+id+".mp3";
    a.load?.(); preloadedMedia.push(a);
  });
}

// ===== 로딩 화면 시스템 =====
const CUTSCENE_IDS = ["agenda1a","agenda1b","agenda2a","agenda2b","agenda3a","agenda3b",
                      "act1a","act1b","act2a","act2b","act3a","act3b"];
export function setLoadProgress(pct, statusText){
  pct = Math.max(0, Math.min(100, Math.round(pct)));
  const fillRect=document.getElementById("fill-rect");
  const pctEl=document.getElementById("load-pct");
  const statusEl=document.getElementById("load-status");
  if(fillRect) fillRect.setAttribute("width", (pct/100*1200)+"");  // viewBox 폭 1200 기준
  if(pctEl){ pctEl.firstChild ? pctEl.firstChild.nodeValue=pct : pctEl.textContent=pct; }  // 숫자만(% span 유지)
  if(statusText && statusEl) statusEl.textContent = statusText;
}
// 이미지 1장 로드(성공/실패 무관 완료 처리)
export function loadOneImage(url){
  return new Promise(res=>{
    const im=new Image();
    let done=false; const finish=()=>{ if(!done){ done=true; res(); } };
    im.onload=finish; im.onerror=finish;
    setTimeout(finish, 8000);   // ★ arkhamdb가 느리거나 응답을 붙잡아도(onload·onerror 둘 다 안 옴) 로딩이 영원히 멈추지 않게
    im.src=url; preloadedImgs.push(im);
  });
}
// 미디어 1개 로드(영상·음성) — 없으면 즉시 넘어감(onerror), 느리면 짧은 타임아웃
export function loadOneMedia(url, isVideo){
  return new Promise(res=>{
    const el = isVideo ? document.createElement("video") : document.createElement("audio");
    el.preload="auto"; if(isVideo) el.muted=true;
    let done=false; const finish=()=>{ if(!done){ done=true; res(); } };
    el.oncanplaythrough=finish; el.onloadeddata=finish;
    el.onerror=finish;              // 파일 없으면 거의 즉시 → 대기 안 함
    el.onstalled=finish;            // 멈추면 넘어감
    setTimeout(finish, 2500);       // 최대 2.5초만 기다림
    el.src=url; el.load?.(); preloadedMedia.push(el);
  });
}
// 전체 로딩: 카드 이미지 → 영상 → 음성 순서로, 진행률 갱신
export async function runLoading(){
  // 1) 로드할 카드 이미지 URL 모으기
  const EN="https://arkhamdb.com";
  const imgUrls=new Set();
  const addImg=(src)=>{ if(src) imgUrls.add(src.startsWith("http")?src:EN+src); };
  if(S.invCard){ addImg(S.invCard.imagesrc); }
  const cs = S.activeInvestigator && S.activeInvestigator.cards ? S.activeInvestigator.cards : {};
  Object.keys(cs).forEach(code=>{ const c=S.byCode[code]; if(c){ addImg(c.imagesrc); addImg(c.backimagesrc); } });
  if(S.activeInvestigator){
    (S.activeInvestigator.signatures||[]).forEach(code=>{ const c=S.byCode[code]; if(c){ addImg(c.imagesrc); addImg(c.backimagesrc); } });
    if(S.activeInvestigator.randomWeakness){ const c=S.byCode[S.activeInvestigator.randomWeakness]; if(c) addImg(c.imagesrc); }
  }
  // 덱에 없더라도 조우·적 대비가 필요하면 여기서 추가하지만,
  // 로딩 속도를 위해 지금은 "덱·시그니처·약점"만 우선 로드. 나머지는 게임 중 필요시 로드.
  // (전체 301장을 받으려면 아래 주석을 해제)
  // Object.keys(S.byCode).forEach(code=>{ const c=S.byCode[code]; if(c&&c.imagesrc) addImg(c.imagesrc); });

  const imgList=[...imgUrls];
  const videoList=CUTSCENE_IDS.map(id=>"cutscenes/"+id+".mp4");
  const audioList=CUTSCENE_IDS.map(id=>"cutscenes/"+id+".mp3");
  const total = imgList.length + videoList.length + audioList.length;
  let done=0;
  const tick=(label)=>{ done++; setLoadProgress(done/total*100, label); };

  // 2) 카드 이미지 (병렬 8개씩)
  setLoadProgress(2, "카드 이미지를 불러오는 중...");
  for(let i=0;i<imgList.length;i+=8){
    await Promise.all(imgList.slice(i,i+8).map(u=>loadOneImage(u).then(()=>tick("카드 이미지를 불러오는 중... ("+done+"/"+total+")"))));
  }
  // 3) 영상 (병렬 4개씩 — 없는 파일은 즉시 넘어감)
  setLoadProgress(done/total*100, "과거의 기록(영상)을 여는 중...");
  for(let i=0;i<videoList.length;i+=4){
    await Promise.all(videoList.slice(i,i+4).map(u=>loadOneMedia(u,true).then(()=>tick("과거의 기록(영상)을 여는 중..."))));
  }
  // 4) 음성 (병렬 4개씩)
  setLoadProgress(done/total*100, "속삭임(음성)을 듣는 중...");
  for(let i=0;i<audioList.length;i+=4){
    await Promise.all(audioList.slice(i,i+4).map(u=>loadOneMedia(u,false).then(()=>tick("속삭임(음성)을 듣는 중..."))));
  }

  setLoadProgress(100, "준비 완료");
}
// 로딩 끝 → 화면 감추고 게임 시작
export function finishLoading(){
  const ls=document.getElementById("loading-screen");
  if(ls){ ls.classList.add("hide"); setTimeout(()=>{ ls.style.display="none"; }, 900); }
  D.startScenarioIntro();
}

// "계속하려면 아무 키나" 깜빡임 → 키·클릭 시 게임 시작
let continueReady=false;
export function waitForContinue(){
  const cont=document.getElementById("load-continue");
  if(cont) cont.classList.add("on");
  continueReady=true;
  const go=()=>{
    if(!continueReady) return;
    continueReady=false;
    document.removeEventListener("keydown", go);
    document.removeEventListener("mousedown", go);
    finishLoading();
  };
  document.addEventListener("keydown", go);
  document.addEventListener("mousedown", go);
}

// 남은 시간(ms) 동안 게이지를 현재값→100%로 부드럽게 채움
export function smoothFillTo100(ms){
  return new Promise(res=>{
    const fillRect=document.getElementById("fill-rect");
    const startPct = fillRect ? (parseFloat(fillRect.getAttribute("width"))||1080)/1200*100 : 90;
    const t0=Date.now();
    let done=false;
    const finish=()=>{ if(done) return; done=true; setLoadProgress(100, "준비 완료"); res(); };
    const step=()=>{
      if(done) return;
      const p=Math.min(1,(Date.now()-t0)/ms);
      setLoadProgress(startPct + (100-startPct)*p, "준비 완료");
      if(p<1) requestAnimationFrame(step); else finish();
    };
    step();
    // 탭이 백그라운드면 requestAnimationFrame이 멈춰 게이지가 안 차고 게임이 시작 안 되므로,
    // setTimeout 백업으로 rAF가 죽어도 반드시 로딩을 끝낸다(로딩 100%에서 멈춤 방지).
    setTimeout(finish, ms + 200);
  });
}
