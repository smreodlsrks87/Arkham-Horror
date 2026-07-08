/* =====================================================================
   scenario/tokens.js — 혼돈 주머니 단일 소스
   화면 표시(renderTokens)와 실제 뽑기(drawChaosToken)가 같은 데이터를 쓴다.
   난이도별 주머니 4개 + 심볼효과(2단계) + 표식값(캐릭터별 pull) + 아이콘.

   ※ 구울(적) 의존 효과는 적/조우 시스템 미구현이라 지금은 상수 0 / 스텁(TODO).
   ===================================================================== */

/* ── 주머니 구성(난이도별). 숫자 + 심볼(모든 난이도 공통). ── */
const SYMBOLS = [["skull",2],["cultist",1],["tablet",1],["tentacle",1],["eldersign",1]];
const NUMBERS = {
  easy:   [["+1",2],["0",3],["-1",3],["-2",2]],
  normal: [["+1",1],["0",2],["-1",3],["-2",2],["-3",1],["-4",1]],
  hard:   [["0",3],["-1",2],["-2",2],["-3",2],["-4",1],["-5",1]],
  expert: [["0",1],["-1",2],["-2",2],["-3",2],["-4",2],["-5",1],["-6",1],["-8",1]],
};
export const CHAOS_BAGS = {};
Object.keys(NUMBERS).forEach(d => CHAOS_BAGS[d] = [...NUMBERS[d], ...SYMBOLS]);

/* ── 난이도 상태 ── */
export let chaosDifficulty = "normal";
export function setChaosDifficulty(diff){ if(CHAOS_BAGS[diff]) chaosDifficulty = diff; renderTokens(); }
function tier(){ return (chaosDifficulty==="hard" || chaosDifficulty==="expert") ? "high" : "low"; }

/* ── 심볼 효과(2단계 tier: low=쉬움·보통 / high=어려움·전문가).
   mod=수정치, 추가효과(onFail·ifGhoul·drawMore·spawnGhoul)를 데이터로. ── */
export function ghoulsAtMyLocation(){ return 0; }   // TODO(적 시스템): 내 장소 구울(특성) 수
const SYMBOL_EFFECTS = {
  low: {
    skull:   { mod: ()=> -ghoulsAtMyLocation(), desc: "−X (내 장소 구울 수)" },
    cultist: { mod: ()=> -1, onFail:{horror:1},          desc: "−1, 실패 시 공포 1" },
    tablet:  { mod: ()=> -2, ifGhoul:{damage:1},         desc: "−2, 구울과 같은 장소면 피해 1" },
  },
  high: {
    skull:   { mod: ()=> -2, onFail:{spawnGhoul:1},      desc: "−2, 실패 시 조우덱서 구울 등장" },
    cultist: { mod: ()=> 0, drawMore:1, onFail:{horror:2}, desc: "토큰 1개 더, 실패 시 공포 2" },
    tablet:  { mod: ()=> -4, ifGhoul:{damage:1,horror:1}, desc: "−4, 구울과 같은 장소면 피해 1, 공포 1" },
  },
};

/* ── 표식(elder sign) 값 — 캐릭터별 함수. pull: 필요할 때 ctx로 그 자리서 계산.
   ctx = { charCode, myLocation, cluesAt(room) } ── */
const ELDER_SIGN = {
  "01501": (ctx)=> ctx.cluesAt(ctx.myLocation),   // 로랜드 뱅크스: 내 장소 단서 수
};
export function elderSignValue(charCode, ctx){
  if(ctx && ctx.blanked) return 0;   // 조사자 글상자 백지화(고지식한 탐정) → 표식 효과 무시 = +0
  const fn = ELDER_SIGN[charCode];
  return fn ? fn(ctx) : 0;   // 정의 없으면 0
}

/* ── 뽑기 (실제 주머니에서) ── */
function expand(bag){ const out=[]; bag.forEach(([ty,n])=>{ for(let i=0;i<n;i++) out.push(ty); }); return out; }
export function drawChaosToken(){
  const pool = expand(CHAOS_BAGS[chaosDifficulty]);
  return pool[Math.floor(Math.random()*pool.length)];   // 토큰 종류 문자열
}

