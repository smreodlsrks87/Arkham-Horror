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

**은폐 01507(로랜드 고유약점)에서 추가된 용어:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| on_draw:"put_into_play" | 폭로 = 뽑을 때 손패 아닌 **플레이(위협영역)로 배치**. zone:"threat"와 함께 씀(01598·01507·01600) | ✅ 런타임 |
| uses:{type:"clue",count:3} | 카드 위 단서를 **총알처럼 카운터**로 관리(우상단 숫자). 실제 단서토큰 안 씀 | ✅ |
| reaction when:"you_would_discover_clue" | 단서를 **발견하려는 순간** 가로채는 반응(대체 효과). auto 없음 → 팝업으로 물어봄(선택) | ✅ 본조사분 |
| effect:"redirect_discover_to_uses" | 발견할 단서 수만큼 **이 카드 uses에서 제거**(조사자 획득 X, **맵 단서는 유지** — "발견 대신"). 0이어도 **버려지지 않음** | ✅ |
| 발견 개수 = 실제 발견분 | 0개 장소=0 제거 / 추론 등 추가발견은 합산(있는 단서 수가 상한). ※추론 합산은 확장 예정 | 🔲 추론합산 |
| timing:"forced" + when:"scenario_end" | 강제 효과 · 시나리오 종료 시점(종료 시스템 필요) | 🔲 종료훅 |
| condition:"uses_remaining" | 이 카드 uses(단서)가 1개 이상 남았을 때만 | 🔲 |
| effect:"mental_trauma" value:1 target:"owner" | **소유자(owner)**에게 정신적 트라우마 N(수량 무관 1). ※약점 소유주 표현은 `owner`로 통일(bearer_investigator는 적약점 전용) | 🔲 종료훅 |

**심기증 01600(기본약점)에서 추가:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| timing:"forced" when:"after_damage_on_owner" | **소유자(조사자)가** 피해 받은 후 발동. 조력자 소화로 조사자 0이면 발동 X | 🔲 피해훅 |
| effect:"horror" value direct:true | 공포 N. direct=조력자 할당 불가(바로 조사자 정신). EFFECTS.horror | ✅(효과) 🔲(강제훅) |
| cost:{action:2} | 발동에 **행동 2** 소비. activate/canActivate가 cost.action 읽음(없으면 timing:action=1) | ✅ |
| cost:{discard:"self"} + zone:threat | 같은 장소 **타 조사자도** 행동 2로 버릴 수 있음(위협영역 일반규칙) | ✅ |

> ⚠️ 은폐·심기증의 **강제(forced)**는 종료훅/피해훅 대기. 폭로 배치·단서 가로채기·행동2 버림·직접공포 효과는 동작.

**편집증 01597 / 정신병 01599에서 추가:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| on_draw:"resolve_and_discard" | 폭로: do 효과 실행 후 **자신은 버린 더미로**(편집증·기억상실). handleOnDraw가 처리 | ✅ |
| effect:"lose_all_resources" | 자원을 전부 0으로(편집증). ※정비 4.4는 drawCards로 뽑아 폭로 발동 → 자원 0 후 +1=1 | ✅ |
| when:"after_horror_on_owner" | 정신병 = 심기증의 반대(공포 받은 후 **직접 피해** 1). damage_investigator direct:true | 🔲 공포훅 |

> 🔧 검증 중 수정: 귀신들리다(01598) 버리기가 미구현 `discard` 효과 → `cost:{discard:"self"}`로 통일(심기증·정신병과 동일).

**기억상실 01596 손패 버리기(구현 완료):**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| effect:"discard" target:"hand" keep:1 | 손패 keep장만 남기고 버림. **약점은 임의로 못 버림** → 우선 남김 | ✅ |
| (약점 규칙) | 손에 약점 1장=자동 남김 / 약점 2+=약점 중 택1 남기고 나머지 전부 버림 / 약점 0=아무 1장 택1 | ✅ |
| on_draw drawCards 경유 | 정비 4.4·턴 "카드 뽑기" 행동 모두 `drawCards`로 → 폭로(on_draw) 발동 | ✅ |

**은폐 리다이렉트 정정:** 반응은 "발견을 **대신**"하는 대체효과 → 사용 시 **단서 획득 0**(초과분도 못 가짐, 맵 단서 전부 유지). 은폐 잔량만큼만 버림.

---

## M. 능력치 테스트 · 커밋 · 신속 · 슬롯 (돋보기 01530에서 추가)

