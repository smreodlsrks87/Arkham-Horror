/* =====================================================================
   shared/arkham-db.js — ArkhamDB 주소 단일 소스.
   카드 이미지(영문)와 한국어 텍스트 API 주소를 여기서만 정의해,
   게임판(js/scenario/card-img.js)과 메뉴 화면(arkham_game.html)이 함께 쓴다.
   ※ 나중에 이미지를 로컬로 내려받아 외부 의존을 없앨 때도 여기 한 곳만 고치면 된다.
   ===================================================================== */

export const EN_API = "https://arkhamdb.com";      // 영문 — 카드 이미지(imagesrc가 이 주소 기준의 경로)
export const KO_API = "https://ko.arkhamdb.com";   // 한국어 — 카드 텍스트 API

// imagesrc(예: "/bundles/cards/01001.png") → 전체 이미지 URL. 없으면 빈 문자열.
export function cardImageUrl(imagesrc){ return imagesrc ? EN_API + imagesrc : ""; }
