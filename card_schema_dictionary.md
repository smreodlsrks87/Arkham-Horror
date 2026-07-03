# 카드 효과 용어 대응표 (한글 → 영어) — 검토용 초안

> 광신도의 밤 30장에 쓰인 한글 키·값을 아컴 표준 영어 용어로 옮긴 초안입니다.
> **확정 아님.** ✅=확실 / ⚠️=검토 필요(뜻이 애매하거나 영어가 여러 후보). 수정해서 알려주세요.
> 확정되면 이 표대로 30장을 자동 변환하고, 앞으로 86장도 이 용어로 채웁니다.

---

## A. 능력치 (skills) — ✅ 확실
| 한글 | 영어 | 뜻 |
|---|---|---|
| 의지 | willpower | 의지력 |
| 지식 | intellect | 지식 |
| 전투 | combat | 전투 |
| 민첩 | agility | 민첩 |

## B. 효과 구조 키 (ability 뼈대)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 효과 | effect | 무슨 효과인지 | ✅ |
| 대상 | target | 효과가 향하는 대상 | ✅ |
| 값 | value | 수치(개수·양) | ✅ |
| 개수 | count | 대상 장수(값=효과수치와 별개) | ✅ |
| 조건 | condition | 발동 전제 조건 | ✅ |
| 조건부 | conditional | {if:조건, then:효과} — if면 then 실행 | ✅ |
| 보너스 | bonus | 능력치 보너스 | ✅ |
| 페널티 | penalty | 능력치 감소 | ✅ |
| 처리(키) | method | 처리 방식을 담는 키 (값: place_in_chosen_order 등) | ✅ |
| 결과처리 | on_result | {none, one, many} 개수별 분기 | ✅ |
| 성공시 | on_success | 판정 성공 시 | ✅ |
| 실패시 | on_failure | 판정 실패 시 | ✅ |
| 이후 | then | 그다음에 | ✅ |
| 해결 | resolve | 해결 순서(값은 조우시스템에서) | ✅ (키만 확정) |
| 추가효과 | extra_effect | 딸린 추가 효과 | ✅ |
| 택1 | choose_one | 여럿 중 하나 선택 | ✅ |
| 선택 | choice | 선택 방식(resolve_one_ignore_rest 등) | ✅ |
| 대상선택 | target_choice | 대상을 고르는 것 | ✅ |

## C. 비용·제약 (cost / limit)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 비용 | cost | 지불 비용 | ✅ |
| 소모 | spend | 충전/탄약 등 소모 | ✅ (uses 소모) |
| 소진 | exhaust | 카드 소진(눕힘) | ✅ |
| 최대 | max | 최댓값 | ✅ |
| 최소 | min | 최솟값 | ✅ |
| 범위(판정기간) | scope | this_test 등 판정 지속 범위 | ✅ B안:키분리 |
| 범위(덱) | deck_range + count | 덱 위 N장 (deck_range:"top" + count) | ✅ B안:키분리 |
| 범위(장소) | location_range | your_location_or_connected 등 장소 범위 | ✅ B안:키분리 |
| 슬롯추가 | add_slot | 슬롯 추가 | ✅ |
| 비면버림 | discard_if_empty | 비면 버림 | ✅ |
| 버린다 | discard | 버리기 | ✅ |
| 찾기 | search | 찾기(태그) | ✅ |
| 출처 | from | 자원 등을 가져오는 출처(self_secret) | ✅ |
| 내용 | detail | 페널티 등의 세부 내용 | ✅ |
| 기록 | store | 나중 참조용 저장(store→나중에 씀) | ✅ |
| 능력치대체 | replace_skill | {agility:willpower} 판정 능력치 교체 | ✅ |
| 테스트능력치 | test_skill | 판정에 쓰는 능력치 | ✅ |
| 피해설정 | damage_setup | {on_success, on_failure} 별 피해량 | ✅ |

## D. 피해·회복 (damage / heal)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 피해 | damage | 피해 | ✅ |
| 공포 | horror | 공포 | ✅ |
| 추가피해 | extra_damage | 추가 피해 | ✅ |
| 자해 | self_damage | 자신이 받는 피해/공포 | ✅ |
| 회복 | heal | 회복 | ✅ |
| 행동상실 | lose_action | 행동 상실 | ✅ |
| 비전 | arcane | 비전 슬롯 | ✅ (arcane) |

