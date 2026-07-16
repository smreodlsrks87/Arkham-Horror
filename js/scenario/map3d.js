/* =====================================================================
   scenario/map3d.js — Three.js 3D 저택 맵 시스템.
   씬·카메라·방/가구/계단·불장벽·조사자 말·단서 토큰·이름표·바리케이드/안개·적 마커·
   이동/조사 상호작용·프레임 애니메이션 루프. THREE는 전역(window.THREE, r128).
   ※ 순수 3D 표현. 게임 로직(전투·조사판정·피해할당 등)은 인라인에 남기고 setMap3dDeps로 주입받는다.
   ===================================================================== */
import { ROOMS, ROOM_INFO, ADJ, WAY } from "./rooms-data.js";
import { toStageX, toStageY } from "../shared/stage.js";
import { S } from "./state.js";
import { addLog } from "./log.js";
import { clueMeshes, cluesInRoom } from "./clues.js";
import { enemiesAt, ghoulsInRoom, enemyHealth, enemyCard, openEnemyMenu, provokeAoO, resolveEngagements } from "./enemy.js";
import { cardFront } from "./card-img.js";
import { showCardInfo, hideCardInfo } from "./tooltip.js";
import { updateDoom } from "./doom.js";
import { updateAP } from "./investigator.js";
import { checkActCondition } from "./act.js";
import { showPopup, hidePopup, showToast } from "./popup.js";
import { csActive } from "./cutscene.js";   // 라이브 바인딩 — clickWorld에서 컷신 중 조작 차단
import { actionSurchargeFor, markSurcharge, attachmentIcon, attachmentLabel, sweepAttachmentLeaves } from "./threats.js";   // 행동 추가비용·부착물 표시/정리(threats)
import { takeDamageHorror } from "./damage.js";   // 조사자 피해·공포 할당(damage)

// 주입 — 인라인 잔류 게임로직(중립 기본값 → 인라인이 setMap3dDeps로 실값 주입)
let D = {
  canAct:()=>false,
  effShroud:()=>0, leadInvestigatorName:()=>"",
  askInvestigate:()=>{}, ritaParleyAvailable:()=>false, parleyRita:()=>{},
};
export function setMap3dDeps(o){ Object.assign(D, o); }

/* =====================================================================
   길 B — 3D 구조 개선
   핵심 개선: ① 방마다 뚜렷이 다른 색  ② 3D 위에 큰 이름표(HTML)
   ③ 높이차 과장(다락방 높이↑·지하실 깊이↓)  ④ 계단을 또렷한 형태로
   ⑤ 전체보기 기본 각도를 구조가 잘 보이게
   ===================================================================== */
const wrap=document.getElementById("wrap");
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x0b0910,40,90);

const renderer=new THREE.WebGLRenderer({antialias:true});
const MAP_W=1040, MAP_H=700;    // 맵 영역(우측 확장)
renderer.setSize(MAP_W,MAP_H);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
wrap.appendChild(renderer.domElement);

let frustum=30;
const camera=new THREE.OrthographicCamera(-frustum,frustum,frustum,-frustum,-200,400);
let camYaw=Math.PI*1.22, camPitch=0.62;
let wantYaw=Math.PI*1.22, wantPitch=0.62;   // 목표 각도(부드럽게 보간)
const camTarget=new THREE.Vector3(14,0,0), wantTarget=new THREE.Vector3(14,0,0);
let wantFrustum=30; const camDist=50;
function applyCamera(){
  const cp=Math.cos(camPitch),sp=Math.sin(camPitch),cy=Math.cos(camYaw),sy=Math.sin(camYaw);
  camera.position.set(camTarget.x+camDist*cp*sy,camTarget.y+camDist*sp,camTarget.z+camDist*cp*cy);
  camera.lookAt(camTarget);
}
applyCamera();

scene.add(new THREE.AmbientLight(0x9a90a8,0.7));
const sun=new THREE.DirectionalLight(0xfff0d8,0.85);
sun.position.set(18,40,20); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-40,right:40,top:40,bottom:-40,near:1,far:130});
sun.shadow.bias=-0.0004; scene.add(sun);
const fill=new THREE.DirectionalLight(0x7a6f9a,0.35); fill.position.set(-14,16,-12); scene.add(fill);

const mat=(c,r=0.9,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});

const groups={};
function buildRoom(key){
  const R=ROOMS[key]; const g=new THREE.Group(); g.position.set(R.x,R.y,R.z);
  // 바닥 — 사실적 색(나무/돌). 구분색은 벽 테두리에만.
  const floorCol = R.floorCol || 0x4a3a2a;
  const fl=new THREE.Mesh(new THREE.BoxGeometry(R.w,0.6,R.d),mat(floorCol,0.9));
  fl.position.y=-0.3; fl.receiveShadow=true; fl.userData.floorOf=key; g.add(fl);
  // 바닥 윗면(살짝 밝은 나무결 느낌)
  const topFace=new THREE.Mesh(new THREE.BoxGeometry(R.w-0.6,0.05,R.d-0.6),mat(floorCol,0.85));
  topFace.material.color.multiplyScalar(1.15);
  topFace.position.y=0.02; g.add(topFace);
  // 낮은 벽 4면 — 방 윤곽 구분색(이게 어느 방인지 알려주는 표식)
  const wm=mat(R.color,0.85);
  const h=1.4;
  [[0,-R.d/2,R.w,0.3],[0,R.d/2,R.w,0.3],[-R.w/2,0,0.3,R.d],[R.w/2,0,0.3,R.d]].forEach(([x,z,w,d])=>{
    const wall=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),wm.clone());
    wall.position.set(x,h/2-0.3,z); wall.castShadow=true; g.add(wall);
  });
  // 벽 윗면에 밝은 테두리 라인(구분 강조)
  [[0,-R.d/2,R.w,0.32],[0,R.d/2,R.w,0.32],[-R.w/2,0,0.32,R.d],[R.w/2,0,0.32,R.d]].forEach(([x,z,w,d])=>{
    const line=new THREE.Mesh(new THREE.BoxGeometry(w,0.12,d),
      new THREE.MeshStandardMaterial({color:R.color,emissive:R.color,emissiveIntensity:0.35,roughness:0.5}));
    line.position.set(x,1.16,z); g.add(line);
  });
  scene.add(g); groups[key]=g;
}


