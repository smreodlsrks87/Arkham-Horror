# CLAUDE.md — 아컴호러식 카드게임 (개인 학습용)

이 문서는 **작업 방식과 목표 구조**를 적어 둡니다. 프로젝트 소개는 [README.md](README.md),
카드 효과 용어는 [card_schema_dictionary.md](card_schema_dictionary.md)를 따릅니다.

---

## 실행 방법 (빌드 없음)

외부 데이터·폰트·이미지를 `fetch` 하므로 **반드시 localhost로 연다.** `file://`는 안 됨.

```bash
python -m http.server 8000
# → http://localhost:8000/arkham_game.html   (시작 메뉴)
# → http://localhost:8000/scenario1.html     (게임판)
```

빌드 단계·번들러·npm 의존성을 **도입하지 않는다.** 브라우저 네이티브 ES 모듈만 쓴다.

---

## 지금 상태와 목표

- **지금:** `arkham_game.html`(~1200줄), `scenario1.html`(~2240줄)에 3D·카드·페이즈·
  컷신·파멸이 한 `<script>`에 통째로 있고, 두 파일이 공통 로직(스테이지 스케일·스킵
  게이지·타이핑·카드 텍스트 정리·툴팁)을 **복붙**해서 이미 미묘하게 달라졌다.
- **목표:** HTML은 마크업만 남기고, JS를 도메인별 ES 모듈로 쪼갠다. 공통 로직은
  `js/shared/`로 한 번만 정의해 두 화면이 함께 쓴다. 데이터(JSON)는 지금처럼 분리 유지.

---

## 목표 폴더 구조

```
Arkham-Horror/
├─ arkham_game.html          # 마크업 + <script type="module" src="js/menu/main.js">
├─ scenario1.html            # 마크업 + <script type="module" src="js/scenario/main.js">
├─ css/
│  ├─ tokens.css             # :root 색·폰트 변수 (두 화면 공통)
│  ├─ menu.css
│  └─ scenario.css
├─ js/
│  ├─ shared/                # ★ 두 화면이 공유 — 중복 제거 1순위
│  │  ├─ stage.js            # fitStage(), toStageX/Y() — 1920×1080 스케일·좌표변환
│  │  ├─ skip-ring.js        # ESC 길게 눌러 스킵(원형 게이지) 공용 컴포넌트
│  │  ├─ typing.js           # 타이핑 연출(프롤로그·컷신 공용)
│  │  ├─ card-text.js        # cleanText() 아이콘 토큰 → 한글/아이콘폰트 (한 벌로 통일)
│  │  ├─ tooltip.js          # 카드 호버 번역 툴팁
│  │  └─ arkham-db.js        # EN/KO API 상수 + 이미지 URL 빌더
│  ├─ data/
│  │  └─ load.js             # cards.json·notz_player_cards.json 로드, byCode/abilities 제공
│  ├─ menu/
│  │  ├─ main.js             # 메뉴 화면 부팅 엔트리
│  │  ├─ main-menu.js        # 메뉴 등장·클릭
│  │  ├─ deckbuilder.js      # 조사자 선택·덱빌딩·무작위 약점
│  │  └─ prologue.js         # 프롤로그 연출
│  └─ scenario/
│     ├─ main.js             # 게임판 부팅 엔트리 (아래 "부팅 순서" 참고)
│     ├─ state.js            # 게임 전역 상태 단일 객체 S + 이벤트버스 bus
│     ├─ map3d.js            # Three.js 씬·방·가구·계단·불장벽
│     ├─ pawn.js             # 조사자 말·이동·경유점(waypoint)
│     ├─ clues.js            # 단서 배치·조사 판정
│     ├─ investigator.js     # 세로형 조사자 카드 렌더
│     ├─ hand.js             # 손패·드래그 플레이·멀리건
│     ├─ piles.js            # 카드더미·버린더미
│     ├─ phases.js           # 페이즈 루프(신화→조사자→적→정비)
│     ├─ doom.js             # 파멸·의제 진행
│     ├─ tokens.js           # ★ 혼돈 주머니 — 표시·판정 단일 소스
│     ├─ encounter.js        # 조우덱 UI
│     ├─ cutscene.js         # 컷신 재생기
│     └─ log.js              # 로그
├─ cards.json                # "무엇인가" (ArkhamDB 원본 — 안 고침)
├─ notz_player_cards.json    # "어떻게 작동하는가" (직접 구조화)
├─ card_schema_dictionary.md
├─ images/ · fonts/ · cutscenes/
└─ CLAUDE.md
```

파일명(`arkham_game.html`, `scenario1.html`)은 **바꾸지 않는다**(북마크·기억 유지). 필요하면 나중에.

---

## 상태 관리 — 전역 변수를 단일 객체로

