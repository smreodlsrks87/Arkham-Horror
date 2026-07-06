/* =====================================================================
   scenario/state.js — 게임 공유 상태(S) 단일 저장소 + 이벤트버스(bus)
   여러 도메인(hand·piles·phases·doom·clues …)이 함께 읽고 쓰는 값을 모은다.
   각 값의 초기화는 scenario1 쪽(옛 선언 자리)에서 S.x = 초기값 으로 유지 → 중복 없음.
   도메인을 분리하면서 S가 점점 채워진다. (연산 없음, 값만 담는 상자)

   bus: 아주 작은 이벤트버스 — 모듈끼리 직접 import(순환 의존) 없이 "신호"로만 소통.
        예) phases.js: bus.emit("phase:upkeep")  →  scenario1: bus.on("phase:upkeep", …)
   ===================================================================== */
export const S = {};

const _listeners = {};
export const bus = {
  on(ev, fn){ (_listeners[ev] ||= []).push(fn); },
  emit(ev, data){ (_listeners[ev] || []).forEach(fn => fn(data)); },
};