/* =====================================================================
   가구 — 그리면서 동시에 "충돌 영역"으로 등록(단서가 피해가거나 위로 올라감)
   furniture[room] = [{x,z,hw,hd,top}]  (top = 윗면 높이, 단서를 올릴 높이)
   ===================================================================== */
const furniture = {};
Object.keys(ROOMS).forEach(k=>furniture[k]=[]);

// 가구 박스: 방 그룹에 그리고, 그 방의 충돌목록에 등록
function furn(roomKey, w,h,d, x,y,z, c, register=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true;
  groups[roomKey].add(m);
  if(register){
    const R=ROOMS[roomKey];
    // 방 로컬좌표(x,z)를 월드좌표로 (그룹이 R.x,R.y,R.z에 있음)
    furniture[roomKey].push({ x:R.x+x, z:R.z+z, hw:w/2+0.5, hd:d/2+0.5, top:R.y+y+h/2 });
  }
  return m;
}
// 평평한 장식(러그·통로 등 — 등록 안 함, 단서가 위에 놔도 됨)
function flat(roomKey, w,h,d, x,y,z, c){ return furn(roomKey,w,h,d,x,y,z,c,false); }

/* 계단 — 복도 오른쪽 끝에서 시작해 방을 향함(폭 넓게, 색 대비) */
function stairs(x1,y1,z1,x2,y2,z2,color){
  const steps=12; const g=new THREE.Group();
  for(let i=0;i<steps;i++){
    const t=i/(steps-1);
    const horizZ = Math.abs(z2-z1) > Math.abs(x2-x1);
    const s=new THREE.Mesh(new THREE.BoxGeometry(horizZ?3.2:1.0, 0.3, horizZ?1.0:3.2), mat(color,0.8));
    s.position.set(x1+(x2-x1)*t,y1+(y2-y1)*t,z1+(z2-z1)*t);
    s.castShadow=true; s.receiveShadow=true; g.add(s);
  }
  scene.add(g);
  mansionExtras.push(g);   // 저택 부속(stage 전환 시 함께 숨김/표시)
  return g;
}
const mansionExtras=[];   // 계단·문 등 mansion 스테이지 부속물

/* =====================================================================
   불 장벽 — 거실 문 앞(x≈7, 복도쪽 입구). 잠긴 동안만 표시.
   여러 불꽃을 만들어 크기·색을 떨리게 해서 이글거리는 느낌(2~3프레임 효과)
   ===================================================================== */
const fireBarrier = new THREE.Group();
fireBarrier.position.set(6.5, 0, 0);   // 복도 거실쪽 입구
const flames = [];
for(let i=0;i<9;i++){
  const fx = -1.6 + (i%3)*1.6;          // 가로 3열
  const fz = (Math.floor(i/3)-1)*0.5;
  const flame=new THREE.Mesh(
    new THREE.ConeGeometry(0.4, 1.6, 8),
    new THREE.MeshStandardMaterial({color:0xd85a20, emissive:0xc23000, emissiveIntensity:0.6, roughness:0.7}));
  flame.position.set(fx, 0.8, fz);
  flame.userData.base = 0.8;
  flame.userData.phase = Math.random()*Math.PI*2;
  fireBarrier.add(flame); flames.push(flame);
}
// 불빛(점광) — 은은하게
const fireLight = new THREE.PointLight(0xff6a2a, 0.7, 10);
fireLight.position.set(0,1.2,0); fireBarrier.add(fireLight);
scene.add(fireBarrier);

// 불꽃 이글거림(색·크기를 단계적으로, 과하지 않게)
let fireFrame=0, fireTick=0;
const fireColors=[0xd85a20, 0xc23000, 0xe08828];   // 3프레임 색(부드러운 폭)
function animateFire(){
  if(!fireBarrier.visible) return;
  fireTick++;
  if(fireTick%7===0){   // 천천히 색 단계 전환
    fireFrame=(fireFrame+1)%fireColors.length;
    flames.forEach(f=>f.material.emissive.setHex(fireColors[fireFrame]));
  }
  flames.forEach(f=>{
    // 높이 떨림(폭 줄임)
    const s=0.8+Math.abs(Math.sin(Date.now()*0.008 + f.userData.phase))*0.35;
    f.scale.set(0.9, s, 0.9);
    f.position.y = f.userData.base + s*0.3;
  });
  fireLight.intensity = 0.6 + Math.sin(Date.now()*0.006)*0.15;   // 부드러운 깜빡임
}

/* =====================================================================
   단서 토큰 — 각 방 바닥에 clues 개수만큼 무작위 배치
   클릭하면 그 방의 조사 행동을 발동(조사자가 그쪽으로 걸어가서 조사)
   ===================================================================== */
// 점(x,z)이 어떤 가구와 겹치면 그 가구 정보 반환(가장 높은 것)
function furnitureAt(roomKey, x, z){
  let hit=null;
  furniture[roomKey].forEach(f=>{
    if(Math.abs(x-f.x)<=f.hw && Math.abs(z-f.z)<=f.hd){
      if(!hit || f.top>hit.top) hit=f;
    }
  });
  return hit;
}
function scatterClues(){
  Object.entries(ROOMS).forEach(([key,R])=>{
    for(let i=0;i<R.clues;i++){
      const m=new THREE.Mesh(
        new THREE.CylinderGeometry(0.45,0.45,0.14,20),
        new THREE.MeshStandardMaterial({color:0xe8d089, emissive:0x5a4612, emissiveIntensity:0.6, roughness:0.4, metalness:0.3}));
      const rx = R.x + (Math.random()-0.5)*(R.w-4);
      const rz = R.z + (Math.random()-0.5)*(R.d-4);
      // 가구와 겹치면 그 가구 윗면에 올림(안 묻히고 클릭 가능)
      const f = furnitureAt(key, rx, rz);
      const baseY = f ? f.top : R.y;
      m.position.set(rx, baseY+0.18, rz);
      m.userData.clueRoom = key;
      m.userData.baseY = baseY+0.18;     // 둥둥 애니메이션 기준 높이
      scene.add(m);
      clueMeshes.push({mesh:m, room:key});
    }
  });
}

/* 조사자 말 — 밝고 크게, 눈에 띄게 (그림자는 안 던짐: 자기 방을 어둡게 안 만들게) */
const pawn=new THREE.Group();
const body=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.56,1.0,20),
  new THREE.MeshStandardMaterial({color:0xfff0d0,roughness:0.4,metalness:0.1,emissive:0x6a5520,emissiveIntensity:0.4}));
