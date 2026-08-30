import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.161/build/three.module.js";
let scene,camera,renderer,clock,player,rifle,scopeMesh;
let zombies=[],shots=[],fx=[],buildings=[],debris=[],alive=false,aiming=false,reloading=false,firing=false;
let hp=100,kills=0,wave=1,ammo=5,reserve=40,lastShot=0,spawnT=0,yaw=0,pitch=-.08,mx=0,mz=0;
const $=id=>document.getElementById(id), mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.82});
const box=(x,y,z,c)=>{let m=new THREE.Mesh(new THREE.BoxGeometry(x,y,z),mat(c));m.castShadow=true;m.receiveShadow=true;return m};
function init(){
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0a110c);scene.fog=new THREE.Fog(0x0a110c,30,120);
 camera=new THREE.PerspectiveCamera(68,innerWidth/innerHeight,.05,220);renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);clock=new THREE.Clock();
 scene.add(new THREE.HemisphereLight(0x9fb7a3,0x12100d,1.5));let sun=new THREE.DirectionalLight(0xffe7bd,2);sun.position.set(-30,45,25);sun.castShadow=true;scene.add(sun);
 world();makePlayer();controls();addEventListener("resize",resize);resize();renderer.setAnimationLoop(loop);
}
function world(){
 let g=new THREE.Mesh(new THREE.PlaneGeometry(180,180),mat(0x263329));g.rotation.x=-Math.PI/2;g.receiveShadow=true;scene.add(g);
 let road=box(20,.08,180,0x171a18);road.position.y=.04;scene.add(road);let road2=box(180,.08,20,0x171a18);road2.position.y=.045;scene.add(road2);
 for(let i=0;i<18;i++){let x=(Math.random()-.5)*125,z=(Math.random()-.5)*125;if(Math.abs(x)<16||Math.abs(z)<16)continue;makeHouse(x,z)}
 for(let i=0;i<25;i++){let o=box(1+Math.random()*2,.7,1+Math.random()*2,0x4a3a2c);o.position.set((Math.random()-.5)*120,.35,(Math.random()-.5)*120);scene.add(o)}
}
function makeHouse(x,z){
 let group=new THREE.Group(),w=5+Math.random()*5,d=5+Math.random()*5,h=4+Math.random()*3;
 let wall=box(w,h,d,0x4b514b);wall.position.y=h/2;group.add(wall);
 let roof=new THREE.Mesh(new THREE.ConeGeometry(Math.max(w,d)*.72,2.5,4),mat(0x343a35));roof.position.y=h+1.15;roof.rotation.y=Math.PI/4;group.add(roof);
 let door=box(1.1,2,.12,0x201914);door.position.set(0,1,-d/2-.07);group.add(door);
 group.position.set(x,0,z);scene.add(group);buildings.push({group,hp:120,max:120,parts:[wall,roof,door],center:new THREE.Vector3(x,h/2,z),radius:Math.max(w,d)*.7});
}
function makePlayer(){
 player=new THREE.Group();let body=box(1,1.45,.65,0x355b40);body.position.y=1.5;player.add(body);
 let head=new THREE.Mesh(new THREE.SphereGeometry(.42,12,10),mat(0xc99570));head.position.y=2.55;player.add(head);
 let leg=box(.3,1.1,.3,0x252a29),leg2=leg.clone();leg.position.set(-.22,.55,0);leg2.position.set(.22,.55,0);player.add(leg,leg2);
 rifle=new THREE.Group();let stock=box(.22,.28,.85,0x222424);stock.position.z=.15;rifle.add(stock);let barrel=box(.12,.12,1.8,0x121616);barrel.position.z=-.95;rifle.add(barrel);
 let tube=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.7,12),mat(0x222a27));tube.rotation.x=Math.PI/2;tube.position.set(0,.23,-.35);rifle.add(tube);
 rifle.position.set(.48,1.72,-.72);player.add(rifle);scene.add(player);player.position.set(0,0,13);
}
function makeZombie(){
 let z=new THREE.Group(),body=box(.9,1.35,.65,0x4b7049);body.position.y=1.2;z.add(body);
 let head=new THREE.Mesh(new THREE.SphereGeometry(.43,12,10),mat(0x759469));head.position.y=2.25;z.add(head);
 let eye=mat(0xf24b3b);[-1,1].forEach(s=>{let e=new THREE.Mesh(new THREE.SphereGeometry(.055,6,6),eye);e.position.set(s*.15,2.3,-.38);z.add(e)});
 let a=Math.random()*6.28,d=35+Math.random()*45;z.position.set(player.position.x+Math.cos(a)*d,0,player.position.z+Math.sin(a)*d);
 z.userData={hp:45+wave*8,speed:1.1+Math.random()*.75,hit:0,attack:0};scene.add(z);zombies.push(z);
}
function muzzle(){
 let p=new THREE.PointLight(0xffb14a,12,7);p.position.set(.48,1.8,-1.5);player.add(p);setTimeout(()=>player.remove(p),65);
 for(let i=0;i<10;i++){let s=new THREE.Mesh(new THREE.SphereGeometry(.035,5,5),mat(0xff9c39));s.position.copy(p.getWorldPosition(new THREE.Vector3()));s.userData={v:new THREE.Vector3((Math.random()-.5)*3,Math.random()*2,(Math.random()-.5)*3),life:.25};scene.add(s);fx.push(s)}
}
let audio=null;function sound(type){if(!audio)audio=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==="suspended")audio.resume();let o=audio.createOscillator(),g=audio.createGain(),n=audio.currentTime;
 o.type=type==="shot"?"sawtooth":"triangle";o.frequency.setValueAtTime(type==="shot"?110:220,n);o.frequency.exponentialRampToValueAtTime(type==="shot"?45:110,n+.13);g.gain.setValueAtTime(type==="shot"?.16:.08,n);g.gain.exponentialRampToValueAtTime(.001,n+.15);o.connect(g).connect(audio.destination);o.start(n);o.stop(n+.16)}
