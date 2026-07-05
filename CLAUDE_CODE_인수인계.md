# 아컴호러 카드게임 프로젝트 — Claude Code 인수인계 문서

> 이 문서는 웹 채팅에서 진행하던 작업을 **Claude Code로 넘기기 위한 인수인계서**다.
> Code는 이전 대화 기억이 없으므로, 이 문서 + `제작자 프로필` + 아래 규칙으로 이어간다.
> **작업 시작 전 이 문서와 아래 파일들을 먼저 읽을 것.**

---

## 0. 가장 먼저 — 제작자와 작업 방식 (반드시 지킬 것)

- **제작자는 코딩 입문자다.** 코드를 직접 못 짜고, 설명을 보고 이해하는 수준.
  기술 선택(구조·최적화)은 Claude가 알아서 챙기고, 제작자는 "무엇을·얼마나 크게"를 정한다.
- **답변은 한국어로.**
- **한 번에 작은 기능 하나씩.** 전체를 한꺼번에 만들지 않는다.
- 코드 추가/수정 시 **무슨 일을 하는지 이해되게 설명**한다. 구조를 바꾸면 "왜?"를 짧게.
- **쓸데없는 인사말 금지.** "지침 받았어요" "반영했어요" 같은 말 하지 말 것. 바로 본론.
- 결과가 이상하면(버그·느림) 제작자가 피드백하니 같이 고친다.
- **제작자가 설계를 제안하면, 재도출하지 말고 그게 맞는지 확인 후 구현한다.**
  (과거에 Claude가 혼자 납득하고 시작해 재작업을 유발한 적 많음 → 지양)
- **버그는 한 곳씩 임시로 막지 말고 근본 원인을 고친다.** (예: 개별 클릭 지점이 아니라
  "구간 전체 잠금"으로.)

---

## 1. 프로젝트 개요

- **장르:** 아컴호러(LCG)식 협력 카드게임. 원작 완전복제 X. **축소판 + 자작 시나리오.**
- **스택:** HTML/JS/CSS + Three.js(r128, cdnjs). 카드 UI는 DOM, 맵은 3D.
- **데이터 소스:** ArkhamDB (`https://ko.arkhamdb.com` 한글 텍스트 / `https://arkhamdb.com` 영문 이미지).
  카드 텍스트·이미지 저작권은 FFG/코리아보드게임즈 → **개인 학습용만**. 배포 시 자작 카드 권장.
- **저장:** localStorage.
- **최종:** Electron + electron-builder(NSIS)로 .exe 포장(마지막 단계).

### 핵심 설계 원칙 (제작자 프로필과 일치 — 반드시 따를 것)
1. **데이터 · 엔진(로직) · 화면 3분리.** 엔진은 화면을 모르고, 화면은 상태를 읽기만.
2. **게임상태(hp·위치·소지) vs 화면상태(애니메이션·호버) 분리** → 저장이 쉬워짐.
3. **"if문 뭉치" 대신 "데이터 목록 + 처리기 하나".** 콘텐츠 추가 시 엔진을 안 건드림.
4. **계산과 연출 분리.** 결과를 먼저 정하고 보여주기는 나중에(tween).
5. **최적화는 느려질 때 도입.** 미리 복잡하게 하지 않는다.

---

## 2. 개발 환경 제약 (중요)

- **로컬 서버 필수:** cards.json·notz_player_cards.json·폰트·이미지를 fetch하므로
  반드시 `python -m http.server 8000` 또는 `npx serve`로 열어야 함. `file://` 직접 열기 금지.
- **제작자 게임 폴더:** `C:/Users/smreodlsrks/Desktop/Arkham Horror/`
- **캐시 주의(만성 문제):** 수정 후 확인 안 되면 **Ctrl+Shift+R**(하드 리프레시). 흔한 착오 원인.
- **JS 변수 충돌 금지:** `top` `name` `length` `location` `event` `focus` `key`는 브라우저 전역과
  충돌 → 절대 변수명으로 쓰지 말 것. 편집 후
  `grep -cE '(const|let|var)\s+(top|name|length|location|event|focus)\b'` → 0이어야 함.
- **CSS 중복 셀렉터 버그(만성):** 파일 아래쪽의 옛 CSS 블록이 새 스타일을 덮어씀(나중 것이 이김).
- **인라인 `style="display:none"`이 CSS 클래스를 이김(만성).**
- **문법 검사(네트워크 불필요):**
  ```
  python3 -c "import re; s=open('scenario1.html').read(); big=max(re.findall(r'<script>(.*?)</script>',s,re.S),key=len); open('/tmp/game.js','w').write(big)"
  node --check /tmp/game.js
  ```