body.position.y=0.5; pawn.add(body);
const head=new THREE.Mesh(new THREE.SphereGeometry(0.34,20,16),
  new THREE.MeshStandardMaterial({color:0xfff4d8,roughness:0.4,metalness:0.1,emissive:0x6a5520,emissiveIntensity:0.35}));
head.position.y=1.25; pawn.add(head);
// 발밑 발광 링(위치 강조)
const ring=new THREE.Mesh(new THREE.TorusGeometry(0.6,0.08,12,32),
  new THREE.MeshStandardMaterial({color:0xffd040,emissive:0xffa020,emissiveIntensity:0.9,roughness:0.3,metalness:0.5}));
ring.position.y=0.06; ring.rotation.x=Math.PI/2; pawn.add(ring);
// 머리 위 빛(방을 밝히게 강하고 넓게)
const beam=new THREE.PointLight(0xfff0c0,0.7,10); beam.position.y=3; pawn.add(beam);
scene.add(pawn);
S.cur="study";
function roomCenter(k){const R=ROOMS[k];return new THREE.Vector3(R.x,R.y,R.z);}
function placePawn(k){const c=roomCenter(k);pawn.position.set(c.x,c.y+0.05,c.z);}

// 리타 챈들러(거실 NPC) — 파란 말 + 이름표. 거실이 공개(입장)되기 전엔 안개에 가려짐.
const ritaPawn=new THREE.Group();
ritaPawn.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.56,1.0,20),
  new THREE.MeshStandardMaterial({color:0x4a78d0,roughness:0.4,metalness:0.1,emissive:0x22355a,emissiveIntensity:0.4})).translateY(0.5));
ritaPawn.add(new THREE.Mesh(new THREE.SphereGeometry(0.34,20,16),
  new THREE.MeshStandardMaterial({color:0x6a98e0,roughness:0.4,metalness:0.1,emissive:0x22355a,emissiveIntensity:0.35})).translateY(1.25));
(function(){ const c=roomCenter("parlor"); ritaPawn.position.set(c.x, c.y+0.05, c.z); })();
ritaPawn.visible=false; scene.add(ritaPawn);

const ritaTag=document.createElement("div"); ritaTag.className="tag3d rita-tag"; ritaTag.textContent="리타 챈들러";

/* =====================================================================
   연결된 장소 버튼 — 현재 방에서 갈 수 있는 곳만 노출
   ===================================================================== */
const roomsList=document.getElementById("rooms-list");
const roomsPanel=document.getElementById("rooms");   // 연결장소 패널(조작 불가 시 흐림·비활성)
/* 잠긴 방 호버 툴팁 */
let lockTipEl=null;
function showLockTip(btn){
  hideLockTip();
  lockTipEl=document.createElement("div");
  lockTipEl.className="lock-tip";
  lockTipEl.textContent="마법의 장벽이 거실로 가는 길을 막고 있다. 다른 방법을 찾아봐야 할 것 같다.";
  document.body.appendChild(lockTipEl);
  const r=btn.getBoundingClientRect();
  lockTipEl.style.top=(r.top)+"px";
  lockTipEl.style.left=(r.left - lockTipEl.offsetWidth - 12)+"px";  // 버튼 왼쪽에
}
function hideLockTip(){ if(lockTipEl){ lockTipEl.remove(); lockTipEl=null; } }

function renderRoomButtons(){
  roomsList.innerHTML="";
  const targets = ADJ[S.cur] || [];
  if(targets.length===0){ roomsList.innerHTML='<div style="font-size:12px;color:var(--muted)">연결된 곳 없음</div>'; return; }
  targets.forEach(k=>{
    const R=ROOMS[k];
    const b=document.createElement("button"); b.dataset.room=k;
    if(R.locked){
      b.classList.add("locked");
      b.innerHTML='<span class="sw" style="background:'+R.css+'"></span>🔒 '+R.name+' · '+R.floor;
      // disabled 대신 클릭만 무시(호버 툴팁은 살림)
      b.onclick=()=>{};
      b.addEventListener("mouseenter",()=>showLockTip(b));
      b.addEventListener("mouseleave",hideLockTip);
    }else{
      b.innerHTML='<span class="sw" style="background:'+R.css+'"></span>'+R.name+' · '+R.floor;
      b.onclick=()=>requestMove(k);
    }
    roomsList.appendChild(b);
  });
}

/* =====================================================================
   경유점(waypoint) — 방 사이 이동 시 거쳐가는 점
   각 연결마다 [복도쪽 점, 상대방쪽 점]을 정의.
   복도→방: 현재위치 → 복도쪽점 → 방쪽점 → 방중심
   방→복도: 현재위치 → 방쪽점 → 복도쪽점 → 복도중심
   ===================================================================== */
function roomCenterPt(k){ const c=roomCenter(k); return {x:c.x,y:c.y,z:c.z}; }
function buildPath(from, to){
  const pawnPos={x:pawn.position.x,y:pawn.position.y,z:pawn.position.z};
  if(from==="hallway"){
    const w=WAY[to];
    return [pawnPos, w.hall, w.room, roomCenterPt(to)];
  }else{
    const w=WAY[from];
    return [pawnPos, w.room, w.hall, roomCenterPt("hallway")];
  }
}

/* =====================================================================
   이동 요청 — 행동력 확인 → 팝업
   ===================================================================== */