| 키/값 | 영어 | 뜻 | 상태 |
|---|---|---|---|
| 신속(키워드) | fast:true | 최상위 플래그. 행동 소비 없이 플레이. 능력의 timing:fast 와 **별개** | ✅ |
| 슬롯 | slot:"hand" | 착용 슬롯(hand/arcane/body/accessory/ally/tarot). **지금은 기록만, 개수 제한 미구현** | 🔲(데이터만) |
| 조사중 | condition:"while_investigating" | 상시 보너스가 조사(지식 판정) 중에만 적용 | ✅ |
| 테스트유형 | testType | 판정 종류(investigate 등) — 조건부 보너스 매칭용 | ✅ |

**커밋(commit):** 손패 카드를 소비하면 그 카드 좌상단 기호(cards.json `skill_*`) 중 **테스트 능력치 기호 + 만능(`skill_wild`)** 수만큼 판정에 +. 커밋 가능 = `skill_[능력치]>0 || skill_wild>0` (skilltest.js). 커밋한 카드는 판정 후 버린 더미로.

**상시 보너스 2종:**
- **무조건**(condition 없음/`is_equipped`) → 플레이 시 `S.statBonus` 반영(순찰경찰 +1 전투, 밀란 +1 지식).
- **조건부**(`while_investigating` 등) → statBonus에 안 넣고, 테스트가 `conditionalTestBonus(skill, testType)`로 계산(돋보기).

**커밋 카드의 판정후 효과 (추론 01539):**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| timing:"on_commit_resolve" | 커밋한 카드가 **판정 결과 난 뒤** 발동 | ✅ |
| condition:"investigate_success" | 성공 + 조사(testType:investigate)일 때만 | ✅ |
| condition:"test_success" | **모든 종류** 판정 성공 시(조사·전투·회피…). 배짱/통찰력/제압/손재주의 "성공 시 드로우" | ✅ |
| effect:"discover_clue" | 대상 장소 단서 1개 발견. **남은 단서 있을 때만**(없으면 새로 안 만듦) | ✅ |
| effect:"draw" (do 안) | 카드 뽑기. `draw_to:"committer"`=커밋한 사람이 뽑음(멀티 대비, 1인은 동일인). EFFECTS.draw와 동일 연출 | ✅ |
| target:"test_location" | 판정 대상 장소(cfg.location) — 연결 장소 조사 카드 대비 | ✅ |

- 기술(skill) 카드는 type_code로 이미 "커밋 전용"(손패 플레이 불가) → commit_only 플래그 불필요.

**커밋 매수 제한 — 배짱·통찰력·제압·손재주·뜻밖의 용기(01589~01593):**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| commit_limit:1 | "능력 테스트당 최대 N장 소모". **카드(코드) 단위** — 배짱 2장이면 1장만 커밋 가능(나머지 비활성). 배짱+뜻밖의용기는 서로 다른 코드라 각각 1장 OK | ✅ |
| (아이콘) | 제공 기호는 cards.json(skill_willpower 등)에서 이미 계산 — notz는 매수제한·성공효과만 담당 | ✅ |

**반응(Reaction) — 밀란 01533:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| timing:"reaction" + when | 조건 시점에 발동(when="after_investigate_success" 등) | ✅ |
| 반응은 원칙적으로 선택(may) | 비용·단점 있으면 확인 팝업, **순수 이득(자원 등)은 자동 적용** | — |
| slot:"ally" | 조력자 슬롯(기록만, 개수 제한 미구현) | 🔲 |
| 상시 vs 조건부 지식 | 밀란=무조건 +1(모든 지식판정) / 돋보기=조사중만. condition 유무로 구분 | ✅ |
| timing:"on_play" | 이벤트 플레이 시 즉시 실행하는 do 효과(직감=단서 발견). when 있는 이벤트는 반응이라 손패 직접 플레이 불가(증거!) | ✅ |
| effect:"skill_substitute" | 이번 라운드 from 능력치 판정을 to로 대체 가능(정신력=전투·민첩→지식). optional=매 판정 확인 팝업 | ✅ |
| duration:"this_round" | 라운드 끝(다음 신화 시작)까지 지속. S.roundEffects에 담김, 신화 때 비움 | ✅ |
| ability.test + on_success/on_failure | 능력이 판정을 굴려 성공/실패별 효과(의학 서적=지식(2)→치유/피해) | ✅ |
| ability.label | 발동 메뉴 표시 라벨("치유 판정" 등) | ✅ |
| effect:"damage_investigator" | 대상 조사자(target:"chosen" 등)에게 피해 N. **target_choice로 대상 지정**(1인이라 자기 자신, 멀티면 선택 UI) | ✅ |
| target_choice / target:"chosen" | 능력의 대상 지정. 1인용은 자기 자신으로 자동 해석 → 효과가 그 대상에 적용 | ✅ |
| cost:{exhaust:true} | 발동 비용으로 카드 소진(90° 눕힘). 이미 소진이면 재사용 불가. **상시 보너스는 소진 중에도 적용**. 정비 4.3에 준비(ready) | ✅ |
| effect:"look_top_draw" | 덱 맨 위 count장 확인 → (filter 특성) 1장 뽑기(여럿이면 팝업) → 나머지 넣고 셔플(낡은 지식의 서·비술 입문자) | ✅ |
| effect:"attach_to_location" | 이벤트를 현재 장소에 부착(SVG 바리케이드 마커 + 소유자 숨김 저장). discard_when:"investigator_leaves"=벗어나면 소유자 버린더미, blocks:"non_elite_enemy_movement"=비정예 적 이동 차단(적 훅 canEnemyEnterLocation) | ✅(적 부분 훅) |
| 특성 필터 trait | **영어 real_traits**로 매칭(Spell·Tome). 한글 traits 아님. search_deck·look_top_draw 공통 키 | ✅ |

