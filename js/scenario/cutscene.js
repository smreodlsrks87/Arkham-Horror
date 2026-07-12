/* =====================================================================
   scenario/cutscene.js — 컷신 재생기(영상+음성+타이핑 자막, ESC 길게 스킵).
   제너릭 플레이어: 컷신 데이터(CUTSCENES)와 "맵 액션 취소"는 시나리오가 주입.
   공개: playCutscene(id,onEnd), playCutsceneSequence(ids,onAllDone,gapMs,afterFirst),
        setCutscenes(table), setCancelActions(fn), csActive(라이브 바인딩 — canAct 등 참조).
   ===================================================================== */
import { S } from "./state.js";
import { createSkipRing } from "../shared/skip-ring.js";

// ── 주입(시나리오별) ──
let CUTSCENES = {};                                   // 컷신 데이터 테이블 {id:{text,typeMs,okDelayMs,introHtml,introMs}}
export function setCutscenes(table){ CUTSCENES = table || {}; }
let cancelActions = ()=>{};                           // 컷신 시작 시 진행 중 맵 액션(이동·조사·팝업) 취소
export function setCancelActions(fn){ cancelActions = fn || (()=>{}); }

const csScreen = document.getElementById("cutscene");
const csVideo  = document.getElementById("cutscene-video");
const csNoVideo= document.getElementById("cutscene-novideo");
const csTextBox= document.getElementById("cutscene-text");
const csAudio  = document.getElementById("cutscene-audio");
const csRing   = document.getElementById("cs-skip-ring");
const csOk     = document.getElementById("cutscene-ok");
const csSkipUI = document.getElementById("cutscene-skip");
const CS_RING_LEN = 88;
const CS_SKIP_MS = 1000;
const CS_TYPE_MS_PER_CHAR = 55;   // 글자당 타이핑 속도(느긋하게)

export let csActive=false;   // ★ 컷신 재생 중 — canAct 등이 참조(라이브 바인딩)
let csDone=false, csTimers=[], csOnEnd=null;
let csReveal=false, csFullText="";   // 좌클릭 시 전체 텍스트 즉시 노출용
let csEndTimer=null;

export function playCutscene(id, onEnd){
  const data = CUTSCENES[id];
  if(!data){ if(onEnd) onEnd(); return; }
  cancelActions();                  // 컷신 시작 → 진행 중이던 이동·조사·팝업 전부 취소(주입)
  S.phaseBusy = true;                 // 컷신 시작 → 입력 잠금(조사자 단계 복귀 시 풀림)
  csOnEnd = onEnd || null;
  csDone=false; csActive=true; csTimers=[]; csReveal=false;
  csTextBox.innerHTML=""; csTextBox.classList.add("cs-cursor");

  csScreen.style.display="";        // endCutscene에서 none 처리된 것 복구
  csScreen.style.transition="opacity 1s ease";
  csScreen.classList.add("show");

  // 영상: 파일이 있으면 재생, 없으면 자리표시(◆). preload로 미리 받아둬 안 끊김.
  const videoSrc = "cutscenes/"+id+".mp4";
  csVideo.src = videoSrc;
  csVideo.muted = true;   // 모든 mp4 음소거 — 소리는 mp3(csAudio)로만
  csVideo.classList.remove("on"); csNoVideo.style.display="block";
  // 충분히 재생 가능해지면(버퍼됨) 표시 — 첫 프레임만이 아니라 끊김 없이 틀 수 있을 때
  const showVideo = ()=>{ csVideo.classList.add("on"); csNoVideo.style.display="none"; };
  csVideo.oncanplaythrough = showVideo;
  csVideo.onloadeddata = showVideo;   // 폴백(canplaythrough 안 오는 환경)
  csVideo.onerror = ()=>{ csVideo.classList.remove("on"); csNoVideo.style.display="block"; };

  // 인트로 HTML(iframe): 있으면 처음 introMs 동안 영상 위를 덮고, 그 뒤 크로스페이드로 사라짐
  const csIntro = document.getElementById("cutscene-intro");
  if(data.introHtml){
    csIntro.src = data.introHtml;
    csIntro.classList.add("on");              // 인트로 페이드인
    csVideo.play?.().catch(()=>{});           // 영상은 뒤에서 미리 재생(가려진 채)
    csTimers.push(setTimeout(()=>{ csIntro.classList.remove("on"); }, data.introMs||5000));  // introMs 뒤 크로스페이드
    // 크로스페이드 끝난 뒤 iframe 비우기(리소스 정리) — 페이드(1.2s) 후
    csTimers.push(setTimeout(()=>{ csIntro.src="about:blank"; }, (data.introMs||5000)+1400));
  }else{
    csIntro.classList.remove("on"); csIntro.src="about:blank";
    csVideo.play?.().catch(()=>{});
  }

  // 음성: 있으면 재생(반복X)
  csAudio.src = "cutscenes/"+id+".mp3";
  csAudio.volume = 1;
  csAudio.play?.().catch(()=>{});

  // 텍스트 타이핑 (컷신에 typeMs가 있으면 그 총 시간에 맞춰 속도 계산)
  typeCutsceneText(data.text||"", data.typeMs);

  // 확인 버튼: 시작 후 지정 시간(기본 43초) 뒤 등장. 확인/스킵으로만 종료.
  csOk.classList.remove("show");
  csSkipUI.style.display="flex";   // 스킵 안내 다시 보이게(재생 시작)
  const okDelay = (data.okDelayMs!=null) ? data.okDelayMs : 43000;
  csEndTimer = setTimeout(()=>{
    csOk.classList.add("show");
    csSkipUI.style.display="none";   // 다 봤으니 스킵 안내 숨김
    disableCsSkip();                 // ESC 스킵도 비활성(이미 다 봄)
  }, okDelay);

  enableCsSkip();
}