/* ── 뽑은 토큰 1개 → 판정 정보 해석 ──
   반환: { type, value, autoFail, drawMore, onFail, ifGhoul } ── */
export function resolveToken(token, ctx){
  if(token==="tentacle")  return { type:"tentacle",  value:0, autoFail:true };  // 무조건 실패(값0). 카드로 취소 가능
  if(token==="eldersign") return { type:"eldersign", value: elderSignValue(ctx.charCode, ctx), autoFail:false };
  if(/^[+-]?\d+$/.test(token)) return { type:"number", value: parseInt(token,10), autoFail:false };
  const eff = SYMBOL_EFFECTS[tier()][token];
  if(eff) return { type:token, value: eff.mod(), autoFail:false,
                   drawMore: eff.drawMore||0, onFail: eff.onFail||null, ifGhoul: eff.ifGhoul||null };
  return { type:token, value:0, autoFail:false };
}

/* ── 아이콘 (화면 표시) ── */
const ICON_MAP = {
  skull:["n","#f0e8ec"], tablet:["v","#6a9ad4"], cultist:["b","#7ac48a"],
  elder:["c","#c9a8e0"], tentacle:["z","#d45a5a"], eldersign:["x","#ffffff"],
};
// 토큰을 동그란 칩으로 그림(심볼=아컴 아이콘 폰트 글리프, 숫자=그대로). ※ SVG 아님.
export function tokenChip(type, size){
  const s=size||26;
  const wrap=(inner,bg)=>'<span style="display:inline-flex;align-items:center;justify-content:center;'+
    'width:'+s+'px;height:'+s+'px;border-radius:50%;background:'+(bg||"#1e1826")+';'+
    'border:1.5px solid #4a3a5e;box-shadow:inset 0 0 6px rgba(0,0,0,.5);">'+inner+'</span>';
  const glyph=(ch,col,fs)=>'<span style="font-family:\'ArkhamIcons\',serif;font-size:'+(fs||s*0.66)+'px;color:'+col+';line-height:1;">'+ch+'</span>';
  if(ICON_MAP[type]){
    const [ch,col]=ICON_MAP[type];
    const bg = (type==="eldersign") ? "#3a6a9a" : "#241a2e";   // 엘더사인만 하늘 배경
    return wrap(glyph(ch,col), bg);
  }
  const col = type.startsWith("+") ? "#7ab08a" : (type==="0" ? "#c8c0d0" : "#d49a9a");
  const num='<span style="font-family:\'ArkhamIcons\',serif;font-size:'+(s*0.54)+'px;font-weight:700;color:'+col+';line-height:1;">'+type+'</span>';
  return wrap(num);
}

/* ── 화면 렌더: 심볼 효과 목록 + 주머니 구성 칩 ── */
const DIFF_KO = { easy:"쉬움", normal:"보통", hard:"어려움", expert:"전문가" };
export function renderTokens(){
  // 소제목(금색)에 현재 난이도 표시 — 예: "토큰 효과 (보통)"
  const title = document.getElementById("tok-eff-title");
  if(title) title.textContent = "토큰 효과 (" + (DIFF_KO[chaosDifficulty]||chaosDifficulty) + ")";

  const t = SYMBOL_EFFECTS[tier()];
  const effEl = document.getElementById("tok-effect-list");
  if(effEl) effEl.innerHTML = ["skull","cultist","tablet"].map(ty=>
    '<div class="tok-eff-row"><span class="tk-ico">'+tokenChip(ty,25)+'</span>'+
    '<span class="tk-txt">'+t[ty].desc+'</span></div>').join("");

  const bag = CHAOS_BAGS[chaosDifficulty];
  const half = Math.ceil(bag.length/2);
  const row1 = bag.slice(0, half), row2 = bag.slice(half);
  const chip = ([ty,n])=>'<span class="tok-chip">'+tokenChip(ty,36)+'<span class="tk-cnt">'+n+'</span></span>';
  const bagEl = document.getElementById("tok-bag-list");
  if(bagEl) bagEl.innerHTML =
    '<div class="tok-bag-row">'+row1.map(chip).join("")+'</div>'+
    '<div class="tok-bag-row">'+row2.map(chip).join("")+'</div>';
}