- 브라우저 `<input type="color">`는 페이지를 멈추게 함 → 쓰지 말 것.

---

## 3. 파일 구조 (게임 폴더에 있어야 하는 것)

### 실제 게임 파일 (현역)
- **`arkham_game.html`** (~1200줄) — 메인 메뉴 → 플레이어 수 팝업(현재 1인 고정)
  → 덱빌더 → 프롤로그. 덱을 `localStorage("arkham_decks")`, 난이도를 `arkham_difficulty`,
  플레이어 수를 `arkham_playercount`에 저장 후 `scenario1.html`로 이동.
- **`scenario1.html`** (~2850줄) — **메인 게임판.** 3D 맵, 카드, 컷신, 막/의제, 판정 전부.
  이 문서의 "4. 핵심 시스템"이 전부 여기 있음.
- **`cards.json`** — 카드 데이터(제작자가 /uploads에 올린 것, **301장**: core 185 + rcore 116).
  "카드가 무엇인가"(type/subtype/faction/name/cost/enemy스탯/traits/text). scenario1이 `byCode{}`로 로드.
- **`notz_player_cards.json`** — 카드 **효과** 데이터. "카드가 어떻게 작동하는가"(abilities/키워드).
  scenario1이 `cardAbilities{}`로 로드. (아래 "5. 카드 효과 데이터" 참고)
- **`images/`** — devil.png, encounter_back.png, player_back.png, ability.png, resource.png,
  clue.png, investigators/…
- **`fonts/`** — `arkham-icons.ttf`(ArkhamIcons: 아이콘+숫자. 숫자 0-9 직접 나옴.
  의지=`a` 지식=`f` 전투=`d` 민첩=`s`). **한글은 본명조(Noto Serif KR, 구글폰트 링크)로 통일**
  — `arkham-kr.ttf`는 더 이상 안 씀(코드에서 제거됨).
- **`cutscenes/`** — `<id>.mp4`(무음), `<id>.mp3`(소리). 컷신 id는 아래 참고.
- **`README.md`, `.gitignore`** — GitHub용.

### 폐기 예정 도구 파일 (게임과 무관, 정리 대상)
card_filter, card_view, deckbuilder, deckbuilder_step1, fetch_cards, font_check,
investigator_crop_editor, investigator_hp_editor, investigator_viewer, location_editor,
map2_B_3d, map_editor, notz_cards, study_3d, timing_tagger — 개발 중 쓴 편집기/뷰어들.

### 참고 문서
- **`card_schema_dictionary.md`** — 카드 효과 데이터의 한글→영문 용어 사전(A~L 섹션). 카드 만들 때 기준.
- **제작자 프로필 md** — 제작자가 누구이고 뭘 할 줄 아는지(별도 첨부).

---

## 4. scenario1.html 핵심 시스템 (완성됨)

### 4-1. 페이즈 루프
- `PHASES = ["mythos","investigation","enemy","upkeep"]`, `currentPhase`, `setPhase(ph)`.
- 조사자 단계(investigation)에서만 맵 조작 가능. `setPhase`가 조사자 단계 아니면
  차례종료 버튼·이야기진행 버튼을 자동 숨김.
- `startInvestigatorPhase()` — 조사자 단계 정식 시작(setPhase + 행동력 MAX_AP + phaseBusy=false).
- `MAX_AP=3`, `actionPoints`, `invResource=5`.

### 4-2. 입력 잠금 (busy) — 근본 구조 (중요)
- **`phaseBusy` 기본값 = true**(게임 시작부터 잠김). **조사자 단계 정식 시작 때만 풀림.**
- 원칙: **"조작 가능 = 조사자 단계 중"**. 나머지(시작~도입컷신, 막 전환 틈 등)는 전부 잠김이 기본.
- `clickWorld`·`askInvestigate`·`doInvestigate` 모두 시작에서
  `if(csActive || phaseBusy || currentPhase!=="investigation") return;` 로 방어.
- **`cancelAllMapActions()`** — 진행 중이던 이동·조사 예약(walkTo/pendingInvestigate/pawnMoving) +
  열린 팝업(hidePopup)을 전부 취소. 컷신 시작 때 호출(손 빠른 클릭 대응).

### 4-3. 컷신 시스템 + 묶음 잠금 (중요)
- `CUTSCENES{}` 데이터. 각: `{text, typeMs(타이핑 시간), okDelayMs("아무 키나" 뜨는 시간)}`.
- `cutscene-text` CSS는 `white-space:pre-line` → 텍스트의 `\n`이 실제 줄바꿈으로 표시됨.
- **모든 mp4 무음**(csVideo.muted). 소리는 mp3(csAudio)로만.
- 컷신 끝에 버튼 대신 **"— 계속하려면 아무 키나 누르세요 —"** 깜빡임. 아무 키/클릭으로 진행.
  (문구는 "누르세요"로 통일. "누르십시오"는 안 씀.)
