/* refs */
const canvas = document.getElementById("game"),
      ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score"),
      gameOverEl = document.getElementById("game-over");
const restartBtn = document.getElementById("restart-btn");

/* constants */
const W = canvas.width,
      H = canvas.height,
      GY = H - 40,
      GRAVITY = 0.6,
      JUMP_VEL = -14,
      BASE_SPEED = 4,
      SPEED_INC = 0.0001,
      MIN_GAP = 500,
      GAP_VAR = 350,
      OB_SIZE = 40,
      HIT_SHRINK = 8;

/* player */
let blob = {
  x: 50,
  y: GY,
  width: 50,
  height: 70,
  vy: 0,
  isJumping: false,
  crouching: false,
  normalH: 70,
  crouchH: 40
};

/* obstacles */
const obsEmoji = ["🌳", "💊", "🛒", "🍄", "🍯", "🏔️"];
let obstacles = [],
    speed = BASE_SPEED,
    score = 0,
    best = +localStorage.getItem("bestScore") || 0,
    running = true;

/* input */
window.addEventListener("keydown", key, { passive: false });
window.addEventListener("keyup", key, { passive: false });
function key(e) {
  const d = e.type === "keydown";
  if (d && ["Space", "ArrowUp", "KeyW"].includes(e.code) && !blob.isJumping && !blob.crouching && running) {
    e.preventDefault();
    blob.vy = JUMP_VEL;
    blob.isJumping = true;
  }
  if (["ArrowDown", "KeyS"].includes(e.code)) {
    blob.crouching = d;
    blob.height = d ? blob.crouchH : blob.normalH;
  }
}
restartBtn.addEventListener("click", reset);

/* loop */
let prev = performance.now();
requestAnimationFrame(loop);
function loop(t) {
  const dt = t - prev;
  prev = t;
  if (running) update(dt);
  render();
  requestAnimationFrame(loop);
}

/* update */
function update(dt) {
  spawn();
  obstacles.forEach(o => o.x -= speed);
  obstacles = obstacles.filter(o => o.x + o.size > 0);

  blob.vy += GRAVITY;
  blob.y += blob.vy;
  if (blob.y >= GY) {
    blob.y = GY;
    blob.vy = 0;
    blob.isJumping = false;
  }

  if (obstacles.some(o => hit(blob, o))) {
    end();
    return;
  }

  score += dt * 0.01;
  speed += SPEED_INC;
  scoreEl.textContent = `Score: ${Math.floor(score)} | Best: ${best}`;
}

/* spawn */
function spawn() {
  if (!obstacles.length) {
    obstacles.push(makeObs());
    return;
  }
  const last = obstacles[obstacles.length - 1];
  const gap = MIN_GAP + Math.random() * GAP_VAR + Math.random() * 200;
  if (W - last.x > gap) obstacles.push(makeObs());
}
const makeObs = () => ({
  x: W,
  y: GY,
  size: OB_SIZE,
  char: obsEmoji[Math.floor(Math.random() * obsEmoji.length)]
});

/* render */
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#444";
  ctx.fillRect(0, GY + blob.normalH, W, 2);

  // colored blob
  const hue = (Date.now() / 20) % 360;
  ctx.save();
  ctx.translate(blob.x + blob.width / 2, blob.y - blob.height / 2);
  ctx.rotate(blob.crouching ? Math.PI / 2 : Math.sin(Date.now() * 0.005) * 0.2);
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.beginPath();
  ctx.ellipse(0, 0, blob.width / 2, blob.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // emoji obstacles (don't change color)
  ctx.font = "40px serif";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  obstacles.forEach(o => ctx.fillText(o.char, o.x + o.size / 2, o.y));
}

/* helpers */
function hit(b, o) {
  const s = HIT_SHRINK / 2,
        ox = o.x + s,
        oy = o.y - o.size + s,
        os = o.size - HIT_SHRINK;
  return b.x < ox + os && b.x + b.width > ox && b.y - b.height < oy + os && b.y > oy;
}
function end() {
  running = false;
  if (score > best) {
    best = Math.floor(score);
    localStorage.setItem("bestScore", best);
  }
  gameOverEl.hidden = false;
}
function reset() {
  obstacles = [];
  speed = BASE_SPEED;
  score = 0;
  blob.y = GY;
  blob.vy = 0;
  blob.isJumping = false;
  blob.crouching = false;
  blob.height = blob.normalH;
  gameOverEl.hidden = true;
  running = true;
}

/* swarm emojis (outside the game area) */
const swarm = document.querySelector(".emoji-swarm"),
      bg = ["🌳", "💊", "🛒", "🍄", "🍯", "🏔️", "🔥", "👀", "🧪", "🌈", "⭐", "🦄"];
const r = canvas.getBoundingClientRect(), buf = 20,
      ex = { l: r.left - buf, t: r.top - buf, r: r.right + buf, b: r.bottom + buf };
const placed = [], MIN = 50;
for (let i = 0; i < 140; i++) {
  let ok = false, x, y, s, tries = 0;
  while (!ok && tries++ < 120) {
    x = Math.random() * innerWidth;
    y = Math.random() * innerHeight;
    if (x > ex.l && x < ex.r && y > ex.t && y < ex.b) continue;
    ok = placed.every(p => Math.hypot(p.x - x, p.y - y) >= MIN);
  }
  if (!ok) continue;
  placed.push({ x, y });
  s = 24 + Math.random() * 40;
  const e = document.createElement("span");
  e.className = "swarm-emoji";
  e.textContent = bg[Math.floor(Math.random() * bg.length)];
  e.style.left = x + "px";
  e.style.top = y + "px";
  e.style.fontSize = s + "px";
  e.style.animationDuration = 6 + Math.random() * 5 + "s";
  swarm.appendChild(e);
}
