/* =====================================================================
   shared/audio.js — 배경음악(BGM) + 효과음(SFX) 공용 모듈 (Web Audio API)
   두 화면(메뉴·시나리오) 공용. 빌드 없음 — 브라우저 네이티브 ES 모듈.

   설계 원칙
   - 자동재생 정책: 브라우저는 사용자 제스처 전 소리를 막음 → armOnFirstGesture()로
     첫 클릭/키에서 컨텍스트를 깨운다(메뉴가 이미 클릭 기반이라 자연스러움).
   - 음원 파일이 아직 없어도 throw 없이 조용히 무시(경고 1회) → 파일은 나중에 audio/에 채움.
   - 컷신은 "정지"가 아니라 "덕킹"(볼륨을 20~25%로 낮춤) → 끝나면 복원.
   - 알트탭(visibilitychange) 시 컨텍스트 suspend → 복귀 시 resume(컷신 싱크와 일관).
   - 볼륨은 localStorage에 저장.

   파일 규약(audio/ 폴더, ogg 권장 + mp3 폴백은 나중에):
     BGM  : audio/bgm/<track>.ogg      (예: menu, scenario)
     SFX  : audio/sfx/<name>.ogg       (예: card-draw, card-play, resource, clue, test-success)
   사용 예:
     import { audio } from "../shared/audio.js";
     audio.armOnFirstGesture();                 // 부팅 시 1회
     audio.playBgm("scenario", { fadeIn: 2 });  // 게임판 진입
     audio.duck(); … audio.unduck();            // 컷신 진입/종료
     audio.sfx("resource");                     // 자원 획득 시
   ===================================================================== */

const BGM_DIR = "audio/bgm/";
const SFX_DIR = "audio/sfx/";
const EXT = ".ogg";                    // 추후 mp3 폴백 추가 지점

const LS_KEY = "arkham_audio";         // { bgm:0~1, sfx:0~1, muted:bool }

const state = {
  ctx: null,
  master: null, bgmGain: null, sfxGain: null,   // 게인 노드 체인
  bgmSource: null, bgmName: null,
  buffers: {},                                    // 디코딩된 오디오버퍼 캐시(경로→AudioBuffer)
  duckLevel: 0.22,                                // 덕킹 시 BGM 배율
  ducked: false,
  vol: { bgm: 0.45, sfx: 0.8, muted: false },     // 기본 볼륨
  warned: {},                                     // 파일 누락 경고 중복 방지
  armed: false,
};

// ---- 설정 저장/복원 ----
function loadPrefs(){
  try{ const p = JSON.parse(localStorage.getItem(LS_KEY)); if(p) Object.assign(state.vol, p); }catch(e){}
}
function savePrefs(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(state.vol)); }catch(e){}
}

// ---- 컨텍스트/게인 그래프 지연 생성 ----
function ensureCtx(){
  if(state.ctx) return state.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC){ warnOnce("audiocontext", "이 브라우저는 Web Audio를 지원하지 않습니다."); return null; }
  const ctx = new AC();
  const master = ctx.createGain();
  const bgmGain = ctx.createGain();
  const sfxGain = ctx.createGain();
  bgmGain.connect(master); sfxGain.connect(master); master.connect(ctx.destination);
  state.ctx = ctx; state.master = master; state.bgmGain = bgmGain; state.sfxGain = sfxGain;
  applyVolumes(0);
  return ctx;
}

function warnOnce(key, msg){
  if(state.warned[key]) return; state.warned[key] = true;
  console.warn("[audio] " + msg);
}

// 현재 볼륨을 게인에 반영(램프 시간 t초)
function applyVolumes(t = 0.05){
  if(!state.ctx) return;
  const now = state.ctx.currentTime;
  const m = state.vol.muted ? 0 : 1;
  const bgm = state.vol.bgm * (state.ducked ? state.duckLevel : 1) * m;
  state.master.gain.cancelScheduledValues(now);
  state.bgmGain.gain.cancelScheduledValues(now);
  state.sfxGain.gain.cancelScheduledValues(now);
  state.master.gain.setTargetAtTime(1, now, 0.01);
  state.bgmGain.gain.setTargetAtTime(bgm, now, Math.max(0.01, t));
  state.sfxGain.gain.setTargetAtTime(state.vol.sfx * m, now, 0.01);
}