- **`playCutsceneSequence(ids, onAllDone, gapMs, afterFirst)`** — 여러 컷신을 하나의 잠금 단위로.
  - 묶음 시작 → phaseBusy=true. 컷신 사이 간격에도 잠금 유지(틈 안 뚫림).
  - `afterFirst` — 첫 컷신 끝난 직후 훅(의제 파멸 처리·막 맵이동 등).
  - `onAllDone` — 묶음 끝. 여기서 조사자 단계 복귀시켜 잠금 해제.
- **`playCutscene(id, onEnd)`** — 개별 컷신. 시작 시 cancelAllMapActions + phaseBusy=true.
  끝나면 onEnd 호출(잠금 해제는 안 함 — 묶음이 관리).
- **`resumeInvestigationAfterCutscene()`** — 컷신 후 조사자 단계 복귀.
  - 이미 조사자 단계면: 잠금만 해제(행동력 유지).
  - 다른 단계(신화 등)에서 전진한 것이면: `startInvestigatorPhase()` 정식 시작(행동력 회복).
  - ⚠️ 이 분기가 핵심. 잠그기만 하고 복귀를 빠뜨리면 게임이 멈춤(과거 버그).

- **컷신 id 목록:** agenda1a/1b/2a/2b/3a/3b, act1a/1b/2a/2b/3a/3b (12개). 텍스트·타이밍 전부 채워짐.

### 4-4. 막(Act) 시스템 — 데이터 + 처리기 (완성)
```
let currentAct = 0;   // beginAct(n)으로 세팅
const ACT_STAGES = {
  1: { goal:"서재에서 단서(N)를 모아라", locationKey:"study",   clueMult:2, killTarget:null },
  2: { goal:"복도에서 단서(N)를 모아라", locationKey:"hallway", clueMult:3, killTarget:null },
  3: { goal:"구울 사제를 쓰러뜨려라!",   locationKey:null, clueMult:0, killTarget:"ghoul_priest" },
};
```
- 필요 단서 = `playerCount(a) × clueMult`. (N)은 실제 숫자로 치환돼 목표에 표시.
- **핵심 함수:**
  - `cluesAtLocation(roomKey)` — 그 장소 조사자들의 단서 총합(지금 1인 → `cur===roomKey`면 invClue).
  - `actCluesNeeded()` — a × 배수.
  - `advanceConditionMet()` — 총합 ≥ 필요수? (killTarget형은 false, 별도 처리).
  - `checkActCondition()` — **버튼만** 표시/숨김(팝업 X). advanceReady 갱신.
  - `maybeShowAdvanceTip()` — 진행 안내 팝업. **1막에서 딱 한 번만**(초보자 조작 팁, actTipShown).
  - `beginAct(n)` — 막 시작: 목표 표시 + 조건 체크.
  - `removeCluesEvenly(roomKey, count)` — 단서 공평 제거(라운드로빈: 한 개씩 번갈아 → 자동 균등).
    지금 1인이라 invClue에서만. `holders[]` 배열 구조 → 다인 확장 대비.
- **진행 흐름:**
  - 게임 시작 → 목표 "—". 도입 컷신(agenda1a→act1a) 끝 → startInvestigatorPhase + beginAct(1).
  - 1막: 서재 단서 a×2 → 진행버튼 → `advanceToMansion()`:
    단서 제거 → `[act1b,act2a]` 묶음(afterFirst에서 저택 등장·복도 이동) → beginAct(2).
  - 2막: 복도 단서 a×3 → 진행버튼 → `advanceToAct3()`:
    단서 제거 → `[act2b,act3a]` 묶음 → beginAct(3).
  - 3막: `defeatGhoulPriest()`(적 처치 시 호출, **지금은 뼈대**) → `[act3b]` → 시나리오 해결(TODO).
- **진행 버튼(advanceBtn):** 클릭 시 currentAct에 따라 분기(1→mansion, 2→act3).
  클릭 시에도 `currentPhase==="investigation" && !phaseBusy && !csActive` 확인.

### 4-5. 조건 재검사 — 관문 방식 (중요, 제작자 설계)
조건 체크를 "행동"이 아니라 **값이 바뀌는 관문**에 붙임 → 빈틈 없음.
- **단서 변경 관문:** `changeClue(delta)` → `onClueChanged()` → checkActCondition.
  조사·소비·(향후)조우·약점 등 단서가 바뀌는 모든 게 이 관문을 지남. **invClue 직접 수정 금지.**