let _pawnMoving=null;
function requestMove(k){
  if(!D.canAct()) return;               // 조사자 단계·이동중 아닐 때만(비조사자 단계 이동 방지)
  if(!ADJ[S.cur].includes(k)) return;   // 연결 안 됨
  if(ROOMS[k].locked){                // 장벽으로 막힌 방
    showPopup('<span class="warn">들어갈 수 없습니다.</span><br>'+ROOMS[k].name+' 앞이 불타는 장벽으로 막혀 있습니다.',
      [{label:"확인", primary:true, act:hidePopup}]);
    return;
  }
  if(S.actionPoints<=0){
    showPopup('<span class="warn">행동력이 없습니다.</span><br>이동하려면 행동력이 필요합니다.',
      [{label:"확인", primary:true, act:hidePopup}]);
    return;
  }
  showPopup('<span class="hl">'+ROOMS[k].name+'</span>(으)로 이동합니다.<br>이동에 <span class="hl">행동력 1</span>이 소모됩니다.',
    [{label:"취소", act:hidePopup},
     {label:"이동", primary:true, act:()=>{ hidePopup(); doMove(k); }}]);
}
function doMove(k){
  const extra = actionSurchargeFor("move");
  if(S.actionPoints < 1+extra){ showToast("행동력이 부족합니다."+(extra?" (공포에 얼어붙다: 이번 라운드 첫 이동은 행동 "+(1+extra)+")":"")); return; }
  markSurcharge("move");
  S.actionPoints -= (1+extra); updateAP();
  provokeAoO(()=>{   // 이동은 행동 → 교전 중 준비된 적의 기회공격 먼저
    // 교전 적은 (비정예·별도 지시 없으면) 조사자를 따라 함께 이동 — 교전 유지
    S.enemies.forEach(en=>{ if(en.engaged && en.room===S.cur){ en.room=k; addLog(enemyCard(en).name+"이(가) 교전 상태로 따라 이동합니다."); } });
    renderEnemyMarkers();
    _walkTo=null;                          // 방내 걷기 취소
    overview=false;                       // 전체보기였어도 줌인으로 전환해 따라감
    wantYaw=Math.PI*1.22; wantPitch=0.78; // 방 보기 각도
    const path=buildPath(S.cur, k);
    _pawnMoving={path, seg:0, t:0, key:k};  // 경유점 경로 따라 이동
  });
}

/* 거실 장벽 해제 — 2막 "장벽" 전진 시 호출(지금은 준비만) */
function unlockParlor(){
  ROOMS.parlor.locked=false;
  fireBarrier.visible=false;            // 불 장벽 사라짐
  renderRoomButtons();                  // 버튼 활성화
}

function setStageVisible(stage){
  S.currentStage = stage;
  // 방 그룹
  Object.keys(ROOMS).forEach(k=>{
    if(groups[k]) groups[k].visible = (ROOMS[k].stage===stage);
  });
  // 저택 부속(계단·문)
  mansionExtras.forEach(g=>{ g.visible = (stage==="mansion"); });
  // 불 장벽: mansion이고 거실이 잠겨있을 때만
  fireBarrier.visible = (stage==="mansion" && ROOMS.parlor.locked);
  // 단서: 해당 stage 방의 것만 보임
  clueMeshes.forEach(c=>{
    const inStage = ROOMS[c.room] && ROOMS[c.room].stage===stage;
    if(!c.collected) c.mesh.visible = inStage;
  });
  // 이름표: 다음 updateTags에서 stage 따라 처리됨
}

/* 카메라 포커스 */
let overview=false;

function updateLocInfo(){
  const R=ROOMS[S.cur];
  const remain=cluesInRoom(S.cur).length;   // 아직 안 가져간 단서 수
  const mod=S.shroudMod[S.cur]||0;
  const shroudTxt = R.shroud + (mod?' <span class="li-mod">(+'+mod+')</span>':'');   // 원래값 옆에 (+2)
  document.getElementById("loc-info").innerHTML="장막 "+shroudTxt+" · 남은 단서 "+remain;
  if(typeof renderRoomTags==="function") renderRoomTags();   // 공개된 방 이름표의 남은 단서 등 갱신
}
function focusRoom(k){
  S.cur=k; overview=false;
  // 처음 들어간 방 → 공개(안개 영구 제거) + 강제 진입 효과
  if(ROOMS[k].stage==="mansion" && !S.revealedRooms[k]){
    S.revealedRooms[k]=true;
    syncUnrevealedFog();
    addLog(ROOMS[k].name+"에 처음 들어와 장소를 밝혔습니다.");
    const info=ROOM_INFO[k]||{};
    if(info.onEnterHorror){ addLog("강제 — "+ROOMS[k].name+"에 들어와 공포 "+info.onEnterHorror+"을(를) 받습니다."); takeDamageHorror(0, info.onEnterHorror, {source:"location"}, ()=>{}); }
    if(info.onEnterDamage){ addLog("강제 — "+ROOMS[k].name+"에 들어와 피해 "+info.onEnterDamage+"을(를) 받습니다."); takeDamageHorror(info.onEnterDamage, 0, {source:"location"}, ()=>{}); }
  }
  document.getElementById("cur").textContent="현재: "+ROOMS[k].name;
  updateLocInfo();
  renderRoomButtons();
  const c=roomCenter(k); wantTarget.set(c.x, c.y+1, c.z); wantFrustum=13;
  wantYaw=Math.PI*1.22; wantPitch=0.78;   // 방 안을 비스듬히 내려다보는 각도(반대편)
  checkActCondition();   // 위치 변화 순간 막 조건 재검사(복도 출입 등 — 제작자 설계)
}
function showOverview(){
  overview=true;
  wantYaw = Math.PI*1.22;
  wantPitch = 0.62;
  if(S.currentStage==="study"){
    const c=roomCenter("study"); wantTarget.set(c.x,c.y,c.z); wantFrustum=13;
  }else{
    wantTarget.set(14,0,0); wantFrustum=30;
  }
}

/* 상호작용 */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
let dragging=false,dragMoved=false,lx=0,ly=0;

/* 좌클릭 = 단서 클릭(조사) 우선, 아니면 현재 방 안 이동 */
let _walkTo=null;
let pendingInvestigate=null;   // 조사하러 걸어가는 중인 단서
// 진행 중이던 맵 행동·예약을 전부 취소하고 말을 그 자리에 고정(컷신 시작 등에서 호출)
function cancelAllMapActions(){
  _walkTo=null;               // 방 내 걷기 취소(말이 그 자리에 멈춤)
  pendingInvestigate=null;   // 도착 시 조사 예약 취소
  _pawnMoving=null;           // 방 간 이동 취소
  hidePopup();               // 열려있던 조사/이동 확인 팝업 닫기
}
function clickWorld(e){
  // 컷신 중(csActive)·페이즈 전환 중(S.phaseBusy)·조사자 단계 아닐 때는 맵 조작 불가
  if(csActive || S.phaseBusy || S.currentPhase!=="investigation") return;
  const rect=renderer.domElement.getBoundingClientRect();
  mouse.x=((e.clientX-rect.left)/rect.width)*2-1; mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
  ray.setFromCamera(mouse,camera);
  const hit=ray.intersectObjects(scene.children,true);
  for(const h of hit){
    // 1) 현재 방의 단서 클릭 → 조사
    if(h.object.userData.clueRoom===S.cur && h.object.visible){
      const cm=clueMeshes.find(c=>c.mesh===h.object);
      if(cm) startInvestigate(cm);
      return;
    }
  }
  for(const h of hit){
    // 2) 현재 방 바닥 클릭 → 방 안 이동
    if(h.object.userData.floorOf===S.cur){
      const R=ROOMS[S.cur], p=h.point;
      const x=Math.max(R.x-R.w/2+1, Math.min(R.x+R.w/2-1, p.x));
      const z=Math.max(R.z-R.d/2+1, Math.min(R.z+R.d/2-1, p.z));
      _walkTo={x, z, y:R.y};
      return;
    }
  }
}