**무기·도구 — 단도 01586 / 손전등 01587 / 로랜드의 .38 01506 / 비상 물자 01588:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| **능력치 최소 0** | (능력치+커밋+보너스+토큰)이 음수여도 0으로 계산. 은폐0이면 0≥0 성공. 촉수는 autoFail이라 별개로 실패. resolveTest에서 `Math.max(0, …)` | ✅ |
| action_type:"investigate" | 능력이 **정식 조사 판정**을 수행(손전등). 현재 장소 은폐 대비 지식 판정 → 성공 시 단서 수거 | ✅ |
| difficulty_mod:-2 | 이 판정에서 난이도(은폐) 가감. 하한 0. difficultyBreak로 팝업에 "0 (2−2)" 분해 표시 | ✅ |
| uses:{type:"supply",count:3} | 소모품(보급) 카운터. cost로 소비. **소진돼도 자동 버림 X**(discard_if_empty 없음 → 장착 유지, 능력만 비활성) | ✅ |
| cost:{supply:1}/{ammo:1} | uses 토큰 소비 비용. `cost[p.uses.type]`만큼 count 감소(손전등=보급) | ✅ |
| cost:{discard:"self"} | 발동 비용으로 이 카드를 버림(단도 둘째 능력) | ✅ |
| effect:"do_fight" | 전투(공격). bonus·extra_damage. **전투/적 시스템 전까지 스텁**(능력 회색·발동 불가) | 🔲(스텁) |
| bonus_if:{cond,bonus} | do_fight의 조건부 보너스 — cond 참이면 bonus로 교체(로랜드=clue_at_your_location 시 전투+1→+3). 스텁이라 구조만 | 🔲 |
| effect:"search_deck" | 덱에서 card_type·trait 맞는 카드 검색 → 팝업 선택 → 손패 + 셔플(연구 사서) | ✅ |
| when:"after_this_enters_play" | 이 카드가 플레이영역에 들어온 직후 반응(연구 사서, auto:true) | ✅ |
| heal:{damage:N} / {horror:N} | 피해/공포만 회복(의학 서적) vs choose_one(응급처치=선택) | ✅ |

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

---

## N. 조우 카드 (notz_encounter_cards.json — 적·음모, 시나리오1에서 추가)

> **별도 파일:** 조우 카드(적·음모·장소 등)의 "어떻게 작동하는가"는 `notz_encounter_cards.json`에 담는다.
> 코드가 플레이어(015xx)와 안 겹쳐서(011xx~016xx) 로드 시 `S.cardAbilities`에 그대로 병합.
> **능력치는 cards.json에서 읽음** — 적: `health`(체력)·`enemy_fight`(전투)·`enemy_evade`(회피)·`enemy_damage`(피해)·`enemy_horror`(공포, 없으면0)·`quantity`(장수). 특수사항 없는 적(구울 하수인)은 **항목 자체를 안 만든다.**

| 키/값 | 뜻 | 상태 |
|---|---|---|
| keywords:["hunter"] | 키워드 배열(사냥꾼 등). text의 "Hunter." 검색 대신 데이터로 | 🔲 적엔진 |
| prey:"lowest_health" | 먹잇감 — **교전 상대를 정할 때** 기준. 1명이면 자동 교전, **2명 이상일 때만** 이 기준으로 택1. 이미 교전 중이면 발동 안 함 | 🔲 적엔진 |
| revelation_test:{skill,difficulty} | 폭로 시 굴리는 능력 테스트(움켜쥐는 손=민첩3). on_draw:resolve_and_discard와 함께 | 🔲 조우엔진 |
| on_success/on_failure:[…] | 폭로 테스트 성공/실패별 효과 | 🔲 |
| damage:{value:"fail_by"} | **fail_by** = 난이도−능력값(능력값 최소0 적용 → 난이도 이하). **success_by** = 능력값−난이도. min/max로 clamp(산탄총=최소1·최대5, 움켜쥐는 손=clamp 없음). 산탄총(01529)과 **공통 규약** | 🔲 |