function shoot(){
 if(!alive||reloading||ammo<=0)return;let now=performance.now();if(now-lastShot<650)return;lastShot=now;ammo--;hud();muzzle();sound("shot");
 let dir=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion).normalize(),start=camera.getWorldPosition(new THREE.Vector3());
 let s={p:start.clone(),v:dir.multiplyScalar(115),life:1.4};shots.push(s);toast("STEEL ROUND • 200×");
 setTimeout(()=>toast(""),500);
}
function reload(){if(reloading||ammo===5||reserve<=0)return;reloading=true;sound("reload");toast("RELOADING...");setTimeout(()=>{let n=Math.min(5-ammo,reserve);ammo+=n;reserve-=n;reloading=false;hud();toast("")},1100)}
function destroyHouse(b,hit){
 b.hp-=hit;for(let i=0;i<5;i++){let d=box(.18,.18,.18,0x77756a);d.position.copy(b.center).add(new THREE.Vector3((Math.random()-.5)*5,Math.random()*3,(Math.random()-.5)*5));d.userData={v:new THREE.Vector3((Math.random()-.5)*6,Math.random()*5,(Math.random()-.5)*6),life:2};scene.add(d);debris.push(d)}
 if(b.hp<=0){scene.remove(b.group);buildings.splice(buildings.indexOf(b),1);toast("🏚 RUMAH HANCUR");setTimeout(()=>toast(""),700)}
}
function hitZombie(z,damage){z.userData.hp-=damage;burst(z.position,0xd94d4d);if(z.userData.hp<=0){scene.remove(z);zombies.splice(zombies.indexOf(z),1);kills++;if(kills%8===0)wave++;hud();sound("hit")}}
function burst(p,c){for(let i=0;i<8;i++){let q=new THREE.Mesh(new THREE.SphereGeometry(.04,5,5),mat(c));q.position.copy(p);q.userData={v:new THREE.Vector3((Math.random()-.5)*4,Math.random()*4,(Math.random()-.5)*4),life:.5};scene.add(q);fx.push(q)}}
function update(dt){
 let f=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),v=r.clone().multiplyScalar(mx).add(f.clone().multiplyScalar(mz));
 if(v.lengthSq()){v.normalize();player.position.addScaledVector(v,5*dt);player.rotation.y=Math.atan2(v.x,v.z)}
 player.position.x=THREE.MathUtils.clamp(player.position.x,-82,82);player.position.z=THREE.MathUtils.clamp(player.position.z,-82,82);
 camera.rotation.order="YXZ";camera.rotation.y=yaw-player.rotation.y;camera.rotation.x=pitch;
 zombies.forEach(z=>{let d=new THREE.Vector3().subVectors(player.position,z.position);let len=d.length();if(len>2){d.y=0;d.normalize();z.position.addScaledVector(d,z.userData.speed*dt);z.lookAt(player.position.x,z.position.y,player.position.z)}else{z.userData.attack-=dt;if(z.userData.attack<=0){hp=Math.max(0,hp-6);z.userData.attack=.8;hud();if(hp<=0)end()}}});
 for(let i=shots.length-1;i>=0;i--){let s=shots[i],prev=s.p.clone();s.p.addScaledVector(s.v,dt);s.life-=dt;let remove=s.life<=0;
  for(let j=zombies.length-1;j>=0&&!remove;j--){let z=zombies[j],target=z.position.clone().add(new THREE.Vector3(0,1.25,0));if(s.p.distanceTo(target)<.75){hitZombie(z,110);remove=true}}
  for(let j=buildings.length-1;j>=0&&!remove;j--){let b=buildings[j];if(s.p.distanceTo(b.center)<b.radius){destroyHouse(b,45);remove=true}}
  if(!remove){let tracer=box(.035,.035,.8,0xffd17b);tracer.position.copy(s.p);tracer.lookAt(prev);scene.add(tracer);setTimeout(()=>scene.remove(tracer),45)}
  if(remove)shots.splice(i,1)
 }
 [fx,debris].forEach(arr=>{for(let i=arr.length-1;i>=0;i--){let q=arr[i];q.userData.life-=dt;q.userData.v.y-=8*dt;q.position.addScaledVector(q.userData.v,dt);if(q.userData.life<=0){scene.remove(q);arr.splice(i,1)}}});
 spawnT-=dt;if(spawnT<=0){for(let i=0;i<Math.min(1+Math.floor(wave/2),3);i++)makeZombie();spawnT=Math.max(.9,3-wave*.1)}
 if(firing)shoot();renderer.render(scene,camera)
}
function hud(){$("hp").textContent=hp;$("kills").textContent=kills;$("wave").textContent=wave;$("ammo").textContent=ammo;$("reserve").textContent=reserve}
function toast(t){$("toast").textContent=t}
function start(){alive=true;hp=100;kills=0;wave=1;ammo=5;reserve=40;player.position.set(0,0,13);zombies.forEach(z=>scene.remove(z));zombies=[];buildings=[];document.querySelectorAll("#menu,#over").forEach(x=>x.style.display="none");$("hud").style.display="block";hud();clock.start();sound("start")}
function end(){alive=false;$("hud").style.display="none";$("final").textContent=kills;$("over").style.display="grid"}
function controls(){
 $("start").onclick=start;$("again").onclick=start;$("reload").onclick=reload;
 $("fire").onpointerdown=e=>{e.preventDefault();firing=true;shoot()};["pointerup","pointercancel"].forEach(x=>$("fire").addEventListener(x,()=>firing=false));
 $("aim").onclick=()=>{aiming=!aiming;$("scope").style.display=aiming?"block":"none";camera.fov=aiming?10:68;camera.updateProjectionMatrix();$("aim").textContent=aiming?"200×":"SCOPE"};
 let j=$("joy"),st=j.querySelector("i"),on=false;function jm(e){if(!on)return;let r=j.getBoundingClientRect(),x=e.clientX-r.left-65,y=e.clientY-r.top-65,l=Math.min(50,Math.hypot(x,y)),a=Math.atan2(y,x);x=Math.cos(a)*l;y=Math.sin(a)*l;st.style.transform=`translate(${x}px,${y}px)`;mx=x/50;mz=y/50}
 j.onpointerdown=e=>{on=true;j.setPointerCapture(e.pointerId);jm(e)};j.onpointermove=jm;j.onpointerup=()=>{on=false;mx=mz=0;st.style.transform="translate(0,0)"};
 let look=false,lx=0,ly=0;renderer.domElement.onpointerdown=e=>{if(e.clientX>innerWidth*.42&&e.clientY>65){look=true;lx=e.clientX;ly=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)}};renderer.domElement.onpointermove=e=>{if(!look)return;let dx=e.clientX-lx,dy=e.clientY-ly;lx=e.clientX;ly=e.clientY;yaw-=dx*.006;pitch=THREE.MathUtils.clamp(pitch-dy*.004,-1, .45)};renderer.domElement.onpointerup=()=>look=false;
 addEventListener("keydown",e=>{if(e.code==="KeyW")mz=-1;if(e.code==="KeyS")mz=1;if(e.code==="KeyA")mx=-1;if(e.code==="KeyD")mx=1;if(e.code==="KeyR")reload();if(e.code==="Space")shoot()});addEventListener("keyup",e=>{if(e.code==="KeyW"||e.code==="KeyS")mz=0;if(e.code==="KeyA"||e.code==="KeyD")mx=0})
}
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function loop(){if(!alive){renderer.render(scene,camera);return}update(Math.min(clock.getDelta(),.04))}
init();