/* 조사: 단서로 걸어간 뒤 팝업 */
function startInvestigate(cm){
  _walkTo={x:cm.mesh.position.x, z:cm.mesh.position.z, y:ROOMS[S.cur].y};
  pendingInvestigate=cm;   // 도착하면 팝업
}

/* 3D 이름표 — 방 중심을 화면 좌표로 변환해 HTML 라벨 띄움.
   미공개: 이름만. 공개(처음 들어간 뒤): 이름+장막·남은단서+강제+승점 → 맵에서 상시 확인. */
function roomTagHtml(k){
  const R=ROOMS[k];
  if(!S.revealedRooms[k]) return R.name;   // 미공개 = 이름만(2층 등 표기 없음)
  const shroud=D.effShroud(k), remain=cluesInRoom(k).length, info=ROOM_INFO[k]||{};
  let h='<span class="rt-name">'+R.name+'</span>';
  h+='<span class="rt-sub">장막 '+shroud+' · 남은 단서 '+remain+'</span>';
  if(k==="parlor"){   // 거실: 후퇴는 상시, 협상 줄은 리타가 남아있을 때만
    let pi=info.withdrawInfo||"";
    if(S.ritaPawnActive && info.ritaInfo) pi += (pi?"<br>":"")+info.ritaInfo;
    if(pi) h+='<span class="rt-forced">'+pi+'</span>';
  } else if(info.info) h+='<span class="rt-forced">'+info.info+'</span>';
  if(info.victory) h+='<span class="rt-vp">승점 '+info.victory+'</span>';
  return h;
}
const tags={};

// 이름표 내용 갱신(공개 상태·단서 변화 시). 위치는 updateTags가 매 프레임 처리.
function renderRoomTags(){ Object.keys(tags).forEach(k=>{ tags[k].innerHTML=roomTagHtml(k); }); }
function updateTags(){
  Object.entries(ROOMS).forEach(([k,R])=>{
    // 현재 stage에 속한 방만 이름표 표시
    if(R.stage!==S.currentStage){ tags[k].style.display="none"; return; }
    const p=new THREE.Vector3(R.x,R.y+2.2,R.z).project(camera);
    const x=(p.x*0.5+0.5)*MAP_W, y=(-p.y*0.5+0.5)*MAP_H;
    const vis=p.z<1;
    tags[k].style.display=vis?"block":"none";
    tags[k].style.left=x+"px"; tags[k].style.top=y+"px";
    tags[k].style.opacity=(k===S.cur||overview)?1:0.65;
  });
  // 리타 챈들러(거실) — 저택 단계 + 리타 말이 살아있을 때만 표시(협상 성공 시 제거)
  const mansion = S.currentStage==="mansion";
  const ritaShow = mansion && !!S.ritaPawnActive;
  ritaPawn.visible = ritaShow;
  if(!ritaShow){ ritaTag.style.display="none"; }
  else{
    const p=new THREE.Vector3(ROOMS.parlor.x, ROOMS.parlor.y+2.4, ROOMS.parlor.z).project(camera);
    ritaTag.style.display=(p.z<1)?"block":"none";
    ritaTag.style.left=((p.x*0.5+0.5)*MAP_W)+"px"; ritaTag.style.top=((-p.y*0.5+0.5)*MAP_H)+"px";
  }
}

const barricadeEls = {};
export const BARRICADE_SVG = '<svg viewBox="0 0 64 48" width="58" height="44">'+   // 부착물 아이콘(threats.js attachmentIcon이 사용)
  '<rect x="12" y="6" width="8" height="40" rx="2" fill="#6b4526" stroke="#2a1810" stroke-width="1.5"/>'+
  '<rect x="44" y="6" width="8" height="40" rx="2" fill="#6b4526" stroke="#2a1810" stroke-width="1.5"/>'+
  '<rect x="4" y="16" width="56" height="10" rx="2" fill="#8a5f38" stroke="#2a1810" stroke-width="1.5"/>'+
  '<rect x="4" y="30" width="56" height="10" rx="2" fill="#7a5230" stroke="#2a1810" stroke-width="1.5"/></svg>';
// 자욱한 안개 — 회색 구름 뭉치
const FOG_SVG = '<svg viewBox="0 0 64 48" width="58" height="44">'+
  '<g fill="#c8cdd6" opacity="0.9" stroke="#8b93a0" stroke-width="1.2">'+
  '<ellipse cx="22" cy="30" rx="16" ry="11"/>'+
  '<ellipse cx="42" cy="27" rx="15" ry="12"/>'+
  '<ellipse cx="32" cy="22" rx="13" ry="10"/></g>'+
  '<g fill="#e3e7ee" opacity="0.55"><ellipse cx="28" cy="26" rx="9" ry="6"/></g></svg>';