## E. 효과 값들 (effect의 실제 내용)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 단서획득 | discover_clue | 단서 발견/획득 | ✅ |
| 자원획득 | gain_resources | 자원 획득 | ✅ |
| 자원이동 | move_resources | 자원 이동 | ✅ |
| 충전추가 | add_charge | 충전 추가 | ✅ |
| 탄약추가 | add_ammo | 탄약 추가 | ✅ |
| 전투판정실행 | do_fight | 전투(교전) 판정 실행 | ✅ |
| 회피실행 | do_evade | 회피 판정 실행 | ✅ |
| 추가행동 | extra_action | 추가 행동 | ✅ |
| 조우카드뽑기 | draw_encounter | 조우 카드 뽑기 | ✅ |
| 덱검색 | search_deck | 덱 검색 | ✅ |
| 덱들여다보기 | look_at_deck | 덱 들여다보기 | ✅ |
| 덱셔플 | shuffle_deck | 덱 섞기 | ✅ |
| 파멸배치 | place_doom | 파멸 배치 | ✅ |
| 토큰공개수변경 | change_token_count | 뽑는 토큰 개수 변경 | ✅ |
| 취소 | cancel | 취소 | ✅ |
| 취소량 | cancel_amount | 취소량 | ✅ |

## F. 대상·조건 값들 (target / condition)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 현재장소 | your_location | 현재 장소 | ✅ (이미 영어 병용) |
| 대상장소 | target_location | 대상 장소 | ✅ |
| 장소선택 | choose_location | 장소 선택 | ✅ |
| 장소에_단서있음 | location_has_clue | 장소에 단서 있음 | ✅ |
| 장착중 | is_equipped | 장착 중 | ✅ |
| 내장소의_적_하나 | enemy_at_your_location | 내 장소의 적 하나 | ✅ |
| 공격한_적 | attacking_enemy | 공격한 적 | ✅ |
| 회피한_적 | evaded_enemy | 회피한 적 | ✅ |
| 그_공격 | that_attack | 그 공격 | ✅ |
| 공격대상이_나와_교전중인_유일한_적 | only_enemy_engaged_with_you | 나와 교전 중인 유일한 적 | ✅ |
| 그_적과_교전중인_아군 | ally_engaged_with_that_enemy | 그 적과 교전 중인 아군 | ✅ |
| 그_조사자 | that_investigator | 그 조사자 | ✅ |
| 내장소의_조사자 | investigator_at_your_location | 내 장소의 조사자 | ✅ |
| 내장소의_조사자나_동료 | investigator_or_ally_at_your_location | 내 장소의 조사자/동료 | ✅ |
| 소유자 | owner | 소유자 | ✅ |
| 대상장소_모든_적과_조사자 | all_at_target_location | 대상 장소의 모든 적·조사자 | ✅ |
| 피해_공포 | damage_and_horror | 피해와 공포 | ✅ |
| 내가_통제한_주문자산 | spell_asset_you_control | 통제 중인 주문 자산 | ✅ |
| 내장소_조사자의_firearm자산 | firearm_at_your_location | 내 장소 조사자의 총기 자산 | ✅ |
| 아무_조사자덱_또는_조우덱 | any_player_or_encounter_deck | 아무 조사자/조우 덱 | ✅ |

## G. 판정 관련 값들 (test)
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 성공시 | on_success | 성공 시 | ✅ (B와 중복 정리) |
| 실패차이 | fail_by | 실패한 차이 | ✅ |
| 성공초과분 | success_by | 성공 초과분 | ✅ |
| 이번테스트 | this_test | 이번 판정 | ✅ |
| 테스트성공 | test_succeeded | 판정 성공(if 조건) | ✅ |
| 테스트가_공격이고_성공 | attack_test_succeeded | 공격 판정 성공 | ✅ |
| 이번판정에_특수토큰공개 | special_token_this_test | 이번 판정에 특수토큰 공개(여러 토큰 각각 검사) | ✅ |
| your_location_clues | (그대로) | 현재 장소 단서 수 | ✅ 이미 영어 |
| self_horror_count | (그대로) | 내 공포 수 | ✅ 이미 영어 |

