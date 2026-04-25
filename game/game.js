const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.querySelector("#scoreValue");
const bestValue = document.querySelector("#bestValue");
const livesValue = document.querySelector("#livesValue");
const levelValue = document.querySelector("#levelValue");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");
const overlay = document.querySelector("#overlay");
const stateLabel = document.querySelector("#stateLabel");
const stateTitle = document.querySelector("#stateTitle");
const primaryButton = document.querySelector("#primaryButton");

const BEST_KEY = "comet-run.best.v1";
const keys = new Set();
const touchDirs = new Set();
const stars = Array.from({ length: 120 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.8 + 0.4,
  speed: Math.random() * 18 + 8
}));

let width = 0;
let height = 0;
let dpr = 1;
let lastTime = 0;
let mode = "ready";
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let level = 1;
let lives = 3;
let spawnTimer = 0;
let gemTimer = 0;
let shake = 0;
let meteors = [];
let gems = [];
let particles = [];
let pointerTarget = null;

const player = {
  x: 0,
  y: 0,
  radius: 18,
  speed: 360,
  invulnerable: 0
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  width = Math.max(320, rect.width);
  height = Math.max(420, rect.height);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (!player.x || !player.y) {
    player.x = width / 2;
    player.y = height - 86;
  }
}

function resetGame() {
  score = 0;
  level = 1;
  lives = 3;
  spawnTimer = 0;
  gemTimer = 1.4;
  shake = 0;
  meteors = [];
  gems = [];
  particles = [];
  pointerTarget = null;
  player.x = width / 2;
  player.y = height - 86;
  player.invulnerable = 1.2;
  setMode("playing");
  updateHud();
}

function setMode(nextMode) {
  mode = nextMode;
  overlay.classList.toggle("hidden", mode === "playing");

  if (mode === "ready") {
    stateLabel.textContent = "Ready";
    stateTitle.textContent = "Comet Run";
    primaryButton.textContent = "Start";
  }

  if (mode === "paused") {
    stateLabel.textContent = "Paused";
    stateTitle.textContent = String(Math.floor(score));
    primaryButton.textContent = "Resume";
  }

  if (mode === "gameover") {
    stateLabel.textContent = "Game Over";
    stateTitle.textContent = String(Math.floor(score));
    primaryButton.textContent = "Again";
  }
}

function updateHud() {
  scoreValue.textContent = Math.floor(score).toString();
  bestValue.textContent = Math.floor(best).toString();
  livesValue.textContent = lives.toString();
  levelValue.textContent = level.toString();
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnMeteor() {
  const radius = rand(16, 34);
  meteors.push({
    x: rand(radius, width - radius),
    y: -radius - 10,
    radius,
    vx: rand(-42, 42),
    vy: rand(145, 220) + level * 18,
    spin: rand(-2.6, 2.6),
    angle: rand(0, Math.PI * 2),
    seed: Math.random()
  });
}

function spawnGem() {
  gems.push({
    x: rand(28, width - 28),
    y: -28,
    radius: 13,
    vy: rand(125, 165) + level * 8,
    pulse: rand(0, Math.PI * 2)
  });
}

function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(70, 260);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.35, 0.85),
      maxLife: 0.85,
      size: rand(2, 5),
      color
    });
  }
}

function movePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.has("arrowleft") || keys.has("a") || touchDirs.has("left")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d") || touchDirs.has("right")) dx += 1;
  if (keys.has("arrowup") || keys.has("w") || touchDirs.has("up")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s") || touchDirs.has("down")) dy += 1;

  if (pointerTarget) {
    const towardX = pointerTarget.x - player.x;
    const towardY = pointerTarget.y - player.y;
    const distance = Math.hypot(towardX, towardY);
    if (distance > 4) {
      dx += towardX / distance;
      dy += towardY / distance;
    }
  }

  const length = Math.hypot(dx, dy) || 1;
  player.x += (dx / length) * player.speed * dt;
  player.y += (dy / length) * player.speed * dt;
  player.x = clamp(player.x, player.radius + 4, width - player.radius - 4);
  player.y = clamp(player.y, player.radius + 4, height - player.radius - 4);
}

function update(dt) {
  if (mode !== "playing") return;

  score += dt * (20 + level * 4);
  level = Math.floor(score / 700) + 1;
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  shake = Math.max(0, shake - dt * 18);

  movePlayer(dt);

  spawnTimer -= dt;
  gemTimer -= dt;
  if (spawnTimer <= 0) {
    spawnMeteor();
    spawnTimer = Math.max(0.22, 0.72 - level * 0.035);
  }
  if (gemTimer <= 0) {
    spawnGem();
    gemTimer = rand(2.1, 3.8);
  }

  for (const meteor of meteors) {
    meteor.x += meteor.vx * dt;
    meteor.y += meteor.vy * dt;
    meteor.angle += meteor.spin * dt;
    if (meteor.x < meteor.radius || meteor.x > width - meteor.radius) meteor.vx *= -1;
  }

  for (const gem of gems) {
    gem.y += gem.vy * dt;
    gem.pulse += dt * 6;
  }

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 120 * dt;
    particle.life -= dt;
  }

  meteors = meteors.filter((meteor) => meteor.y < height + meteor.radius + 30);
  gems = gems.filter((gem) => gem.y < height + 40);
  particles = particles.filter((particle) => particle.life > 0);

  checkCollisions();
  best = Math.max(best, score);
  localStorage.setItem(BEST_KEY, String(Math.floor(best)));
  updateHud();
}