// 컷신 진행: "아무 키나" 문구가 떴을 때(csOk.show) 키/클릭이면 진행
csOk.onclick = ()=>{ endCutscene(false); };
function csCanProceed(){ return csActive && csOk.classList.contains("show"); }
document.addEventListener("keydown", (e)=>{
  if(csCanProceed()){ e.preventDefault(); endCutscene(false); }
});
document.addEventListener("mousedown", (e)=>{
  if(csCanProceed()){ endCutscene(false); return; }
  // 타이핑 중 좌클릭 → 전체 텍스트 즉시 노출(넘어가진 않음; 다 읽고 ESC 길게로 스킵)
  if(csActive && !csReveal && e.button===0) revealCutsceneText();
});

function revealCutsceneText(){
  if(!csActive || csReveal) return;
  csReveal=true;                       // typeCutsceneText의 step()이 이후 멈춤
  csTextBox.textContent = csFullText;  // 전체 즉시 표시
  csTextBox.classList.remove("cs-cursor");
}

function typeCutsceneText(text, totalMs){
  let i=0;
  csFullText = text;   // 좌클릭 즉시 노출용
  // 총 시간이 지정되면 글자당 간격 = 총시간/글자수, 아니면 기본 속도
  const perChar = (totalMs && text.length) ? (totalMs/text.length) : CS_TYPE_MS_PER_CHAR;
  function step(){
    if(csDone || csReveal) return;
    csTextBox.textContent = text.slice(0, i+1);
    i++;
    if(i < text.length) csTimers.push(setTimeout(step, perChar));
    else csTextBox.classList.remove("cs-cursor");
  }
  if(text.length) step(); else csTextBox.classList.remove("cs-cursor");
}

function endCutscene(skipped){
  if(csDone) return;
  csDone=true; csActive=false;
  csTimers.forEach(t=>clearTimeout(t)); csTimers=[];
  if(csEndTimer) clearTimeout(csEndTimer);
  csOk.classList.remove("show");
  disableCsSkip();   // ESC 홀드 취소 + 링 리셋 + 리스너 해제 (공용 컴포넌트가 모두 처리)

  // 영상·음성 페이드아웃
  fadeCsAudioOut(900);
  try{ csVideo.pause(); }catch(_){}
  csScreen.style.transition="opacity .9s ease";
  csScreen.classList.remove("show");
  setTimeout(()=>{
    csScreen.style.display="none";
    csVideo.src=""; csAudio.src="";
    const cb=csOnEnd; csOnEnd=null;
    if(cb) cb();     // 컷신 끝 → 다음 동작(묶음의 다음 컷신·막 전진 등)
    // 잠금 해제는 여기서 하지 않음 — 컷신 묶음(playCutsceneSequence)이 관리한다.
  }, 950);
}

function fadeCsAudioOut(ms){
  const steps=18, dt=ms/steps, v0=csAudio.volume; let i=0;
  const t=setInterval(()=>{ i++; csAudio.volume=Math.max(0,v0*(1-i/steps));
    if(i>=steps){ clearInterval(t); try{csAudio.pause();}catch(_){}} }, dt);
}

/* ESC 길게 스킵 — js/shared/skip-ring.js 사용 */
const csSkip = createSkipRing({
  ringEl: csRing,
  holdMs: CS_SKIP_MS,
  ringLen: CS_RING_LEN,
  isDone: ()=>csDone,
  onComplete: ()=>endCutscene(true),
});
function enableCsSkip(){ csSkip.enable(); }     // 기존 호출부 유지용 래퍼
function disableCsSkip(){ csSkip.disable(); }   // 홀드 취소 + 링 리셋 + 리스너 해제까지 처리

/* 컷신 묶음(시퀀스) — 여러 컷신을 순서대로 재생. 묶음 전체가 하나의 잠금 단위.
   - 묶음 시작: 입력 잠금(S.phaseBusy=true)
   - 컷신 사이 간격(gapMs) 동안에도 잠금 유지 → setTimeout 틈 안 뚫림
   - 묶음 끝: onAllDone 실행. 여기서 조사자 단계 복귀 등으로 잠금을 푼다.
   - afterFirst: 첫 컷신이 끝난 직후 실행(의제의 파멸 처리 등에 사용)
   ids: 컷신 id 배열, onAllDone: 전부 끝난 뒤, gapMs: 컷신 사이 간격, afterFirst: 첫 컷신 후 훅 */
export function playCutsceneSequence(ids, onAllDone, gapMs, afterFirst){
  gapMs = (gapMs==null) ? 1000 : gapMs;
  S.phaseBusy = true;                    // 묶음 시작 → 잠금
  let i = 0;
  const playNext = ()=>{
    if(i >= ids.length){                // 묶음 끝
      if(onAllDone) onAllDone();
      return;
    }
    const id = ids[i++];
    playCutscene(id, ()=>{
      if(i===1 && afterFirst) afterFirst();   // 첫 컷신 끝난 직후 훅
      if(i < ids.length){                // 다음 컷신 남음 → 간격 두고(잠금 유지) 재생
        setTimeout(playNext, gapMs);
      }else{
        playNext();                      // 마지막 → 종료 처리
      }
    });
  };
  playNext();
}