// 안개 3D 볼륨 — 방 부피(w×d, 높이 2.6)에 반투명(25%) 박스. 부착/해제에 따라 생성·제거.
const fogMeshes = {};
function syncFogMeshes(){
  Object.keys(ROOMS).forEach(k=>{
    const hasFog = (S.locationAttachments[k]||[]).some(a=>a.shroudMod);
    if(hasFog && !fogMeshes[k]){
      const R=ROOMS[k];
      const m=new THREE.Mesh(
        new THREE.BoxGeometry(R.w-0.4, 2.6, R.d-0.4),
        new THREE.MeshBasicMaterial({ color:0xc8cdd6, transparent:true, opacity:0.25, depthWrite:false }));
      m.position.set(R.x, R.y+1.4, R.z);
      scene.add(m); fogMeshes[k]=m;
    }else if(!hasFog && fogMeshes[k]){
      scene.remove(fogMeshes[k]); fogMeshes[k]=null; delete fogMeshes[k];
    }
  });
}
// 미공개 방 안개 — 회색 불투명 박스로 방을 가림(아직 못 들어가 본 방). 들어가면 영구 제거.
const unrevealedFog = {};
function syncUnrevealedFog(){
  Object.keys(ROOMS).forEach(k=>{
    const hide = ROOMS[k].stage==="mansion" && k!=="hallway" && !S.revealedRooms[k];
    if(hide && !unrevealedFog[k]){
      const R=ROOMS[k];
      const m=new THREE.Mesh(
        new THREE.BoxGeometry(R.w+0.2, 3.0, R.d+0.2),
        new THREE.MeshBasicMaterial({ color:0x33333c, transparent:true, opacity:0.92, depthWrite:false }));
      m.position.set(R.x, R.y+1.5, R.z);
      m.renderOrder = 5;
      scene.add(m); unrevealedFog[k]=m;
    }else if(!hide && unrevealedFog[k]){
      scene.remove(unrevealedFog[k]); delete unrevealedFog[k];
    }
  });
}
function renderBarricades(){   // 마커 DOM 생성/제거 + 한 장소 여러 부착물 = 가로 배열(버프바처럼)
  Object.keys(barricadeEls).forEach(k=>{ if(!(S.locationAttachments[k]||[]).length){ barricadeEls[k].remove(); delete barricadeEls[k]; } });
  Object.keys(S.locationAttachments).forEach(k=>{
    const atts = S.locationAttachments[k]||[]; if(!atts.length) return;
    let d = barricadeEls[k];
    if(!d){ d=document.createElement("div"); d.className="barricade-marker"; wrap.appendChild(d); barricadeEls[k]=d; }
    d.innerHTML = '<div class="bm-row">'+ atts.map(a=>'<div class="bm-item">'+attachmentIcon(a)+'<div class="bm-label">'+attachmentLabel(a)+'</div></div>').join("") +'</div>';   // 가운데 정렬로 가로 늘어놓기
  });
  syncFogMeshes();   // 안개 3D 볼륨 동기화
}
function updateBarricades(){
  // 일반 처리(반응형·인원수 기반): 설치 당시보다 조사자 수가 줄면(어떤 방법으로 벗어났든) 버림.
  // → 이동·막 전환·이야기·순간이동 등 상황마다 훅 불필요. countInvestigatorsAt만 멀티로 확장하면 N인 공통.
  Object.keys(S.locationAttachments).forEach(sweepAttachmentLeaves);
  // 마커 위치 갱신(장소 중앙, 이름표와 동일 방식)
  Object.keys(barricadeEls).forEach(k=>{
    const R=ROOMS[k], el=barricadeEls[k];
    if(!R || R.stage!==S.currentStage){ el.style.display="none"; return; }
    const p=new THREE.Vector3(R.x, R.y+0.8, R.z).project(camera);
    el.style.display=(p.z<1)?"block":"none";
    el.style.left=(p.x*0.5+0.5)*MAP_W+"px"; el.style.top=(-p.y*0.5+0.5)*MAP_H+"px";
  });
}

// 어떤 요소의 화면 위치 → stage 좌표 중심점
// 방의 3D 중심 → stage 좌표(마커와 같은 투영)
function roomStagePos(k){
  const R=ROOMS[k];
  const p=new THREE.Vector3(R.x, R.y+1, R.z).project(camera);
  const wr=wrap.getBoundingClientRect();
  return { x: toStageX(wr.left + (p.x*0.5+0.5)*wr.width), y: toStageY(wr.top + (-p.y*0.5+0.5)*wr.height) };
}

const enemyRowEls = {};   // roomKey → 가로 배열 마커(바리케이드와 동일 패턴)

// 적 마커 — 방 위 가로 배열(카드 미니 + HP). 소진=회색.
function renderEnemyMarkers(){
  Object.keys(enemyRowEls).forEach(k=>{ if(!enemiesAt(k).length){ enemyRowEls[k].remove(); delete enemyRowEls[k]; } });
  Object.keys(ROOMS).forEach(k=>{
    const list=enemiesAt(k); if(!list.length) return;
    let d=enemyRowEls[k];
    if(!d){ d=document.createElement("div"); d.className="enemy-marker"; wrap.appendChild(d); enemyRowEls[k]=d; }
    const ghoulN = (S.agenda3aRule && (k==="parlor"||k==="hallway")) ? ghoulsInRoom(k) : 0;   // 특별규칙 파멸 예측 배지
    d.innerHTML='<div class="em-row">'+list.map(en=>
      '<div class="em-item'+(en.exhausted?" em-exh":"")+(en.engaged?" em-eng":"")+'" data-code="'+en.code+'" data-ei="'+S.enemies.indexOf(en)+'">'+
      (en.engaged?'<div class="em-eng-name">🎯 '+D.leadInvestigatorName()+'</div>':"")+   // 머리 위: 교전 중인 조사자
      '<img src="'+cardFront(en.code)+'" alt="">'+
      '<div class="em-hp">'+(enemyHealth(en)-en.dmg)+'/'+enemyHealth(en)+'</div></div>').join("")+'</div>'+
      (ghoulN>0 ? '<div class="em-ghoul">☠ 구울 '+ghoulN+'</div>' : "");
    d.querySelectorAll(".em-item").forEach(el=>{
      el.addEventListener("mouseenter", ()=> showCardInfo(el, el.dataset.code, "left"));   // 호버 → 적 카드 크게 + 번역
      el.addEventListener("mouseleave", hideCardInfo);
      el.addEventListener("click", (e)=>{ e.stopPropagation(); openEnemyMenu(S.enemies[+el.dataset.ei], e.clientX, e.clientY); });   // 좌클릭 → 적 액션 메뉴
    });
  });
  if(S.agenda3aRule) updateDoom();   // 특별규칙 파멸 예측치(라운드끝 +N) 동기화
}
function updateEnemyMarkers(){   // 매 프레임 위치 갱신(방 위 살짝 높게)
  Object.keys(enemyRowEls).forEach(k=>{
    const R=ROOMS[k], el=enemyRowEls[k];
    if(!R || R.stage!==S.currentStage){ el.style.display="none"; return; }
    const p=new THREE.Vector3(R.x, R.y+2.6, R.z).project(camera);
    el.style.display=(p.z<1)?"block":"none";
    el.style.left=(p.x*0.5+0.5)*MAP_W+"px"; el.style.top=(-p.y*0.5+0.5)*MAP_H+"px";
  });
}

