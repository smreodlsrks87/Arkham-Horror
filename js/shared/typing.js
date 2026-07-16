/* =====================================================================
   shared/typing.js — "한 글자씩 찍는" 타이핑 연출의 공용 코어.
   프롤로그(arkham_game: 여러 줄 누적)와 컷신(scenario1: 단일 자막)이
   같은 스텝 로직(글자당 간격·빈 줄 건너뛰기·타이머 취소·즉시노출 중단)을 쓴다.
   화면마다 다른 것(어디에 그리나 · 커서를 어디 붙이나)만 어댑터로 받는다.

   ※ 기록지(notzCampaignLog) 에필로그의 '펜 글씨'는 여기 넣지 않는다.
     글자 span 공개 + 펜 좌표 추적 + 연필 소리 루프 + 줄 사이 쉼으로
     연출 자체가 다른 물건이라, 합치면 옵션만 늘고 세 연출이 조용히 틀어진다.
   ===================================================================== */

// 총 시간이 주어지면 글자당 간격 = 총시간/글자수, 아니면 기본 속도(fallback).
export function perCharMs(totalMs, chars, fallback){
  return (totalMs && chars) ? (totalMs / chars) : fallback;
}

/* 줄 배열을 한 글자씩 찍는다. 빈 줄은 건너뛴다(빈 줄의 자리는 호출측이 미리 잡아둠).
   opts:
     lines     : string[]   찍을 줄들
     perChar   : number     글자당 ms
     write(i,t)            : 줄 i의 현재 텍스트 t를 그린다
     cursor(i)             : i>=0 이면 그 줄에 커서, i<0 이면 커서 제거(끝)
     stopped()  : boolean   true면 즉시 중단(스킵·즉시노출·화면 종료)
     timers     : number[]  setTimeout 핸들을 모아둘 배열(취소용)
     onEnd()               : 다 찍은 뒤(선택)
*/
export function typeLines({ lines, perChar, write, cursor, stopped, timers, onEnd }){
  let li = 0, ci = 0;
  const finish = ()=>{ cursor(-1); if(onEnd) onEnd(); };
  function step(){
    if(stopped && stopped()) return;
    while(li < lines.length && lines[li].length === 0) li++;   // 빈 줄 건너뜀
    if(li >= lines.length){ finish(); return; }
    cursor(li);                              // 현재 줄에 커서
    write(li, lines[li].slice(0, ci + 1));   // 글자 한 개 추가
    ci++;
    if(ci >= lines[li].length){ li++; ci = 0; }
    timers.push(setTimeout(step, perChar));
  }
  if(lines.some(l=>l.length)) step(); else finish();   // 찍을 글자가 없으면 바로 끝
}