// ---- 파일 로드/디코딩(캐시) ----
async function loadBuffer(url){
  if(state.buffers[url]) return state.buffers[url];
  const ctx = ensureCtx(); if(!ctx) return null;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(res.status + " " + url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    state.buffers[url] = buf;
    return buf;
  }catch(e){
    warnOnce(url, "음원을 불러오지 못했습니다(파일 준비 전이면 정상): " + url);
    return null;
  }
}

// ---- 공개 API ----
export const audio = {
  // 첫 사용자 제스처에서 컨텍스트를 깨움(자동재생 정책 대응). 부팅 시 1회 호출.
  armOnFirstGesture(){
    if(state.armed) return; state.armed = true;
    loadPrefs();
    const wake = ()=>{
      const ctx = ensureCtx();
      if(ctx && ctx.state === "suspended") ctx.resume();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    // 알트탭 등: 백그라운드면 컨텍스트 정지 → 복귀 시 재개(컷신 싱크와 일관)
    document.addEventListener("visibilitychange", ()=>{
      if(!state.ctx) return;
      if(document.hidden) state.ctx.suspend(); else state.ctx.resume();
    });
  },

  // BGM 루프 재생(크로스페이드). 같은 트랙이면 무시.
  async playBgm(track, { loop = true, fadeIn = 1.5 } = {}){
    const ctx = ensureCtx(); if(!ctx) return;
    if(state.bgmName === track && state.bgmSource) return;
    const buf = await loadBuffer(BGM_DIR + track + EXT);
    if(!buf){ state.bgmName = track; return; }   // 파일 없으면 이름만 기억(추후 파일 추가 시 동작)
    this.stopBgm(0.6);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = loop;
    src.connect(state.bgmGain);
    // 페이드인
    const now = ctx.currentTime;
    state.bgmGain.gain.cancelScheduledValues(now);
    state.bgmGain.gain.setValueAtTime(0.0001, now);
    src.start(0);
    state.bgmSource = src; state.bgmName = track;
    state.ducked = false;
    applyVolumes(fadeIn);
  },

  stopBgm(fadeOut = 0.6){
    if(!state.ctx || !state.bgmSource) return;
    const src = state.bgmSource, now = state.ctx.currentTime;
    state.bgmGain.gain.setTargetAtTime(0.0001, now, Math.max(0.01, fadeOut/3));
    try{ src.stop(now + fadeOut + 0.1); }catch(e){}
    state.bgmSource = null; state.bgmName = null;
  },

  // 컷신 진입: BGM을 낮게 깔기(정지 아님)
  duck(level){
    if(typeof level === "number") state.duckLevel = level;
    state.ducked = true; applyVolumes(0.4);
  },
  unduck(){ state.ducked = false; applyVolumes(0.8); },

  // 짧은 효과음 재생(프리로드 권장하지만 즉석 로드도 지원)
  async sfx(name, { volume = 1, rate = 1 } = {}){
    const ctx = ensureCtx(); if(!ctx) return;
    const buf = await loadBuffer(SFX_DIR + name + EXT);
    if(!buf) return;
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    if(volume !== 1){ const g = ctx.createGain(); g.gain.value = volume; src.connect(g); g.connect(state.sfxGain); }
    else src.connect(state.sfxGain);
    src.start(0);
  },

  // 효과음 미리 디코딩(첫 재생 지연 방지). names = ["card-draw", ...]
  async preloadSfx(names){
    await Promise.all((names||[]).map(n => loadBuffer(SFX_DIR + n + EXT)));
  },

  // 볼륨 제어(0~1) — 설정 UI에서 사용
  setBgmVolume(v){ state.vol.bgm = Math.max(0, Math.min(1, v)); applyVolumes(); savePrefs(); },
  setSfxVolume(v){ state.vol.sfx = Math.max(0, Math.min(1, v)); applyVolumes(); savePrefs(); },
  setMuted(m){ state.vol.muted = !!m; applyVolumes(); savePrefs(); },
  toggleMuted(){ this.setMuted(!state.vol.muted); return state.vol.muted; },
  getVolumes(){ return { ...state.vol }; },
};
