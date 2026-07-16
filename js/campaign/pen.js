/* =====================================================================
   campaign/pen.js — 펜 글씨 연출(글자 span 공개 + 펜 좌표 추적 + 연필 소리 루프).
   기록지에 "손으로 쓰는" 칸(Campaign Notes·리타·킬드·컬티스트·체크)을 그린다.
   #pen(만년필)·#pencil(연필 소리)·#sheet(좌표 기준)를 직접 쓴다.

   ※ shared/typing.js(프롤로그·컷신 타이핑)와 합치지 않는다 — 저긴 텍스트를 한 글자씩
     "찍는" 물건이고, 여긴 미리 깔아둔 글자 span을 공개하며 펜을 그 좌표로 옮기고
     연필 소리를 루프시키는 다른 연출이다. 합치면 옵션만 늘고 셋 다 조용히 틀어진다.
   ===================================================================== */

const el = (id)=> document.getElementById(id);   // DOM은 함수 안에서만 조회(모듈 평가 중엔 안 읽음)

/* 만년필 이미지(있으면 사용) 준비 — 없으면 SVG 폴백 */
export function initPen(){
  const pen=el("pen");
  const SVG='<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">'
    +'<g transform="rotate(38 50 50)">'
    +'<rect x="44" y="6" width="12" height="60" rx="4" fill="#1c2233"/>'
    +'<rect x="44" y="6" width="12" height="16" rx="4" fill="#c8a24a"/>'
    +'<polygon points="44,66 56,66 50,92" fill="#c9ccd6"/>'
    +'<rect x="49" y="66" width="2" height="20" fill="#3a3f4c"/>'
    +'</g></svg>';
  pen.innerHTML=SVG;
  const img=new Image();
  img.onload=()=>{ pen.innerHTML='<img src="images/pen.png" alt="">'; };  // 실제 이미지 있으면 교체
  img.src="images/pen.png";
}

// 임의 컨테이너에 펜으로 줄 단위 기입. 한 줄 다 쓰면 연필 멈추고 1초 쉼 → 다음 줄. onDone=전부 끝나면.
export function penWrite(wrap, lines, onDone){
  onDone = onDone || function(){};
  const pen=el("pen"), sheet=el("sheet");
  wrap.innerHTML="";
  if(!lines || !lines.length){ onDone(); return; }
  // 각 줄을 블록(div.nline)으로 미리 배치 → 자리 확보(글자는 opacity로만 노출)
  const lineSpans = lines.map(ln=>{
    const div=document.createElement("div"); div.className="nline";
    const spans=[...ln].map(ch=>{ const s=document.createElement("span"); s.className="wc"; s.textContent=ch; div.appendChild(s); return s; });
    wrap.appendChild(div); return spans;
  });

  const pencil=el("pencil");
  let writing=true;
  pencil.onended=()=>{ if(writing){ try{ pencil.currentTime=0; pencil.play().catch(()=>{}); }catch(_){} } };
  const penOn=()=>{ writing=true; try{ pencil.currentTime=0; pencil.play().catch(()=>{}); }catch(_){} };
  const penOff=()=>{ writing=false; try{ pencil.pause(); }catch(_){} };
  penOn(); pen.classList.add("show");

  const PER=140, LINE_GAP=1000;   // 글자당 ms, 줄 사이 쉼(ms)
  let li=0, ci=0;
  (function step(){
    if(li>=lineSpans.length){ penOff(); setTimeout(()=>pen.classList.remove("show"), 400); onDone(); return; }
    const line=lineSpans[li];
    if(ci>=line.length){ li++; ci=0; penOff(); setTimeout(()=>{ penOn(); step(); }, LINE_GAP); return; }   // 줄 끝 → 1초 쉼
    const s=line[ci]; s.classList.add("on");
    const cr=s.getBoundingClientRect(), sr2=sheet.getBoundingClientRect();
    pen.style.left=((cr.left+cr.width*0.5 - sr2.left)/sr2.width*100)+"%";
    pen.style.top =((cr.top - sr2.top)/sr2.height*100)+"%";
    ci++;
    setTimeout(step, PER);
  })();
}
export function writeNotes(lines, onDone){ penWrite(el("notes-write"), lines, onDone); }
// 시트 임의 위치에 새 셀을 만들어 펜으로 기입(리타 이름·킬드·컬티스트·체크 등)
export function penWriteAt(l, t, lines, cls, onDone){
  const c=document.createElement("div"); c.className="pen-cell "+(cls||""); c.style.left=l+"%"; c.style.top=t+"%";
  el("sheet").appendChild(c); penWrite(c, lines, onDone);
}
export const pW = (l,t,lines,cls)=> new Promise(r=> penWriteAt(l,t,lines,cls,r));   // await용
export const wN = (lines)=> new Promise(r=> writeNotes(lines, r));