**fail_by/success_by 검증(산탄총 01529 참조):** 로직 이상 없음. 차이 = `r.total`(이미 최소0 clamp)와 `r.difficulty`로 계산 → `fail_by=max(0, diff−total)`, `success_by=max(0, total−diff)`. 능력값이 아무리 낮아도 fail_by가 난이도를 못 넘음(값이 0 밑으로 안 감). 두 카드가 같은 규약 사용.

**엄습하는 공포 세트(01163~01165)에서 추가:**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| damage/value: "fail_by" (문자열) | 동적 차이값. 숫자=고정, "fail_by"/"success_by"=차이(clamp 없음), {value:"fail_by",min,max}=clamp(산탄총). 세 형태 허용 | 🔲 조우엔진 |
| effect:"action_surcharge" | 지정 행동(actions:[move/fight/evade])에 추가 행동력. per:"round_first"=라운드 첫 1회. 공포에 얼어붙다 | 🔲 |
| effect:"cannot_play" card_types:[…] | 위협영역에 있는 동안 해당 유형 플레이 금지(시끄러운 소음=자산·이벤트). ※커밋·발동·기본행동은 가능 | 🔲 |
| forced when:"end_of_turn"/"end_of_round" | 강제 발동 시점. 공포에얼어붙다=턴 종료 테스트 후 성공 시 버림 / 시끄러운소음=라운드 종료 시 버림 | 🔲 |
| ability.test + on_success:[discard self] | 강제 테스트 성공 시 자신 버림(공포에 얼어붙다) | 🔲 |

**버림 더미 라우팅(구현됨):** `discardToOrigin(code)` — **조우(faction:mythos)=조우 버림 더미(encounterDiscard), 그 외(약점 등 플레이어)=플레이어 버림(S.playerDiscard).** discardPlayed·폭로 버림 모두 이걸 경유. (판별: 조우=mythos, 플레이어 약점=neutral)

**한글 텍스트 오버라이드 + 고대의 악(01166):**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| text_ko | **표시용 한글 텍스트.** cards.json 수정 금지라, 영문뿐인 조우 카드는 notz의 text_ko로 툴팁·확대뷰 출력. `cardTextOf(code)` = text_ko ‖ cards.json text | ✅ |
| effect:"place_doom" target:"agenda" | 의제에 파멸 N(agendaDoom=좌측·턴파멸과 같은 칸, 영구). 우측 fieldDoom은 카드 위 파멸(카드 떠나면 사라짐) | ✅(효과) |
| effect:"check_agenda_advance" | 파멸이 임계값 이상이면 의제 진행. 원래 신화 1.3에만 돌지만 고대의 악은 뽑을 때 실행 | ✅(효과) 🔲(조우드로우 연동) |
| per:"first_of_group_per_round" | actions 그룹 중 **매 라운드 첫 1회에만** 적용(공포에 얼어붙다=이동/전투/회피 중 가장 먼저 1회). ※per:round_first에서 개명(중의성 제거) | 🔲 |

**한글 오버라이드 판정 + 조우덱 구성 + 나머지 조우(01116/01118/01119/01167/01168):**
| 키/값 | 뜻 | 상태 |
|---|---|---|
| text_ko 필요 판정 | cards.json `text`에 **한글이 없으면(영문)** text_ko 작성. 카드명·특성은 항상 한글이라 본문만 판정. 대상은 사실상 core 조우 카드 | ✅ |
| 조우덱 구성 | `buildEncounterDeck()` — cards.json에서 `SCENARIO1_SETS`(torch·rats·ghouls·striking_fear·ancient_evils·**chilling_cold**)의 enemy·treachery를 quantity만큼. 구울 사제(01116)는 set aside 제외. **데이터 로드 후** boot에서 구성 | ✅ |
| spawn:"attic"/"cellar" | 등장 지정 장소(식인귀·냉기구울) | 🔲 적엔진 |
| keywords:["retaliate"] | 보복(구울 사제) | 🔲 |
| prey:"highest_combat" | 먹잇감=전투 최고(구울 사제) | 🔲 |
| discard_owned_asset + fallback | 통제 자산 1 버림, 못 버리면 fallback(피해2). 으스스한 한기 | 🔲 |
| on_draw:"attach_to_location" + shroud_mod + limit_per_location + discard_when:"attached_location_investigated" | 자욱한 안개 — 장소 부착·은폐+2·장소당1·성공 조사 시 버림 | 🔲 |
