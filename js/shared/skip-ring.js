/* =====================================================================
   skip-ring.js — ESC를 길게 누르면 원형 게이지가 차오르고, 다 차면 스킵.
   두 화면(프롤로그·컷신)이 함께 쓰는 공용 컴포넌트.

   사용: const skip = createSkipRing({ ringEl, holdMs, ringLen, isDone, onComplete });
        skip.enable();   // ESC 감지 시작
        skip.disable();  // 감지 중단 + 진행 중 홀드 취소 + 링 리셋

   config
     ringEl     : 게이지로 쓸 SVG 원 요소(strokeDashoffset로 채움)
     holdMs     : 얼마나 눌러야 스킵되나(ms). 기본 2000
     ringLen    : 원 둘레(2πr). 기본 88 (r=14)
     isDone()   : true면 스킵 무시(이미 끝난 상태)
     onComplete(): 다 채웠을 때 실행(실제 스킵 동작)
   ===================================================================== */
export function createSkipRing({ ringEl, holdMs = 2000, ringLen = 88, isDone, onComplete }){
  let holding = false, start = 0, raf = null;

  function reset(){ if(ringEl) ringEl.style.strokeDashoffset = ringLen; }

  function tick(){
    if(!holding) return;
    const p = Math.min(1, (performance.now() - start) / holdMs);   // 진행률 0→1
    if(ringEl) ringEl.style.strokeDashoffset = ringLen * (1 - p);  // 링 채움
    if(p >= 1){ onComplete(); return; }                           // 다 차면 스킵
    raf = requestAnimationFrame(tick);
  }

  function down(e){
    if(e.key !== "Escape" || holding || (isDone && isDone())) return;
    holding = true; start = performance.now(); tick();
  }
  function up(e){
    if(e.key !== "Escape") return;
    holding = false; if(raf) cancelAnimationFrame(raf); reset();   // 손 떼면 리셋
  }

  return {
    enable(){ window.addEventListener("keydown", down); window.addEventListener("keyup", up); },
    disable(){
      window.removeEventListener("keydown", down); window.removeEventListener("keyup", up);
      holding = false; if(raf) cancelAnimationFrame(raf); reset();  // 진행 중 홀드까지 완전 취소
    },
    reset,
  };
}