- **위치 변경 관문:** 모든 방 이동이 `focusRoom(k)`를 거침(방 클릭→도착→focusRoom).
  focusRoom 끝에서 checkActCondition 호출. 복도 출입·(향후)강제 이동도 이걸 쓰면 자동 체크.

### 4-6. 의제(Agenda, 파멸) 시스템 (완성)
- `doomThreshold` 시작 3. `AGENDA_STAGES = {3:{cutscene:"agenda1b",next:7,follow:"agenda2a"},
  7:{...agenda2b,next:10,follow:"agenda3a"}, 10:{...agenda3b,next:null,follow:null}}`.
- 신화 단계(`runMythosPhase`)에서 파멸 +1 → `checkAgendaAdvance()` → 임계치 도달 시 `advanceAgenda()`.
  **의제가 전진하면(advanced=true) runMythosPhase는 조사자 단계 전환을 하지 않고 return**
  (컷신 묶음이 복귀 담당 — 안 그러면 컷신 전에 조사자 단계가 돼 조작 틈 생김).
- `advanceAgenda()`: phaseBusy=true → updateDoom(구슬 채움) → **2초 대기(구슬 보여줌)** →
  `[Xb, (X+1)a]` 묶음(afterFirst에서 clearAllDoom+임계치 상승) → onAllDone에서 resume.
- **룰 근거(웹 확인):** 막/의제는 양면 카드. a면=현재상황+전진조건, b면=효과.
  "Xb 실행 → (X+1)a"가 고정(마지막 b 제외 = 시나리오 종료). per_investigator = 조사자수×N.

### 4-7. 판정 (조사)
- 조사: `(지식 INTELLECT + 혼돈토큰) vs 은폐도(shroud)`. 성공 시 단서 +1(changeClue(1)).
- 혼돈 토큰 주머니: 난이도별 구성(normal/hard). `arkham_difficulty`로 선택.