## H. 덱·토큰 처리 값들
| 한글 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 자동뽑기 | auto_draw | 자동으로 뽑음 | ✅ |
| 뽑지않음 | no_draw | 뽑지 않음 | ✅ |
| 팝업선택 | popup_choice | 팝업으로 선택 | ✅ |
| 덱위3장 | top_of_deck + count | 덱 위 N장 (count로 개수, 변수 대응) | ✅ (count 분리) |
| 원하는순서로_되돌리기 | return_in_any_order | 원하는 순서로 되돌림 | ✅ |
| 공개토큰중_하나_해결_나머지_무시 | resolve_one_ignore_rest + pick | 뽑은 토큰 중 기준(pick:best/worst 등)으로 하나 해결 | ✅ (pick 값 필요) |
| 초과시_취소대상_고르기 | choose_cancel_target | 취소량이 초과할 때 취소 대상 선택(손패 초과 아님) | ✅ |
| 키워드와_폭로_먼저 | (보류) | 조우 처리 순서 규칙 — 엔진 조우처리기에서 다룸 | ⏸ 보류 |
| 본카드에_Terror나_Omen_있음 | has_terror_or_omen | 이 카드에 Terror/Omen 있음 | ✅ |
| 그_음모의_폭로효과 | treachery_revelation | 조우(음모) 카드의 폭로 효과 | ✅ |

## I. 이미 영어인 것들 (그대로 유지 — 참고)
when, do, timing, limit, requires, uses, signals, count, type,
ammo, charge, secret, supply, resources, action, fast, reaction, elder_sign,
your_location, your_location_or_connected, self, if, Spell, Terror, Omen, firearm

---

## 검토 요청 사항 — 답변 반영됨

**확정된 것 (제작자 승인):**
- 자해 → `self_damage`
- 토큰공개수변경 → `change_token_count`
- 긴 대상 이름들 → 서술형 영어 그대로 유지 (only_enemy_engaged_with_you 등)
- 그_음모의_폭로효과 → `treachery_revelation` ("그" 특정 생략)
- 덱위3장 → `top_of_deck` + `count` 분리 (변수 개수 대응)
- 초과시_취소대상_고르기 → `choose_cancel_target` (손패 초과 아님, 취소량 초과)

**⏸ 보류 (나중에 결정):**
- B(효과구조)·C(비용제약) 그룹의 애매한 키들 → **상태 ⚠️인 함수를 쓰는 카드들을 실제로 보고** 결정
- keywords_and_revelation_first → 조우 시스템 만들 때 엔진 조우처리기에서 다룸

**🔑 이 대응표가 드러낸 "선결 과제" (엔진 만들 순서):**
1. **토큰 N개 뽑기 함수** — resolve_one_ignore_rest, special_token_this_test 등이 이걸 전제로 함.
   먼저 "혼돈토큰 여러 개를 배열로 뽑기"가 되어야, 그 위에 "하나 고르기/각각 검사"가 얹힘.
2. **선별은 함수를 여러 개 만들지 말고 기준(pick)을 데이터로** — resolve_one_ignore_rest에
   `pick:"best"/"worst"/특정심볼` 값을 줘서 처리기 하나가 기준만 바꿔 처리. (데이터+처리기 하나 원칙)
3. **범위·개수는 분리** — top_of_deck + count 처럼, "무엇을"과 "몇 개"를 나눠 변수 대응.


---

## J. 적 · 약점 관련 (01603 고지식한 탐정에서 추가)

> 첫 "적 약점" 카드에서 나온 용어들. 능력치·특성·약점여부는 cards.json에서 읽고,
> 아래는 우리가 "동작 방식"으로 구조화한 것.