function animate(){
  requestAnimationFrame(animate);
  if(roomsPanel) roomsPanel.classList.toggle("act-locked", !D.canAct());   // 조사자 단계·이동중 아니면 연결장소 흐림
  if(_pawnMoving){
    // 경유점 경로를 구간별로 따라감 (더 느리게: 0.018→0.011)
    _pawnMoving.t += 0.011;
    let t=_pawnMoving.t;
    const path=_pawnMoving.path, i=_pawnMoving.seg;
    const a=path[i], b=path[i+1];
    const e=t<0.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    pawn.position.x=a.x+(b.x-a.x)*e;
    pawn.position.y=a.y+(b.y-a.y)*e;
    pawn.position.z=a.z+(b.z-a.z)*e;
    // 카메라가 이동 중 캐릭터를 따라감(줌인 상태 유지)
    if(!overview){
      wantTarget.set(pawn.position.x, pawn.position.y+1, pawn.position.z);
      wantFrustum=13;
    }
    if(t>=1){
      _pawnMoving.t=0; _pawnMoving.seg++;
      if(_pawnMoving.seg >= path.length-1){   // 마지막 구간 끝 → 도착
        const k=_pawnMoving.key; _pawnMoving=null; placePawn(k); focusRoom(k);
      }
    }
  }
  // 방 안에서 걷기(좌클릭 목적지로, 속도 절반의 절반)
  if(_walkTo && !_pawnMoving){
    pawn.position.x += (_walkTo.x-pawn.position.x)*0.045;
    pawn.position.z += (_walkTo.z-pawn.position.z)*0.045;
    if(Math.abs(_walkTo.x-pawn.position.x)<0.05 && Math.abs(_walkTo.z-pawn.position.z)<0.05){
      _walkTo=null;
      // 단서로 걸어온 거였으면 도착 시 조사 팝업
      if(pendingInvestigate){ const cm=pendingInvestigate; pendingInvestigate=null; D.askInvestigate(cm); }
    }
  }
  // 단서 토큰 둥둥 떠오르고 회전(눈에 띄게)
  clueMeshes.forEach((c,idx)=>{
    if(!c.mesh.visible) return;
    c.mesh.position.y = c.mesh.userData.baseY + Math.sin(Date.now()*0.002 + idx)*0.12;
    c.mesh.rotation.y += 0.02;
  });
  // 이동 중 카메라 추적은 빠르게 반응(끊김 방지)
  camTarget.lerp(wantTarget, _pawnMoving ? 0.15 : 0.08);
  camYaw += (wantYaw-camYaw)*0.08;
  camPitch += (wantPitch-camPitch)*0.08;
  frustum+=(wantFrustum-frustum)*0.08;
  const a=MAP_W/MAP_H;
  camera.left=-frustum*a;camera.right=frustum*a;camera.top=frustum;camera.bottom=-frustum;
  camera.updateProjectionMatrix(); applyCamera();
  pawn.children[1].position.y=1.25+Math.sin(Date.now()*0.003)*0.04;
  animateFire();
  renderer.render(scene,camera);
  updateTags();
  updateBarricades();
  updateEnemyMarkers();
  resolveEngagements();   // 반응형: 조사자·적이 같은 방이 되는 순간(이동·등장·사냥꾼) 자동 교전
}

/* =====================================================================
   initMap3d — 최상위 명령부(방 빌드·가구·계단·단서·말·리스너·애니메이션 시작).
   S를 읽고 주입 함수·순환 import를 호출하므로 부팅(주입 완료) 이후 실행한다.
   ===================================================================== */
