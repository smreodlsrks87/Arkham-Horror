/* =====================================================================
   scenario/rooms-data.js — 방 지오메트리·정보·인접·경유점 (순수 데이터).
   ROOMS(위치·크기·장막·단서·색·스테이지)·ROOM_INFO(카드정보·승점·강제)·
   ADJ(방 인접 그래프)·WAY(방 사이 경유점). import 없는 leaf 모듈.
   ===================================================================== */

export const ROOMS={
  // 1막 — 서재(혼자 고립). 저택과 멀리 떨어뜨려 배치(전환 전 단계).
  study:  { name:"서재",   floor:"",         x:-30, y:0,   z:0,   w:13, d:13, color:0xb08a4a, css:"#d8b878", shroud:2, clues:2, floorCol:0x4a3826, stage:"study" },
  // 2막 — 저택(복도 허브 + 방들)
  hallway:{ name:"복도",   floor:"중앙 통로", x:0,  y:0,   z:0,   w:9,  d:24, color:0xc4a468, css:"#d9bd82", shroud:1, clues:0, floorCol:0x6b5236, stage:"mansion" },
  parlor: { name:"거실",   floor:"1층",      x:22, y:0,   z:0,   w:15, d:15, color:0x9a7ad0, css:"#bda0e8", shroud:1, clues:0, floorCol:0x5a4636, locked:true, stage:"mansion" },
  attic:  { name:"다락방", floor:"2층",      x:22, y:12,  z:16,  w:15, d:15, color:0xe0c050, css:"#f0d878", shroud:1, clues:2, floorCol:0x6e5a3a, stage:"mansion" },
  cellar: { name:"지하실", floor:"지하",     x:22, y:-12, z:-16, w:15, d:15, color:0x4a9ab0, css:"#6ec0d8", shroud:4, clues:2, floorCol:0x3a3a40, stage:"mansion" },
};

const RX_ACT = '<span class="rt-ico">i</span>';   // 행동 격발 아이콘(ArkhamIcons)

const RX_KNW = '<span class="rt-ico">f</span>';   // 지식 아이콘

export const ROOM_INFO = {
  attic:  { info:"강제 — 다락방에 들어온 후 공포 1을 받는다.", victory:1, onEnterHorror:1 },
  cellar: { info:"강제 — 지하실에 들어온 후 피해 1을 받는다.", victory:1, onEnterDamage:1 },
  parlor: { withdrawInfo: RX_ACT+" 후퇴. 당신은 겁에 질려 달아납니다.",
            ritaInfo: RX_ACT+" 협상. "+RX_KNW+" 4 테스트 — 성공 시 리타 챈들러를 통제합니다." },
};

export const ADJ={ study:[], hallway:["parlor","attic","cellar"], parlor:["hallway"], attic:["hallway"], cellar:["hallway"] };

export const WAY={
  attic:  { hall:{x:4.5,y:0,z:12},   room:{x:16,y:11,z:16} },   // 계단 아래/위
  cellar: { hall:{x:4.5,y:0,z:-12},  room:{x:16,y:-11,z:-16} },
  parlor: { hall:{x:4.5,y:0,z:0},    room:{x:15,y:0,z:0} },       // 문 앞
};
