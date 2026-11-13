/* Flappy Jensen presentation on the shared game.js physics. */
(() => {
  "use strict";
  const G = window.Glowhop, C = G.C, W = C.WIDTH, H = 640;
  const $ = id => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d");
  const head = new Image(); head.src = "jensen-head.png";
  // Storage may be disabled in private browsing or on file:// URLs.
  function stored(key, fallback) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch { /* Play without persistence. */ } }
  let best = Number(stored("jensen-best", 0)) || 0;
  let muted = stored("jensen-muted", "0") === "1";
  let game, mode = "ready", paused = false, queued = false;
  let frame = 0, scrollPos = 0, rotation = 0, shake = 0, flash = 0, deadFrames = 0;
  let particles = [], audio;
  const rand = G.mulberry32(18);
  const clouds = Array.from({length: 9}, (_, i) => ({x: rand() * 600, y: 40 + rand() * 410, s: .5 + rand() * .8}));
  const buildings = Array.from({length: 20}, (_, i) => ({x: i * 30, h: 20 + rand() * 72, w: 19 + rand() * 15}));
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  addEventListener("resize", resize);
  new ResizeObserver(resize).observe(canvas);
  resize();
  function tone(freq, duration, slide = 1, type = "sine", vol = .045) {
    if (muted) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume().catch(() => {});
      const osc = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
      osc.type = type; osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * slide, t + duration);
      gain.gain.setValueAtTime(vol, t); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
      osc.connect(gain).connect(audio.destination); osc.start(t); osc.stop(t + duration);
    } catch { /* Audio is optional. */ }
  }
  // Medal tiers from the original game-over panel, highest first.
  const MEDALS = [{min: 40, name: "platinum"}, {min: 30, name: "gold"}, {min: 20, name: "silver"}, {min: 10, name: "bronze"}];
  function sync() {
    $("best").textContent = String(best).padStart(2, "0");
    $("score").textContent = game.score;
    $("score").style.display = mode === "play" && !paused ? "block" : "none";
    $("status").textContent = paused ? "FLIGHT PAUSED" : mode === "over" ? "FLIGHT COMPLETE" : mode === "ready" ? "STANDING BY" : "FLIGHT IN PROGRESS";
    $("sound").setAttribute("aria-pressed", String(muted));
    $("sound").textContent = muted ? "♪̸" : "♪";
    $("sound").setAttribute("aria-label", muted ? "Unmute sound" : "Mute sound");
    $("pause").textContent = paused ? "▷" : "Ⅱ";
    $("pause").setAttribute("aria-label", paused ? "Resume game" : "Pause game");
    $("overlay").style.display = mode === "play" && !paused ? "none" : "flex";
    const medal = mode === "over" && !paused && MEDALS.find(m => game.score >= m.min);
    $("medal").hidden = !medal;
    if (medal) { $("medal").className = "medal " + medal.name; $("medal").textContent = medal.name.toUpperCase(); }
    $("caption").style.display = mode === "play" ? "none" : "block";
    if (paused) {
      $("overlay-label").textContent = "A QUICK PIT STOP";
      $("overlay-title").innerHTML = "HOLD THAT<br>THOUGHT.";
      $("overlay-copy").textContent = "Your next big leap can wait.";
      $("play").innerHTML = "RESUME FLIGHT <span>↗</span>";
      $("overlay-hint").textContent = "PRESS P OR TAP TO RESUME";
    } else if (mode === "over") {
      $("overlay-label").textContent = game.score > 0 && game.score >= best ? "PERSONAL BEST. BIG ENERGY." : "EVEN VISIONARIES HIT A WALL";
      $("overlay-title").innerHTML = "FLIGHT<br>COMPLETE.";
      $("overlay-copy").textContent = `${game.score} ${game.score === 1 ? "pipe" : "pipes"} cleared. There’s always another launch.`;
      $("play").innerHTML = "TRY AGAIN <span>↗</span>";
      $("overlay-hint").textContent = "PRESS SPACE OR TAP TO RETRY";
    } else {
      $("overlay-label").textContent = "PRE-FLIGHT CHECK";
      $("overlay-title").innerHTML = "READY TO<br>TAKE OFF?";
      $("overlay-copy").textContent = "A little flap goes a long way.";
      $("play").innerHTML = "START FLIGHT <span>↗</span>";
      $("overlay-hint").textContent = "PRESS SPACE OR TAP TO START";
    }
  }
  function reset() {
    game = G.createGame(G.randomGaps(Math.random)); mode = "ready"; queued = false;
    paused = false; particles = []; rotation = 0; shake = 0; flash = 0; deadFrames = 0; sync();
  }
  function flap() {
    if (paused) { paused = false; sync(); return; }
    if (mode === "over") { if (deadFrames < 25) return; reset(); }
    if (mode === "ready") { mode = "play"; sync(); }
    queued = true;
  }
  function togglePause() { if (mode === "play") { paused = !paused; queued = false; sync(); } }
  $("hero-play").addEventListener("click", () => { $("screen").scrollIntoView({block:"center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"}); flap(); canvas.focus({preventScroll:true}); });
  $("play").addEventListener("pointerdown", e => e.stopPropagation());
  $("play").addEventListener("click", flap);
  $("screen").addEventListener("pointerdown", e => { e.preventDefault(); flap(); });
  $("pause").addEventListener("click", togglePause);
  function toggleMute() { muted = !muted; save("jensen-muted", muted ? "1" : "0"); sync(); }
  $("sound").addEventListener("click", toggleMute);
  const arcade = document.querySelector(".arcade");
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else arcade.requestFullscreen?.().then(() => canvas.focus({preventScroll:true})).catch(() => {});
  }
  if (!document.fullscreenEnabled) $("fullscreen").hidden = true;
  $("fullscreen").addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    $("fullscreen").setAttribute("aria-pressed", String(on));
    $("fullscreen").setAttribute("aria-label", on ? "Exit full screen" : "Enter full screen");
  });
  addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select")) return;
    if (["Space","ArrowUp","KeyW","Enter"].includes(e.code)) { if (e.target.closest("button, a") && ["Space", "Enter"].includes(e.code)) return; e.preventDefault(); if (!e.repeat) flap(); }
    else if (!e.repeat && e.code === "KeyP") togglePause();
    else if (!e.repeat && e.code === "KeyM") toggleMute();
    else if (!e.repeat && e.code === "KeyF") toggleFullscreen();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && mode === "play") { paused = true; queued = false; sync(); } });
  function update() {
    if (paused) return;
    frame++;
    if (mode === "ready") { scrollPos += .35; return; }
    if (mode === "over") {
      deadFrames++; shake *= .82; flash *= .85;
      // As in the original, the head drops to the ground after a crash.
      game.prevY = game.y;
      game.vy = Math.min(game.vy + C.GRAVITY, C.MAX_FALL);
      game.y = Math.min(game.y + game.vy, C.HEIGHT - C.BIRD_R);
      if (game.y === C.HEIGHT - C.BIRD_R) game.vy = 0;
      rotation = tilt();
      return;
    }
    let f = queued; queued = false;
    if (f) {
      tone(420, .12, 700 / 420, "square", .06);
      for (let i = 0; i < 5; i++) particles.push({x:C.BIRD_X - 9,y:game.y + 6,vx:-1 - Math.random()*2,vy:Math.random()*3-1,life:1});
    }
    const result = G.step(game, f); scrollPos += C.SPEED;
    rotation = tilt();
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.life -= .045; }
    particles = particles.filter(p => p.life > 0);
    if (result.scored) { tone(880, .08, 1, "square", .08); setTimeout(() => tone(1320, .12, 1, "square", .08), 70); $("score").textContent = game.score; }
    if (result.hit) {
      mode = "over"; shake = 9; flash = .5; tone(200, .25, .3, "sawtooth", .1);
      if (game.score > best) { best = game.score; save("jensen-best", best); }
      sync();
    }
  }
  // The original's tilt (vy * 0.08 scaled 1.5x like game.js), from nose-up to nose-down.
  function tilt() { return Math.max(-.45, Math.min(Math.PI / 2, game.vy * .08 / 1.5)); }
  const wrap = (x, n) => ((x % n) + n) % n;
  function cloud(x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s,s); ctx.fillStyle = "#f4f6e8";
    ctx.beginPath(); ctx.roundRect(-24,0,65,14,7); ctx.fill();
    ctx.beginPath(); ctx.arc(-5,0,15,Math.PI,0); ctx.arc(14,-2,20,Math.PI,0); ctx.fill(); ctx.restore();
  }
  // A graphics card standing on end: fan shroud, PCB edge with PCIe fingers,
  // and the I/O bracket as the cap facing the gap. It fills the same box as the collider.
  function gpu(x, y, h, top) {
    const w=C.GATE_W, capY=top ? y+h-22 : y, fanX=x+37, R=29;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    ctx.fillStyle="#2f4a1f";ctx.fillRect(x+w-9,y,9,h);
    ctx.fillStyle="#d9b24a";for(let yy=y+2;yy<y+h;yy+=6)ctx.fillRect(x+w-6,yy,5,4);
    ctx.fillStyle="#20251d";ctx.fillRect(x,y,w-8,h);
    ctx.fillStyle="#3a4134";ctx.fillRect(x+w-10,y,2,h);
    ctx.fillStyle="#bcf34b";ctx.fillRect(x+3,y,3,h);
    // Fans start at the bracket and repeat along the card, spinning while the game runs.
    const dir=top ? -1 : 1, first=top ? capY-6-R : capY+28+R;
    for(let cy=first;top ? cy+R>y : cy-R<y+h;cy+=dir*66){
      ctx.save();ctx.translate(fanX,cy);
      ctx.fillStyle="#0f120d";ctx.beginPath();ctx.arc(0,0,R,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#4a5243";ctx.lineWidth=2;ctx.stroke();
      ctx.rotate(frame*.18+cy*.05);ctx.fillStyle="#646d5a";
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7, p=(r,t)=>[Math.cos(a+t)*r,Math.sin(a+t)*r];
        ctx.beginPath();ctx.moveTo(...p(8,0));ctx.quadraticCurveTo(...p(19,.15),...p(26,.5));
        ctx.arc(0,0,26,a+.5,a+.95);ctx.quadraticCurveTo(...p(16,.6),...p(8,.5));ctx.fill();
      }
      ctx.fillStyle="#20251d";ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#bcf34b";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    ctx.fillStyle="#5d6257";ctx.fillRect(x-5,capY,w+10,22);
    ctx.fillStyle="#c9ccc2";ctx.fillRect(x-3,capY+2,w+6,18);
    ctx.fillStyle="#e4e6de";ctx.fillRect(x-3,capY+2,w+6,3);
    ctx.fillStyle="#20251d";
    for(let i=0;i<3;i++){ctx.beginPath();ctx.roundRect(x+3+i*16,capY+8,12,7,[1,1,3,3]);ctx.fill();}
    ctx.beginPath();ctx.roundRect(x+52,capY+8,16,7,[1,1,3,3]);ctx.fill();
  }
  function drawHead(x, y, size, angle) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    if (head.complete && head.naturalWidth) {
      const height=size*head.naturalHeight/head.naturalWidth;
      ctx.shadowColor="rgba(63,82,35,.2)";ctx.shadowBlur=3;ctx.shadowOffsetY=3;
      ctx.drawImage(head,-size/2,-height/2,size,height);
    } else {
      ctx.fillStyle="#dab18a";ctx.beginPath();ctx.ellipse(0,0,size*.4,size*.5,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#222";ctx.lineWidth=2;ctx.strokeRect(-size*.34,-size*.12,size*.28,size*.18);ctx.strokeRect(size*.04,-size*.12,size*.28,size*.18);
    }
    ctx.restore();
  }
  function render(alpha) {
    // Draw between the last two fixed steps so motion stays smooth on any refresh rate.
    const lag=mode==="play"&&!paused ? 1-alpha : 0, scroll=scrollPos-lag*C.SPEED;
    ctx.save();
    if (shake > .3) ctx.translate(Math.sin(frame*9)*shake,Math.cos(frame*7)*shake*.5);
    ctx.fillStyle="#e7eed8";ctx.fillRect(0,0,W,H);
    // Quiet dotted sky, layered clouds and a distant silicon city.
    ctx.fillStyle="#d9e3c7";
    for(let x=14;x<W;x+=24)for(let y=16;y<570;y+=24)ctx.fillRect(x,y,1,1);
    clouds.forEach(c=>cloud(wrap(c.x-scroll*.13,560)-80,c.y,c.s));
    ctx.fillStyle="#d3dfbe";
    buildings.forEach(b=>{const x=wrap(b.x-scroll*.15,600)-40;ctx.fillRect(x,570-b.h,b.w,b.h);ctx.fillRect(x+4,564-b.h,b.w-8,6);});
    ctx.fillStyle="#c6d7ab";ctx.beginPath();ctx.moveTo(0,600);
    for(let x=0;x<=W;x+=5)ctx.lineTo(x,566+Math.sin((x+scroll*.2)*.017)*12);
    ctx.lineTo(W,600);ctx.fill();
    // Ready screen keeps the stage clear; obstacles arrive at the first flap.
    if(mode!=="ready") for(const gate of game.gates) {
      const gx=gate.x+lag*C.SPEED;
      if(gx>W+6||gx+C.GATE_W< -6)continue;
      const top=gate.gap-C.GATE_GAP/2, bottom=gate.gap+C.GATE_GAP/2;
      gpu(gx,0,top,true);gpu(gx,bottom,C.HEIGHT-bottom,false);
    }
    for(const p of particles){ctx.globalAlpha=p.life;ctx.fillStyle="#92bc4e";ctx.fillRect(p.x,p.y,3,3);}ctx.globalAlpha=1;
    // The photo fits the existing 24px collider during play; larger pre-flight preview.
    const ready=mode==="ready";
    const headY=game.y-lag*(game.y-game.prevY);
    drawHead(ready ? 200 : C.BIRD_X,ready ? 310+Math.sin(frame*.06)*5 : headY,ready ? 57 : 25,ready ? -.07 : rotation);
    if(ready){ctx.fillStyle="rgba(82,109,47,.11)";ctx.beginPath();ctx.ellipse(200,362,20+Math.sin(frame*.06)*2,4,0,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#829e54";ctx.fillRect(0,600,W,2);
    ctx.fillStyle="#bdd88f";ctx.fillRect(0,602,W,10);
    ctx.fillStyle="#91b266";for(let x=-20-wrap(scroll,20);x<W;x+=20){ctx.beginPath();ctx.moveTo(x,603);ctx.lineTo(x+9,603);ctx.lineTo(x+2,611);ctx.lineTo(x-7,611);ctx.fill();}
    ctx.fillStyle="#e0e5cb";ctx.fillRect(0,612,W,28);
    ctx.fillStyle="#cdd5b5";for(let x=6;x<W;x+=16)ctx.fillRect(x,622,3,2);
    ctx.restore();
    if(flash>.02){ctx.fillStyle=`rgba(255,255,255,${flash})`;ctx.fillRect(0,0,W,H);}
  }
  reset();
  let last=performance.now(),acc=0;
  const STEP=1000/60;
  function loop(now){acc+=Math.min(now-last,100);last=now;let n=0;while(acc>=STEP&&n++<6){update();acc-=STEP;}if(acc>=STEP)acc=0;render(acc/STEP);requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
})();