export function initMap3d(){
Object.keys(ROOMS).forEach(buildRoom);
/* ---- 서재: 책장 + 책상 + 의자 + 카펫(서재다움) ---- */
flat("study",7,0.06,5, 0,0.05,1, 0x5a2a2a);                 // 붉은 카펫
// 벽쪽 책장 3개
furn("study",4,2.6,0.5, 0,1.3,-6, 0x3a2718);
furn("study",0.5,2.6,4, -6,1.3,-1, 0x3a2718);
furn("study",0.5,2.6,4, 6,1.3,-1, 0x3a2718);
// 책상 + 의자
furn("study",3,0.9,1.6, 0,0.45,1.5, 0x4a3526);             // 책상
furn("study",1.2,0.5,1.2, 0,0.25,3.4, 0x3a2a1e);           // 의자(좌석)
furn("study",1.2,1.2,0.2, 0,0.85,4, 0x3a2a1e);             // 의자 등받이
// 책상 위 촛대
furn("study",0.2,0.7,0.2, -1,1.25,1.5, 0x2a2a2a, false);
// 작은 협탁
furn("study",1,0.7,1, 4.5,0.35,3.5, 0x4a3526);

/* ---- 복도: 긴 양탄자 + 촛대들 + 액자 ---- */
flat("hallway",3,0.06,21, 0,0.06,0, 0x6e3038);            // 붉은 러너
for(let z=-9;z<=9;z+=4.5){                                  // 양옆 촛대
  furn("hallway",0.25,1.3,0.25, 3,0.65,z, 0x2a2a2a);
  furn("hallway",0.25,1.3,0.25, -3,0.65,z, 0x2a2a2a);
}

/* ---- 거실: 소파 + 안락의자 + TV장+TV + 커피테이블 + 협탁+스탠드 ---- */
// 소파(등받이+좌석)
furn("parlor",4,0.5,1.4, -3,0.45,3, 0x6a4636);
furn("parlor",4,0.7,0.4, -3,0.7,3.6, 0x5a3a2c);
// 안락의자
furn("parlor",1.4,0.5,1.4, 3.5,0.45,3, 0x6a4636);
furn("parlor",1.4,0.7,0.35,3.5,0.7,3.6, 0x5a3a2c);
// TV장 + TV(검은 화면)
furn("parlor",4,0.8,1, 0,0.4,-5.5, 0x3a2a1e);
furn("parlor",3.2,1.8,0.2, 0,1.7,-5.8, 0x101014);        // TV 화면
// 커피테이블
furn("parlor",2.2,0.5,1.2, -1,0.25,0.5, 0x4a3526);
// 협탁 + 스탠드 램프
furn("parlor",0.8,0.6,0.8, 5.5,0.3,0, 0x4a3526);
furn("parlor",0.15,1.6,0.15, 5.5,1.1,0, 0x2a2a2a);
furn("parlor",0.6,0.4,0.6, 5.5,2.0,0, 0xc9a86a);          // 갓
// 책장(벽쪽)
furn("parlor",0.5,2,3, -6.8,1,-3, 0x3a2718);

/* ---- 다락방: 부피 큰 박스 더미 + 트렁크 + 천 덮인 가구 + 옷걸이 ---- */
furn("attic",2,2,2, -4,1,-4, 0x7a5a3a);                   // 큰 박스
furn("attic",1.6,1.6,1.6, -4.5,0.8,-1.5, 0x6a4e30);
furn("attic",1.8,1.4,1.8, -2,0.7,-4.5, 0x836234);
furn("attic",2.4,1.2,1.6, 3.5,0.6,-4, 0x6a4e30);          // 눕힌 박스
furn("attic",2,1,1.4, 4,0.5,3, 0x5a4228);                 // 트렁크(무기궤)
furn("attic",1.6,1.8,1.6, -4,0.9,3.5, 0x8a7a6a);          // 천 덮인 가구
furn("attic",0.2,2.4,2.5, 5.5,1.2,0, 0x3a2a1e);           // 옷걸이 봉
furn("attic",1.2,1.2,1.2, 1,0.6,4.5, 0x7a5a3a);           // 작은 박스

/* ---- 지하실: 나무통 + 선반(병들) + 돌기둥 + 궤짝 + 거미줄느낌 모서리 ---- */
furn("cellar",1.2,1.6,1.2, -4,0.8,-4, 0x4a3526);          // 통1
furn("cellar",1.2,1.6,1.2, -2.5,0.8,-4.3, 0x42301f);     // 통2
furn("cellar",1,2.6,1, 4.5,1.3,4.5, 0x3a3a40);            // 돌기둥
furn("cellar",1,2.6,1, 4.5,1.3,-4.5, 0x3a3a40);           // 돌기둥
furn("cellar",3,1.8,0.6, -5,0.9,2, 0x3a2a1e);             // 선반
// 선반 위 병들(작은 원기둥)
for(let i=0;i<5;i++){
  const b=new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.5,8),mat(0x3a5a4a,0.4,0.2));
  b.position.set(-6+i*0.5,2.1,2); b.castShadow=true; groups.cellar.add(b);
}
furn("cellar",1.8,1,1.2, 2,0.5,-4, 0x4a3526);             // 궤짝
furn("cellar",1.4,1.2,1.4, 3,0.6,2, 0x42301f);            // 통3
// 복도 오른쪽 끝(+z, x=4.5 가장자리) → 다락방(22,12,16)으로 상승
stairs(4.5,0.2,12,  16,11.5,16,  0xf0d878);
// 복도 오른쪽 끝(-z) → 지하실(22,-12,-16)으로 하강
stairs(4.5,-0.2,-12, 16,-11.5,-16, 0x6ec0d8);
// 복도 중앙 오른쪽 → 거실(22,0,0) 평지 문 통로
(()=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(12,0.14,4),mat(0x5a4636,0.9));
  m.position.set(11,0,0); m.receiveShadow=true; scene.add(m); mansionExtras.push(m); })();
scatterClues();
placePawn("study");
wrap.appendChild(ritaTag);
// 리타 말/이름표 클릭·우클릭 → 협상(가능할 때)
ritaTag.addEventListener("click", (e)=>{ e.stopPropagation();
  if(D.ritaParleyAvailable()){ D.parleyRita(); return; }
  if(!S.ritaPawnActive) return;
  // 협상 불가 사유 구분: 거실·act3a 조건은 맞는데 행동력만 없으면 '행동력 없음'
  const inParlorNow = S.cur==="parlor" && S.parlorActionsActive && S.currentPhase==="investigation" && !S.phaseBusy;
  showToast(inParlorNow ? "남은 행동력이 없습니다." : "act3a 이후 거실에서 협상할 수 있습니다.");
});
ritaTag.addEventListener("contextmenu", (e)=>{ e.preventDefault(); e.stopPropagation(); if(D.ritaParleyAvailable()) D.parleyRita(); });
Object.entries(ROOMS).forEach(([k,R])=>{
  const t=document.createElement("div"); t.className="tag3d"; t.style.color=R.css;
  t.innerHTML=roomTagHtml(k);
  wrap.appendChild(t); tags[k]=t;
});
renderer.domElement.addEventListener("mousedown",e=>{ if(e.button!==0) return; dragging=true;dragMoved=false;lx=e.clientX;ly=e.clientY;});
addEventListener("mousemove",e=>{ if(!dragging)return; const dx=e.clientX-lx,dy=e.clientY-ly;
  if(Math.abs(dx)+Math.abs(dy)>2)dragMoved=true;
  camYaw-=dx*0.005; camPitch=Math.max(0.15,Math.min(1.4,camPitch+dy*0.005));
  wantYaw=camYaw; wantPitch=camPitch;   // 수동 회전은 즉시 반영
  lx=e.clientX;ly=e.clientY; });
addEventListener("mouseup",e=>{ if(e.button!==0){dragging=false;return;} if(dragging&&!dragMoved)clickWorld(e); dragging=false; });
renderer.domElement.addEventListener("wheel",e=>{e.preventDefault();
  wantFrustum*=(1+(e.deltaY>0?0.08:-0.08)); wantFrustum=Math.max(5,Math.min(22,wantFrustum));},{passive:false});
document.getElementById("ov-btn").onclick=showOverview;
// 현재 위치(방)를 클로즈업으로 다시 보기
document.getElementById("here-btn").onclick=()=>focusRoom(S.cur);
setStageVisible("study");   // 시작은 서재만 보임(저택 숨김)
renderRoomButtons();
updateLocInfo();
focusRoom("study");   // 1막 시작 = 서재 클로즈업
animate();
}

// ---- 게터(가변 상태를 라이브로 노출) ----
export function pawnMoving(){ return _pawnMoving; }
export function walkTo(){ return _walkTo; }

export { pawn, renderEnemyMarkers, roomStagePos, renderRoomTags, renderRoomButtons, updateLocInfo,
  setStageVisible, placePawn, syncUnrevealedFog, syncFogMeshes, renderBarricades, unlockParlor,
  showOverview, startInvestigate, cancelAllMapActions };