### 4-8. 로딩 화면
- `boot()` IIFE: loadPlayerDecks → runLoading(이미지·미디어 프리로드) → 최소 2초 게이지 →
  waitForContinue(아무 키). 하단에 **주술적 불꽃 SVG 게이지**(주황→빨강, 끝만 살짝 자홍,
  불티에 보라 색감). 제목 "광신도의 밤"(광기 보라 #b89ac8) + "episode 1. 회합".

### 4-9. 3D 맵 (Three.js r128)
- `ROOMS{}` — 방 데이터(study=서재, hallway=복도, attic, cellar, parlor 등). 좌표·색·shroud·clues·stage.
- `currentStage`(study/mansion), `cur`(현재 방). `setStageVisible(stage)`로 맵 전환.
- 이동: 방 클릭 → doMove → pawnMoving(경로) → 도착 시 focusRoom. 방 안 걷기 → walkTo.
- 단서 토큰: 방 바닥에 clues 개수만큼. clueMeshes[]. 클릭 → startInvestigate → 걸어가서 조사.
- `fireBarrier`(응접실 불 장벽), `unlockParlor()`(2막 장벽 해제 — 지금 준비만).

---

## 5. 카드 효과 데이터 시스템 (`notz_player_cards.json`)

### 원칙 (card_schema_dictionary.md에 상세)
- **cards.json = "카드가 무엇인가"** (type/subtype/faction/name/cost/enemy스탯/traits/text).
- **notz_player_cards.json = "카드가 어떻게 작동하는가"** (abilities + 구조화 키워드). **겹치지 않음.**
- 약점 여부는 cards.json의 `subtype_code`("weakness"/"basicweakness")로 판단. 우리 파일 X.
- 적 스탯·traits·type은 cards.json에서 읽음. 우리 파일에 중복 저장 X.

### 핵심 스키마 결정 (반드시 지킬 것)
- **"폭로(Revelation)"는 텍스트 검색으로 판단 금지**(오탐). 대신 **우리 파일의 `on_draw` 존재**로 판단.
  - `on_draw:"spawn_enemy"` = 뽑으면 적 소환. `on_draw:"resolve_and_discard"` = 즉시 효과 후 버림.
  - `on_draw:"put_into_play"` = 자산처럼 놓임(위협 등).
- **`zone:"threat"`** = 같은 played-cards 목록의 필터 태그(별도 영역 X). 빨간 테두리 발광.
  위협 영역 카드의 활성 능력은 같은 장소 아무 조사자나 발동 가능(engine이 zone 태그로 처리).
- **취소 가능이 기본** — 예외만 `no_cancel:true`. 취소 카드는 `can_cancel:"on_draw_effect"`.
- **cost(cards.json) ≠ requires(우리 파일):** cost=얼마(cards.json), requires=발동 가능 여부 게이트(우리 파일).
  둘 다 유지. 예: 보로의 진 cost:1(cards.json) + requires:{resources:">=1"}(우리 파일).
- **페널티는 bonus의 음수값**으로(별도 페널티 처리기 X).
- **fast 판단은 우리 데이터의 `timing:"fast"`로**(cards.json 텍스트 X).
  `hasFastAbility(code)` = abilities에 timing:"fast" 있나. 없으면 행동 1 소모(정상).
- **fast 룰(웹 확인):** `when` 있는 fast(예: 보호의 진)는 조건 충족 시 어느 페이즈든 발동.
  `when` 없는 fast 자산(총 등)은 자기 턴(조사 페이즈)에만. tryPlayCard가 이를 구분.

### 현황
- **Roland 덱(rcore) 진행 중:** Guardian 16/16 완료. Seeker 0/16 대기(01530-01543,01685,01686).
  Neutral: 01598,01596만 완료. (01558-01571,01690은 Mystic이라 Roland 사용 불가.)
- **작업 방식:** 한 장씩, 0레벨(XP 없는) 먼저. cards.json+웹으로 효과 확인 → 만들기 →
  제작자 확인 → 저장 → 사전(card_schema_dictionary.md) 갱신.
- 완료된 대표 카드: 01603(고지식한 탐정/약점적), 01598(귀신이 들리다/위협),
  01596(기억상실/폭로), 01565(보호의 진/취소).

---

## 6. 남은 작업 (우선순위)

### A. 지금 이어서 할 것 — 카드 제작 (Code의 주 임무)
- Seeker 16장 + 남은 Neutral 카드 효과 데이터 작성(notz_player_cards.json).
  한 장씩, 0레벨 먼저. card_schema_dictionary.md 규칙 준수. 만들 때마다 사전 갱신.

### B. 카드 효과 엔진 (처리기) — 아직 없음, 큰 작업
카드 데이터는 있지만 실제로 실행하는 엔진이 없음. 필요한 처리기:
- 토큰 N개 뽑기, resolve_and_discard(효과 후 버림), 폭로 팝업(pick 1 keep 등),
  타이밍 윈도우(can_cancel/on_draw), hunter 이동, prey 타겟팅, spawn_enemy,
  blank_text, put_into_play, zone:threat 활성화, bonus 상시 수정치.
- **조조전 이벤트 시스템(when/do + 처리기 하나) 패턴 재사용** — 제작자가 이미 익힌 구조.

### C. 페이즈 실전 로직 — 아직 뼈대
- 적 공격, 정비 단계, 신화 단계 조우 드로우. **구울 사제 적** 구현
  → `defeatGhoulPriest()` 연결(현재 콘솔에서만 호출 가능).
- 다인 확장: invClue를 배열로(cluesAtLocation·removeCluesEvenly는 이미 holders[] 구조).

### D. 마무리
- act3b 이후 시나리오 해결(승/패 분기·캠페인 로그·다음 시나리오 이월).
- 로딩 최적화(현재 카드 프리로드를 시나리오 필요분만으로).
- 폐기 도구 파일 삭제.
- Electron .exe 포장(마지막).

### E. 결말 텍스트
- 광신도의 밤(Night of the Zealot) 공식 캠페인 가이드(영문):
  `https://images-cdn.fantasyflightgames.com/filer_public/d6/2c/d62c2eb4-fe03-4a40-993c-af3239212d8b/ahc01_campaign-guide.pdf`
  (18쪽~ The Midnight Masks. 개인 학습용, 제작자 게임엔 직접 번역·각색 권장.)

---

## 7. 편집 후 체크리스트 (매번)
1. 문법: 위 2번의 `node --check` 방법으로 확인.
2. 변수 충돌: `grep -cE '(const|let|var)\s+(top|name|length|location|event|focus)\b' scenario1.html` → 0.
3. str_replace 후 이전 view는 낡음 → 재수정 전 다시 view.
4. 제작자에게 파일 주고 → localhost + Ctrl+Shift+R로 확인 요청.
5. GitHub: 작업 단위마다 커밋(Code가 직접 git 커밋 가능 — 커밋 습관 들이는 중).

---

## 8. GitHub
- 제작자는 GitHub Desktop으로 push해왔음(공개 저장소). Code로 넘어가면 Code가 직접 커밋·푸시.
- 커밋 메시지는 작업 단위로("로딩화면 불꽃 게이지 추가" 등).
