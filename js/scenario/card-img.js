/* =====================================================================
   scenario/card-img.js — 카드 이미지 URL 빌더 + 상수.
   S.byCode(로드된 카드 데이터)로 카드 앞면 이미지 URL을 만든다.
   여러 도메인(piles·hand·투영·조우 등)이 공용으로 쓴다.
   ※ 메뉴 화면(arkham_game)은 자체 byCode를 쓰므로 여기 대신 별도 처리.
   ===================================================================== */
import { S } from "./state.js";
import { EN_API } from "../shared/arkham-db.js";   // ArkhamDB 주소 단일 소스(메뉴 화면과 공용)

export const PLAYER_BACK = "images/player_back.png";   // 플레이어 카드 뒷면
export const CARD_IMG_BASE = EN_API;                   // 영문 카드 이미지 베이스

// 카드 코드 → 앞면 이미지 URL(imagesrc 없으면 뒷면)
export function cardFront(code){
  const c = S.byCode[code];
  return c && c.imagesrc ? CARD_IMG_BASE + c.imagesrc : PLAYER_BACK;
}

// 카드 코드 → 표시용 한글 텍스트(notz의 text_ko 우선, 없으면 cards.json text)
export function cardTextOf(code){
  return (S.cardAbilities[code]||{}).text_ko || (S.byCode[code]||{}).text || "";
}