function checkCollisions() {
  for (const gem of gems) {
    if (Math.hypot(player.x - gem.x, player.y - gem.y) < player.radius + gem.radius) {
      score += 140;
      gem.collected = true;
      burst(gem.x, gem.y, "#f0b94c", 18);
    }
  }
  gems = gems.filter((gem) => !gem.collected);

  if (player.invulnerable > 0) return;

  for (const meteor of meteors) {
    if (Math.hypot(player.x - meteor.x, player.y - meteor.y) < player.radius + meteor.radius * 0.78) {
      lives -= 1;
      meteor.hit = true;
      player.invulnerable = 1.35;
      shake = 1;
      burst(player.x, player.y, "#f06c58", 28);
      if (lives <= 0) {
        setMode("gameover");
      }
      break;
    }
  }

  meteors = meteors.filter((meteor) => !meteor.hit);
}

function drawBackground(dt) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#080b12");
  gradient.addColorStop(0.48, "#12192b");
  gradient.addColorStop(1, "#211316");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = "#49d2bd";
  ctx.lineWidth = 1;
  const gap = 44;
  const offset = (score * 0.18) % gap;
  for (let y = -gap + offset; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + 24);
    ctx.stroke();
  }
  ctx.restore();

  for (const star of stars) {
    star.y = (star.y * height + star.speed * dt) / height;
    if (star.y > 1) {
      star.y = 0;
      star.x = Math.random();
    }
    ctx.fillStyle = star.r > 1.8 ? "rgba(240, 185, 76, 0.85)" : "rgba(247, 248, 241, 0.7)";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  ctx.fillStyle = "rgba(73, 210, 189, 0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, player.radius + 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#49d2bd";
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 18);
  ctx.lineTo(0, 10);
  ctx.lineTo(-18, 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f7f8f1";
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0b94c";
  ctx.beginPath();
  ctx.moveTo(-7, 18);
  ctx.lineTo(0, 34 + Math.sin(score * 0.08) * 4);
  ctx.lineTo(7, 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMeteor(meteor) {
  ctx.save();
  ctx.translate(meteor.x, meteor.y);
  ctx.rotate(meteor.angle);
  ctx.fillStyle = "#6d4b46";
  ctx.strokeStyle = "#f06c58";
  ctx.lineWidth = 2;
  ctx.beginPath();
  const points = 11;
  for (let i = 0; i < points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const rough = 0.78 + ((Math.sin(i * 12.989 + meteor.seed * 10) + 1) / 2) * 0.36;
    const r = meteor.radius * rough;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(247, 248, 241, 0.22)";
  ctx.beginPath();
  ctx.arc(-meteor.radius * 0.2, -meteor.radius * 0.22, meteor.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGem(gem) {
  const scale = 1 + Math.sin(gem.pulse) * 0.1;
  ctx.save();
  ctx.translate(gem.x, gem.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(240, 185, 76, 0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0b94c";
  ctx.strokeStyle = "#f7f8f1";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(14, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(-14, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function render(dt) {
  ctx.save();
  if (shake > 0) {
    ctx.translate(rand(-shake * 6, shake * 6), rand(-shake * 6, shake * 6));
  }
  drawBackground(dt);
  gems.forEach(drawGem);
  meteors.forEach(drawMeteor);
  drawParticles();
  drawPlayer();
  ctx.restore();
}

function frame(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  render(dt);
  requestAnimationFrame(frame);
}

function pauseOrResume() {
  if (mode === "playing") setMode("paused");
  else if (mode === "paused") setMode("playing");
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
    event.preventDefault();
    keys.add(key);
    if (mode === "ready") resetGame();
  }
  if (key === " " || key === "enter") {
    event.preventDefault();
    if (mode === "ready" || mode === "gameover") resetGame();
    else pauseOrResume();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  pointerTarget = canvasPoint(event);
  if (mode === "ready") resetGame();
});

canvas.addEventListener("pointermove", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) {
    pointerTarget = canvasPoint(event);
  }
});

canvas.addEventListener("pointerup", (event) => {
  canvas.releasePointerCapture(event.pointerId);
  pointerTarget = null;
});

document.querySelectorAll(".control").forEach((button) => {
  const dir = button.dataset.dir;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchDirs.add(dir);
    button.setPointerCapture(event.pointerId);
    if (mode === "ready") resetGame();
  });
  button.addEventListener("pointerup", () => touchDirs.delete(dir));
  button.addEventListener("pointercancel", () => touchDirs.delete(dir));
});

primaryButton.addEventListener("click", () => {
  if (mode === "paused") setMode("playing");
  else resetGame();
});

pauseButton.addEventListener("click", pauseOrResume);
restartButton.addEventListener("click", resetGame);

window.addEventListener("resize", resize);
resize();
bestValue.textContent = Math.floor(best).toString();
setMode("ready");
updateHud();
requestAnimationFrame(frame);
