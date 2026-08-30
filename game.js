import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161/build/three.module.js";

let scene,camera,renderer,clock;
let player, gun, muzzle;
let zombies=[], bullets=[], particles=[], obstacles=[];
let hp=100, ammo=12, reserve=60, score=0, wave=1, alive=false;
let moveX=0,moveZ=0, yaw=0,pitch=-0.12, yVel=0,onGround=true;
let firing=false,lastShot=0,reloading=false,spawnTimer=0,killsThisWave=0;
const $=id=>document.getElementById(id);

function init(){
 scene=new THREE.Scene();
 scene.background=new THREE.Color(0x08100b);
 scene.fog=new THREE.Fog(0x08100b,28,125);
 camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,200);
 renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));
 renderer.setSize(innerWidth,innerHeight);
 renderer.shadowMap.enabled=true;
 document.body.appendChild(renderer.domElement);
 clock=new THREE.Clock();

 const hemi=new THREE.HemisphereLight(0x9ab6a0,0x101010,1.6);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xd8e6cf,1.5);sun.position.set(-30,45,20);sun.castShadow=true;scene.add(sun);

 makeWorld(); makePlayer(); setupControls(); resize();
 renderer.setAnimationLoop(loop);
}
function mat(c){return new THREE.MeshStandardMaterial({color:c,roughness:.85})}
function box(x,y,z,c){let m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat(c));m.castShadow=true;m.receiveShadow=true;return m}
function makeWorld(){
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat(0x1d2a20));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const road=box(18,.08,180,0x171a18);road.position.y=.04;scene.add(road);
 const road2=box(180,.08,18,0x171a18);road2.position.y=.045;scene.add(road2);
 for(let i=0;i<55;i++){
  let x=(Math.random()-.5)*145,z=(Math.random()-.5)*145;
  if(Math.abs(x)<14||Math.abs(z)<14)continue;
  if(Math.random()<.55) makeTree(x,z); else makeBuilding(x,z);
 }
 for(let i=0;i<25;i++){let o=box(1+Math.random()*2,.8,1+Math.random()*2,0x4a3c2c);o.position.set((Math.random()-.5)*100,.4,(Math.random()-.5)*100);scene.add(o);obstacles.push(o)}
}
function makeTree(x,z){
 const g=new THREE.Group();
 let trunk=box(.7,4,.7,0x543a26);trunk.position.y=2;g.add(trunk);
 let crown=new THREE.Mesh(new THREE.SphereGeometry(2.4,10,8),mat(0x173c21));crown.position.y=5;g.add(crown);
 g.position.set(x,0,z);scene.add(g);obstacles.push(g);
}
function makeBuilding(x,z){
 const h=3+Math.random()*8,w=5+Math.random()*8,d=5+Math.random()*8;
 let b=box(w,h,d,0x3b413e);b.position.set(x,h/2,z);scene.add(b);obstacles.push(b);
}
function makePlayer(){
 player=new THREE.Group();
 let body=box(1.05,1.5,.7,0x315b40);body.position.y=1.55;player.add(body);
 let head=new THREE.Mesh(new THREE.SphereGeometry(.43,16,12),mat(0xd09b72));head.position.y=2.62;player.add(head);
 let leg1=box(.3,1.1,.32,0x20272a),leg2=leg1.clone();leg1.position.set(-.23,.55,0);leg2.position.set(.23,.55,0);player.add(leg1,leg2);
 player.position.set(0,0,12);scene.add(player);
 gun=box(.18,.18,1.05,0x111313);gun.position.set(.55,1.9,-.65);gun.rotation.x=-.05;player.add(gun);
 muzzle=new THREE.Mesh(new THREE.SphereGeometry(.09,8,8),mat(0xffa23b));muzzle.position.set(0,0,-.58);gun.add(muzzle);muzzle.visible=false;
 camera.position.set(0,3.1,5.5);player.add(camera);
}
function zombie(){
 const z=new THREE.Group();
 let body=box(.9,1.4,.65,0x4b6949);body.position.y=1.25;z.add(body);
 let head=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),mat(0x709064));head.position.y=2.25;z.add(head);
 let eye=mat(0xe84132);for(let s of [-1,1]){let e=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),eye);e.position.set(s*.16,2.31,-.37);z.add(e)}
 let leg=box(.28,1,.28,0x2e332d);let l2=leg.clone();leg.position.set(-.2,.5,0);l2.position.set(.2,.5,0);z.add(leg,l2);
 let angle=Math.random()*Math.PI*2,dist=30+Math.random()*35;
 z.position.set(player.position.x+Math.cos(angle)*dist,0,player.position.z+Math.sin(angle)*dist);
 z.userData={speed:1.2+Math.random()*.7,hp:40+wave*6,hit:0,attack:0};
 scene.add(z);zombies.push(z);
}
function shoot(){
 if(!alive||reloading||ammo<=0)return;
 const now=performance.now();if(now-lastShot<145)return;lastShot=now;ammo--;updateHud();
 muzzle.visible=true;setTimeout(()=>muzzle.visible=false,45);
 const dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize();
 const start=camera.getWorldPosition(new THREE.Vector3());
 const b=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),mat(0xffd27a));b.position.copy(start);b.userData={vel:dir.multiplyScalar(65),life:1.1};scene.add(b);bullets.push(b);
 if(ammo===0&&reserve>0)reload();
}
function reload(){
 if(reloading||ammo===12||reserve<=0)return;
 reloading=true;$("message").textContent="RELOADING...";
 setTimeout(()=>{let need=12-ammo,take=Math.min(need,reserve);ammo+=take;reserve-=take;reloading=false;$("message").textContent="";updateHud()},850);
}
function damage(n){
 hp=Math.max(0,hp-n);updateHud();
 if(hp<=0)endGame();
}
function kill(z){
 scene.remove(z);zombies.splice(zombies.indexOf(z),1);score+=10;killsThisWave++;
 burst(z.position,0x8bd27b);updateHud();
 if(killsThisWave>=wave*8){wave++;killsThisWave=0;$("message").textContent="WAVE "+wave;setTimeout(()=>$("message").textContent="",1000)}
}
function burst(pos,c){
 for(let i=0;i<9;i++){let p=new THREE.Mesh(new THREE.SphereGeometry(.045,5,5),mat(c));p.position.copy(pos);p.userData={v:new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4),life:.5};scene.add(p);particles.push(p)}
}
function updateZombies(dt){
 for(let i=zombies.length-1;i>=0;i--){
  let z=zombies[i],d=new THREE.Vector3().subVectors(player.position,z.position),dist=d.length();
  if(dist>2.0){d.y=0;d.normalize();z.position.addScaledVector(d,z.userData.speed*dt);z.lookAt(player.position.x,z.position.y,player.position.z)}
  else {z.userData.attack-=dt;if(z.userData.attack<=0){damage(7);z.userData.attack=.8}}
 }
}
function updateBullets(dt){
 for(let i=bullets.length-1;i>=0;i--){
  let b=bullets[i];b.position.addScaledVector(b.userData.vel,dt);b.userData.life-=dt;
  let hit=false;
  for(let j=zombies.length-1;j>=0;j--){
   let z=zombies[j];if(b.position.distanceTo(z.position.clone().add(new THREE.Vector3(0,1.3,0)))<1){z.userData.hp-=25;hit=true;burst(b.position,0xffb347);if(z.userData.hp<=0)kill(z);break}
  }
  if(hit||b.userData.life<=0){scene.remove(b);bullets.splice(i,1)}
 }
}
function updateParticles(dt){
 for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.userData.life-=dt;p.userData.v.y-=8*dt;p.position.addScaledVector(p.userData.v,dt);if(p.userData.life<=0){scene.remove(p);particles.splice(i,1)}}
}
function updatePlayer(dt){
 const forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
 const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
 let v=new THREE.Vector3().addScaledVector(right,moveX).addScaledVector(forward,moveZ);
 if(v.lengthSq()>0){v.normalize();player.position.addScaledVector(v,5.2*dt);player.rotation.y=Math.atan2(v.x,v.z)}
 player.position.x=THREE.MathUtils.clamp(player.position.x,-82,82);player.position.z=THREE.MathUtils.clamp(player.position.z,-82,82);
 if(!onGround){yVel-=18*dt;player.position.y+=yVel*dt;if(player.position.y<=0){player.position.y=0;yVel=0;onGround=true}}
 camera.rotation.order="YXZ";camera.rotation.y=yaw-player.rotation.y;camera.rotation.x=pitch;
}
function updateHud(){$("hp").textContent=Math.ceil(hp);$("ammo").textContent=ammo;$("reserve").textContent=reserve;$("score").textContent=score;$("wave").textContent=wave}
function loop(){
 if(!alive){renderer.render(scene,camera);return}
 let dt=Math.min(clock.getDelta(),.04);
 updatePlayer(dt);updateZombies(dt);updateBullets(dt);updateParticles(dt);
 spawnTimer-=dt;if(spawnTimer<=0){let amount=Math.min(1+Math.floor(wave/2),4);for(let i=0;i<amount;i++)zombie();spawnTimer=Math.max(.7,2.8-wave*.12)}
 if(firing)shoot();
 renderer.render(scene,camera);
}
function startGame(){
 $("menu").classList.add("hidden");$("gameover").classList.add("hidden");$("hud").style.display="block";
 hp=100;ammo=12;reserve=60;score=0;wave=1;killsThisWave=0;alive=true;spawnTimer=.5;player.position.set(0,0,12);updateHud();
 zombies.forEach(z=>scene.remove(z));zombies=[];bullets.forEach(b=>scene.remove(b));bullets=[];clock.start();
}
function endGame(){alive=false;$("hud").style.display="none";$("finalScore").textContent=score;$("gameover").classList.remove("hidden")}
function setupControls(){
 $("start").onclick=startGame;$("again").onclick=startGame;$("reload").onclick=reload;
 $("fire").onpointerdown=e=>{e.preventDefault();firing=true;shoot()};$("fire").onpointerup=()=>firing=false;$("fire").onpointercancel=()=>firing=false;
 $("jump").onclick=()=>{if(onGround){onGround=false;yVel=7}};
 let joy=$("joystick"),stick=$("stick"),active=false,cx=0,cy=0;
 function joyMove(e){if(!active)return;let r=joy.getBoundingClientRect(),x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2;let len=Math.min(Math.hypot(x,y),48),a=Math.atan2(y,x);x=Math.cos(a)*len;y=Math.sin(a)*len;stick.style.transform=`translate(${x}px,${y}px)`;moveX=x/48;moveZ=y/48}
 joy.onpointerdown=e=>{active=true;joy.setPointerCapture(e.pointerId);joy.classList.add("joystick-active");joyMove(e)}
 joy.onpointermove=joyMove;joy.onpointerup=()=>{active=false;moveX=moveZ=0;stick.style.transform="translate(0,0)";joy.classList.remove("joystick-active")};
 let look=false,lx=0,ly=0;
 renderer.domElement.onpointerdown=e=>{if(e.clientX>innerWidth*.42&&e.clientY>70){look=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)}};
 renderer.domElement.onpointermove=e=>{if(!look||!alive)return;let dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1.1,.55)};
 renderer.domElement.onpointerup=()=>look=false;renderer.domElement.onpointercancel=()=>look=false;
 window.addEventListener("keydown",e=>{if(e.code==="KeyW")moveZ=-1;if(e.code==="KeyS")moveZ=1;if(e.code==="KeyA")moveX=-1;if(e.code==="KeyD")moveX=1;if(e.code==="Space"&&onGround){onGround=false;yVel=7}if(e.code==="KeyR")reload();if(e.code==="Mouse0")shoot()});
 window.addEventListener("keyup",e=>{if(["KeyW","KeyS"].includes(e.code))moveZ=0;if(["KeyA","KeyD"].includes(e.code))moveX=0});
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
addEventListener("resize",resize);init();