| 키/값 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 뽑을때처리 | on_draw | 뽑을 때 어떻게 처리하나 | ✅ |
| 적등장 | spawn_enemy | 뽑으면 적이 게임판에 등장(손패 아님). ※폭로 아님 | ✅ |
| 키워드 | keywords | hunter 등 엔진용 구조화 키워드 | ✅ |
| 사냥꾼 | hunter | 적 페이즈에 가까운 조사자로 이동 | ✅ (처리기 나중) |
| 먹잇감 | prey | 적이 쫓는 대상 규칙 | ✅ (처리기 나중) |
| 소유자만 | bearer_only | 먹잇감 = 이 약점 소유자만 | ✅ |
| 상시 | constant | 지속 효과(발동 시점 없음, 조건 맞으면 항상) | ✅ |
| 소유자장소에 | at_bearer_location | 소유자와 같은 장소에 있는 동안 | ✅ |
| 텍스트백지화 | blank_text | 인쇄 텍스트 무효화 | ✅ |
| 소유자조사자 | bearer_investigator | 대상 = 약점 소유자의 조사자 카드 | ✅ |
| 제외 | except | 백지화에서 제외(traits는 남김) | ✅ |

**⏸ 처리기(엔진) 나중에 만들 것:**
- `hunter` 이동 처리 (적 페이즈)
- `prey` 대상 결정
- `on_draw:spawn_enemy` → 뽑을 때 손패 대신 적을 등장시키는 뽑기 엔진 분기
- `blank_text` → 조사자 능력 무효화 처리

**데이터·엔진 분리 확인:** cards.json = 무엇인가(type/subtype/faction/능력치/특성),
notz_player_cards = 어떻게 작동하는가(abilities + 구조화 keywords/prey).

**⚠️ "폭로(Revelation)" 판정 원칙 (중요):**
- 진짜 폭로 능력은 cards.json의 **text 안에 "Revelation -"** 로만 존재(별도 필드 없음).
- 그러니 "폭로 취소" 같은 카드가 폭로 대상을 찾을 때는 **cards.json의 text**를 기준으로 판정한다.
- 우리 파일(notz_player_cards)에는 `revelation`이라는 키를 쓰지 않는다.
  → 이름이 같으면 엔진이 헷갈려 우리 데이터를 폭로로 오인할 수 있으므로.
- 적이 뽑혀 등장하는 것은 폭로가 아니라 `on_draw:spawn_enemy`로 구분한다.
- 진짜 "Revelation -" 능력이 있는 카드(예: 은폐)를 만들 때 그 처리 방식은 그때 정한다.

---

## K. 배치 · 위협영역 (01598 귀신이 들리다에서 추가)

| 키/값 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 판에배치 | put_into_play | 뽑으면 자산·재능처럼 깔린 카드 목록에 배치 | ✅ |
| 구역 | zone | 깔린 카드의 분류 꼬리표 (없으면 일반 자산) | ✅ |
| 위협영역 | zone:"threat" | 위협 영역 소속 표시 | ✅ |
| 행동비용 | cost:{action:N} | 격발에 행동 N개 소모 | ✅ |

**위협영역 처리 원칙 (중요):**
- 위협영역은 **별도 칸을 안 만든다.** 자산·재능과 **같은 "깔린 카드 목록"**에 넣되, `zone:"threat"` 꼬리표만 붙인다.
- 시각적 배치도 자산 자리에 같이 둔다(칸 분리 X).
- **"위협영역 카드는 소유자와 같은 장소의 조사자 누구나 그 능력을 격발할 수 있다"**는 아컴 일반 규칙이다.
  → 이건 카드마다 적지 않고, **엔진이 `zone:"threat"`를 보고 일괄 적용**한다. (데이터 목록 + 처리기 하나)
  → 그래서 `activatable_by` 같은 능력별 표시는 쓰지 않는다.
- 일반 자산은 `zone` 없음(=소유자만 접근). threat인 것만 타인 접근 허용.

**⏸ 처리기(엔진) 나중에 만들 것:**
- `put_into_play` → 뽑을 때 손패 대신 깔린 카드 목록에 배치
- `zone:"threat"` → 같은 장소 조사자면 남의 카드라도 능력 접근 허용
- `bonus` 음수 → 능력치 약화(강화와 같은 처리기, 부호만 다름)

---

