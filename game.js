/* ---------- Canvas & DOM ---------- */
const canvas      = document.getElementById("game");
const ctx         = canvas.getContext("2d");
const scoreEl     = document.getElementById("score");
const gameOverEl  = document.getElementById("game-over");
const restartBtn  = document.getElementById("restart-btn");
const emojiField  = document.getElementById("floating-emojis");

/* ---------- Emoji & Game Settings ---------- */
const EMOJIS = ["🍄","💊","🌈","🌀","✨","🔥","🥴","😵‍💫"];
const obstacleEmojis = ["🌳","🍄","💊","🌈","✨"];
const GRAVITY = 0.4;
const GROUND  = canvas.height - 10;

/* ---------- Floating background emojis ---------- */
function spawnFloatingEmojis() {
  emojiField.innerHTML = "";
  for (let i = 0; i < 60; i++) {
    const span = document.createElement("span");
    span.className = "floater";
    span.textContent = EMOJIS[Math.random() * EMOJIS.length | 0];

    const dir   = Math.floor(Math.random() * 4);          // 0 up,1 down,2 left,3 right
    const dur   = 10 + Math.random() * 12;
    const delay = Math.random() * 12;
    const size  = 16 + Math.random() * 100;               // tiny ➜ huge
    span.style.fontSize = `${size}px`;
    span.style.animation = `${["floatUp","floatDown","floatLeft","floatRight"][dir]} ${dur}s linear ${delay}s infinite`;

    if (dir === 0) { span.style.left = `${Math.random()*100}vw`; span.style.top =  "100vh"; }
    if (dir === 1) { span.style.left = `${Math.random()*100}vw`; span.style.top =  "-5vh";  }
    if (dir === 2) { span.style.top  = `${Math.random()*100}vh`; span.style.left = "100vw"; }
    if (dir === 3) { span.style.top  = `${Math.random()*100}vh`; span.style.left = "-5vw";  }
    emojiField.appendChild(span);
  }
}
spawnFloatingEmojis();

/* ---------- Player Blob ---------- */
class Player {
  constructor() {
    this.r = 28;
    this.x = 80;
    this.y = GROUND - this.r;
    this.velY = 0;
    this.jumpForce = 11;
    this.grounded = true;
    this.t = 0;
    this.hue = 0;
  }
  jump()   { if (this.grounded) { this.velY = -this.jumpForce; this.grounded = false; } }
  crouch() { if (!this.grounded) this.velY += 1.5; }
  update() {
    if (keys["w"] || keys["arrowup"] || keys[" "]) this.jump();
    if (keys["s"] || keys["arrowdown"])           this.crouch();

    this.y   += this.velY;
    this.velY += GRAVITY;
    if (this.y + this.r >= GROUND) { this.y = GROUND - this.r; this.velY = 0; this.grounded = true; }

    this.t   += 0.1;
    this.hue  = (this.hue + 2) % 360;
  }
  draw() {
    const wobble = 0.05 * Math.sin(this.t * 8);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(1 + wobble, 1 - wobble);
    const grad = ctx.createRadialGradient(0,0,this.r*0.2, 0,0,this.r);
    grad.addColorStop(0, `hsl(${this.hue},100%,70%)`);
    grad.addColorStop(1, `hsl(${(this.hue+120)%360},100%,40%)`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  get bbox() { return { left:this.x-this.r, right:this.x+this.r, top:this.y-this.r, bottom:this.y+this.r }; }
}

/* ---------- Obstacles ---------- */
class Obstacle {
  constructor(speed) {
    this.emoji = obstacleEmojis[Math.random()*obstacleEmojis.length|0];
    this.size  = 40;
    this.x     = canvas.width + this.size;
    this.y     = GROUND - this.size;
    this.speed = speed;
  }
  update() { this.x -= this.speed; }
  draw()   { ctx.font = `${this.size}px serif`; ctx.textAlign = "center"; ctx.fillText(this.emoji, this.x, this.y + this.size); }
  get bbox(){ return { left:this.x-this.size/2, right:this.x+this.size/2, top:this.y, bottom:this.y+this.size }; }
}

/* ---------- Game state ---------- */
let keys   = {};
let obstacles = [];
let gameOver, score, best = 0;          // best persists for entire session
let baseSpeed, spawnInterval, spawnTimer, nextMilestone;
let player;

/* ---------- Controls ---------- */
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup",   e => keys[e.key.toLowerCase()] = false);
canvas.addEventListener("click", () => player.jump());
restartBtn.addEventListener("click", resetGame);

/* ---------- Main loop ---------- */
function animate() {
  if (gameOver) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  player.update(); player.draw();

  /* spawn & speed ramp */
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    obstacles.push(new Obstacle(baseSpeed));
    spawnTimer = 0;
    if (spawnInterval > 60) spawnInterval--;
    baseSpeed += 0.01;
  }

  /* obstacles loop */
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const o = obstacles[i];
    o.update(); o.draw();
    if (player.bbox.right > o.bbox.left && player.bbox.left < o.bbox.right && player.bbox.bottom > o.bbox.top) endGame();
    if (o.x + o.size < 0) obstacles.splice(i, 1);
  }

  /* score & milestones */
  score += 0.03;
  if (score >= nextMilestone) { baseSpeed *= 1.05; nextMilestone += 100; }
  if (score > best) best = Math.floor(score);

  scoreEl.textContent = `Score: ${Math.floor(score)} | Best: ${best}`;
  requestAnimationFrame(animate);
}

/* ---------- Reset / Start ---------- */
function resetGame() {
  gameOver      = false;
  gameOverEl.style.display = "none";
  score         = 0;                 // score resets, best stays
  baseSpeed     = 4;
  spawnInterval = 100;
  spawnTimer    = 0;
  nextMilestone = 100;
  obstacles     = [];
  player        = new Player();
  keys          = {};
  animate();
}

/* ---------- Game over ---------- */
function endGame() {
  gameOver = true;
  gameOverEl.style.display = "flex";
}

/* ---------- Kick off ---------- */
resetGame();