지금 `scenario1.html`은 `actionPoints`, `invResource`, `playerHand`, `currentPhase`,
`agendaDoom` 등 수십 개의 모듈 변수를 전역으로 둔다. 모듈로 쪼개면 이 공유 상태의
집이 필요하다. **프레임워크 없이** 다음 두 가지로 해결한다.

```js
// js/scenario/state.js
export const S = {                 // 하나의 가변 상태 객체
  actionPoints: 3, maxAP: 3,
  invResource: 5, invClue: 0,
  playerDeck: [], playerHand: [], playerDiscard: [], playedCards: [],
  currentPhase: "investigation",
  agendaDoom: 0, doomThreshold: 10, doomSources: [],
  chaosDifficulty: "normal",
  // ...
};

// 아주 작은 이벤트버스 (모듈 간 직접 의존 줄이기)
const listeners = {};
export const bus = {
  on(ev, fn){ (listeners[ev] ||= []).push(fn); },
  emit(ev, data){ (listeners[ev] || []).forEach(fn => fn(data)); },
};
```

- 모듈은 `S`를 읽고/쓴다. 렌더 함수는 `S`만 보고 화면을 그린다.
- **교차 관심사는 `bus`로**: 예) 신화 단계가 `bus.emit("doom:changed")` → `doom.js`가 갱신,
  단서 획득이 `bus.emit("clue:discovered")` → `phases`/진행조건이 반응.
  → `phases.js`가 `doom.js`를 직접 import 하지 않아도 됨(순환 의존 방지).

---

## 부팅 순서 (딜 레이스 버그 방지)

현재 `startScenarioIntro()`가 데이터 로드와 무관하게 800ms 뒤 딜을 시작해, 로드가 느리면
멀리건·컷신이 안 뜨고 멈춘다. **엔트리에서 로드를 await 한 뒤 시작한다.**

```js
// js/scenario/main.js
import { loadData } from "../data/load.js";
import { initMap } from "./map3d.js";
// ...
async function boot(){
  const data = await loadData();     // cards.json + notz + localStorage 덱
  initMap();
  initInvestigator(data);
  await dealOpeningHand();           // 로드 끝난 뒤에만 딜
  startOpeningCutscenes();
}
boot();
```

---

## 혼돈 주머니 — 단일 소스 (표시=판정 버그 방지)

지금은 판정용 `CHAOS_BAG` 배열과 화면용 `CHAOS_BAGS` 객체가 따로라 서로 다르다.
`tokens.js`에서 **난이도별 구성 하나만** 정의하고, 화면 렌더와 `drawChaosToken()`이
**같은 데이터**를 쓴다. 심볼 토큰(해골·석판 등) 효과도 여기서 데이터로 관리
(스키마의 "선결 과제 1: 토큰 N개 뽑기" 참고).

---

## Three.js

`three.min.js`(r128, UMD)를 `<script>`로 먼저 불러 전역 `THREE`로 쓰거나,
importmap으로 ESM 버전을 매핑한다(권장이지만 선택). 어느 쪽이든 CDN 유지, 버전 고정.

---

## 데이터 원칙 (유지)

- `cards.json` = 무엇인가(이름·클래스·비용·능력치·특성·약점여부·텍스트). **수정 금지.**
- `notz_player_cards.json` = 어떻게 작동하는가(abilities·zone·keywords). 여기만 채운다.
- 폭로(Revelation) 판별은 text 검색이 아니라 **`on_draw` 유무**로 한다.
- 효과 용어는 `card_schema_dictionary.md`를 따른다. 새 용어는 거기 먼저 등재.

---

## 마이그레이션 순서 (한 번에 다시 쓰지 말 것)

**매 단계마다 http.server로 열어 동작 확인 후 다음 단계로.**

1. `css/tokens.css`로 `:root` 변수를 뽑아 두 HTML에서 링크.
2. `js/shared/` 유틸부터 추출(중복 제거 우선: `stage`·`skip-ring`·`typing`·`card-text`·`tooltip`).
   두 HTML이 **같은 파일**을 쓰게 해 드리프트 제거.
3. `js/data/load.js`로 로딩·`byCode`·`cardAbilities`를 이관.
4. `scenario`를 도메인별로 하나씩 분리(map3d → hand/piles → phases → doom → tokens → cutscene → encounter → log).
5. `state.js` 도입 → 전역 변수를 `S`로, 교차 호출은 `bus`로.
6. 분리하는 과정에서 알려진 버그(주머니 통합·부팅 순서·빈 컷신 okDelay·조우덱 객체공유 등)를 함께 반영.

---

## 컨벤션

- 한글 주석·한글 UI 유지(기존 톤).
- 작은 커밋, 작은 단계. 큰 재작성 금지.
- 새 함수는 "데이터 + 처리기 하나" 원칙(카드별 함수 남발 X, 값으로 분기).
- 사용자가 요청하기 전엔 커밋·푸시하지 않는다.