## L. 뽑을 때 효과 · 폭로 판별 · 타이밍 창 (01596 기억상실에서 추가)

| 키/값 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 뽑으면실행후버림 | on_draw:resolve_and_discard | 뽑으면 do 실행 후 자신 버림. "언제+뒤처리"를 담음 | ✅ |
| 취소하는카드 | can_cancel | 이 카드가 취소하는 대상 종류(on_draw_effect 등) | ✅ |
| 유발카드 | triggering_card | 이 반응을 유발한(방금 뽑아 대기 중인) 카드 | ✅ |
| 남김 | keep:N | 손패에서 N장만 남기고 나머지 버림 | ✅ |
| 고르기 | choice:keep | 남길 카드를 플레이어가 고름 | ✅ |
| 팝업고르기 | ui:popup_pick | 팝업에 목록 띄워 고르게 | ✅ |

**on_draw가 "언제"를 담으므로, ability에 trigger:on_draw를 또 적지 않는다(중복).**
- `on_draw` = 언제 발동 + 끝난 뒤 처리(resolve_and_discard=효과 후 버림)
- `do` = 무엇을 한다
- **cost와 requires는 다르다:** cost(얼마 드나)는 cards.json에서 읽고, requires(쓸 자원이 되나=발동 조건)는 우리 파일에 적는다.
  → requires가 있어야 타이밍 창에서 "자원 부족한 카드는 후보에서 빼거나 불가 표시". 없으면 0자원에도 물어보고 헛걸음.

**🔑 "폭로(Revelation) 카드냐" 판별 — text 검색 안 한다:**
- 문제: cards.json text로 "폭로" 단어를 찾으면, **"폭로 효과를 취소한다"**는 카드(수호의 결계 등)도
  걸려버림. 폭로를 **가진** 카드와 폭로를 **언급/취소**하는 카드가 구별 안 됨.
- 해결: **우리 파일의 `on_draw` 유무로 판단.** on_draw 있으면 "뽑을 때 효과 실행", 없으면 "손패로".
  → text의 "폭로" 문자열 검색을 아예 쓰지 않으므로 충돌 원천 차단.
- cards.json은 "이게 폭로다"를 사람이 읽는 텍스트로만 갖고, 엔진 판단은 우리 on_draw로 한다.

**🔑 타이밍 창(반응 카드 처리) — 흐름 확정, 구현은 나중:**
- **취소 가능이 기본값.** 취소 불가인 예외 카드에만 `no_cancel:true`를 붙인다.
  (모든 카드에 cancelable:true 도배 X — 낭비)
- 취소하는 쪽(수호의 결계 등)은 우리 파일에 **`can_cancel:"on_draw_effect"`** 로 표시.
  → text 검색 안 하고, 손패에서 can_cancel 가진 카드를 찾는다(우리 원칙 일관).
- 확정 흐름:
  ```
  카드 뽑음
    → 우리 파일에 on_draw 있나?  (text "폭로" 검색 불필요 — on_draw면 실행 대상)
    → 있으면 [대기] 
        → 손패에서 can_cancel 가진 카드 찾기 + 그 카드 비용 낼 자원 되나 확인
        → 조건 맞는 카드 있으면 → "이 카드로 취소할래?" 팝업
            → 쓴다 → 취소(대기 해제, 효과 실행 안 함)
            → 안 쓴다 → on_draw 효과 실행
        → 없으면 → 바로 on_draw 효과 실행
  ```
- 조조전 이벤트 {when,do}+처리기와 같은 구조: "on_draw 발동"이 이벤트, 그 앞에 "취소 가능?" 체크.
- ⏸ 구현은 반응/타이밍 시스템 만들 때. 지금은 on_draw 표시만으로 충분(취소는 그때 can_cancel 추가).

**⏸ 처리기 나중에 만들 것:**
- `on_draw:resolve_and_discard` → 뽑을 때 효과 실행 후 버린더미로
- `keep:N + choice:keep + ui:popup_pick` → 손패 목록 팝업, N장 남기고 버리기
- 타이밍 창 → 손패의 can_cancel 카드로 on_draw 효과 취소 (취소 불가는 no_cancel 표시)
