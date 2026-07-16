/* =====================================================================
   campaign/sheet.js — 기록지 좌표표 · 값 채우기 · 경험치/트라우마 표시.
   배경 1605×903 기준 %좌표(조사자 열·행·시나리오 체크박스·킬드·컬티스트)와
   조사자명·남은 경험치·누적 트라우마 기입, 결말 연출용 카운트업/트라우마 팝.
   ※ 결말 순서·팝업(runEpilogue)은 인라인 잔류 — 여긴 "표시만" 한다(데이터는 이미 확정 저장됨).
   ===================================================================== */
import { orderedDecks, getDecks, saveDecks } from "./storage.js";

/* ── 좌표(배경 1605×903 기준 %). 각 조사자 열 라벨 좌측 % ── */
const px = (n)=> n/1605*100;
export const COL = [25.86, 38.26, 50.65, 63.06];
export const ROW = { inv:21.2, xp:25.2, trauma:29.3, earned:35.9 };
export const SC_CHECK = [ [32.6,51.8], [32.5,58.4], [32.6,67.6] ];   // 시나리오 체크박스(게더링/미드나잇/디바우어)
export const KILLED_POS = [29.6, 79.5], CULT_INT_POS = [56.0, 73.6], CULT_AWAY_POS = [56.0, 87.5];

const sheetEl = ()=> document.getElementById("sheet");   // DOM은 함수 안에서만 조회(모듈 평가 중엔 안 읽음)
export function put(l, t, cls, txt){
  const el=document.createElement("div");
  el.className="f "+cls; el.style.left=l+"%"; el.style.top=t+"%"; el.textContent=txt;
  sheetEl().appendChild(el); return el;
}

/* ── 기록지 값 채우기(즉시 기록분: 조사자명·남은 경험치·누적 트라우마) ── */
export let SHEET = [];   // [{d, cx, xpEl, physicalEl, mentalEl}] — 결말 연출에서 참조
export function fillSheet(){
  SHEET = [];
  orderedDecks().slice(0,4).forEach((d,i)=>{
    const cx = COL[i];
    put(cx+px(185), ROW.inv, "fld r", d.investigatorName||"");           // INVESTIGATOR = 조사자명(우측정렬)
    const xpEl = put(cx+px(185), ROW.xp, "fld r", String(d.xp||0));      // UNSPENT EXPERIENCE = 남은 경험치(우측)
    const tr = d.trauma || { physical:0, mental:0 };                     // TRAUMA = 누적(육체/정신 각 수치)
    const physicalEl = tr.physical>0 ? put(cx+px(80),  ROW.trauma, "sm c ico", String(tr.physical)) : null;
    const mentalEl   = tr.mental>0   ? put(cx+px(145), ROW.trauma, "sm c ico", String(tr.mental))   : null;
    SHEET.push({ d, cx, xpEl, physicalEl, mentalEl });
  });
}
// ── 연출은 "표시만"(데이터는 runEpilogue가 미리 확정 저장). 크래시 세이프 ──
// 경험치 카운트업 표시(fromV→toV) + 초록 "+N" 플로트
export function showXPGain(entry, fromV, toV, done){
  done=done||function(){};
  const sheet=sheetEl();
  const r=entry.xpEl.getBoundingClientRect(), sr=sheet.getBoundingClientRect();
  const f=document.createElement("div"); f.className="xp-plus"; f.textContent="+"+(toV-fromV);
  f.style.left=((r.left-sr.left)/sr.width*100)+"%"; f.style.top=((r.top-sr.top)/sr.height*100)+"%";
  sheet.appendChild(f);
  const steps=12, dt=75; let i=0;
  const iv=setInterval(()=>{ i++; entry.xpEl.textContent=String(Math.round(fromV+(toV-fromV)*i/steps));
    if(i>=steps){ clearInterval(iv); entry.xpEl.textContent=String(toV); setTimeout(()=>{ f.remove(); done(); }, 450); } }, dt);
}
// 전원 +delta 표시(before 스냅샷 기준)
export function showAllXP(before, delta, done){ let i=0; (function next(){ if(i>=SHEET.length){ done(); return; }
  const k=i++; showXPGain(SHEET[k], before[k].xp, before[k].xp+delta, next); })(); }
// 트라우마 칸을 toCount로 표시(있으면 갱신, 없으면 생성) — 데이터는 이미 확정됨
export function showTrauma(entry, which, toCount, done){
  done=done||function(){};
  const key = which==="physical" ? "physicalEl" : "mentalEl";
  const l = which==="physical" ? entry.cx+px(80) : entry.cx+px(145);
  if(entry[key]){ entry[key].textContent=String(toCount); entry[key].classList.remove("tr-pop"); void entry[key].offsetWidth; entry[key].classList.add("tr-pop"); }
  else { entry[key] = put(l, ROW.trauma, "sm c ico tr-pop", String(toCount)); }
  const el=entry[key]; setTimeout(()=>{ if(el) el.classList.remove("tr-pop"); done(); }, 900);
}
// 이번 시나리오 결과(status)를 누적 트라우마에 반영 → status 초기화(재적용·팝업 재발 방지) → 저장
export function applyScenarioTrauma(){
  getDecks().forEach(d=>{
    d.trauma = d.trauma || { physical:0, mental:0 };
    const st = d.status || [2,0];
    if(st[0]===0){   // 쓰러짐 → 트라우마 1
      const which = st[1]===1 ? "physical" : st[1]===2 ? "mental"
                  : (d.chosenTrauma==="mental" ? "mental" : "physical");   // 3=둘 다 → 택1
      d.trauma[which] = (d.trauma[which]||0) + 1;
    }
    d.status = [2,0];   // 처리 완료
  });
  saveDecks();
}
