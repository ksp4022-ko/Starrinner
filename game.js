const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const distanceEl = document.getElementById("distance");
const itemNameEl = document.getElementById("itemName");
const bestScoreEl = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const jumpBtn = document.getElementById("jumpBtn");
const useItemBtn = document.getElementById("useItemBtn");
const restartBtn = document.getElementById("restartBtn");

let gameRunning = false;
let gameOver = false;
let animationId = null;
let frame = 0;
let score = 0;
let coins = 0;
let distance = 0;
let speed = 5;
let bestScore = Number(localStorage.getItem("starRunnerBestScore")) || 0;
let obstacles = [];
let coinItems = [];
let powerItems = [];
let currentItem = null;
let shieldActive = false;
let magnetActiveUntil = 0;
let message = "";
let messageUntil = 0;

const groundY = 325;

const player = {
  x: 90,
  y: groundY - 70,
  width: 52,
  height: 70,
  vy: 0,
  jumping: false,
};

bestScoreEl.textContent = bestScore;

function resetGame() {
  frame = 0;
  score = 0;
  coins = 0;
  distance = 0;
  speed = 5;
  obstacles = [];
  coinItems = [];
  powerItems = [];
  currentItem = null;
  shieldActive = false;
  magnetActiveUntil = 0;
  message = "";
  messageUntil = 0;
  player.y = groundY - player.height;
  player.vy = 0;
  player.jumping = false;
  gameOver = false;
  updatePanel();
}

function startGame() {
  resetGame();
  gameRunning = true;
  overlay.classList.add("hidden");
  if (animationId) cancelAnimationFrame(animationId);
  loop();
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem("starRunnerBestScore", String(bestScore));
  }
  bestScoreEl.textContent = bestScore;
  overlay.classList.remove("hidden");
  overlay.querySelector("h2").textContent = "遊戲結束！";
  overlay.querySelector("p").textContent = `你的分數：${score}，金幣：${coins}`;
  startBtn.textContent = "再玩一次";
}

function jump() {
  if (!gameRunning) return;
  if (!player.jumping) {
    player.vy = -17;
    player.jumping = true;
  }
}

function useItem() {
  if (!gameRunning || !currentItem) return;

  if (currentItem === "護盾") {
    shieldActive = true;
    showMessage("護盾啟動！可抵擋一次撞擊");
  }

  if (currentItem === "磁鐵") {
    magnetActiveUntil = frame + 480;
    showMessage("磁鐵啟動！自動吸金幣 8 秒");
  }

  currentItem = null;
  updatePanel();
}

function showMessage(text) {
  message = text;
  messageUntil = frame + 120;
}

function spawnObstacle() {
  const types = [
    { name: "石頭", w: 48, h: 48, color: "#6d4c41" },
    { name: "木箱", w: 58, h: 58, color: "#a1887f" },
    { name: "水坑", w: 75, h: 24, color: "#039be5" },
  ];
  const t = types[Math.floor(Math.random() * types.length)];
  obstacles.push({
    x: canvas.width + 20,
    y: groundY - t.h,
    width: t.w,
    height: t.h,
    color: t.color,
    name: t.name,
  });
}

function spawnCoins() {
  const baseY = 190 + Math.random() * 75;
  for (let i = 0; i < 5; i++) {
    coinItems.push({
      x: canvas.width + 30 + i * 42,
      y: baseY + Math.sin(i) * 18,
      r: 13,
      collected: false,
    });
  }
}

function spawnPowerItem() {
  const item = Math.random() < 0.5 ? "護盾" : "磁鐵";
  powerItems.push({
    x: canvas.width + 40,
    y: 195 + Math.random() * 55,
    width: 38,
    height: 38,
    name: item,
    collected: false,
  });
}

function update() {
  frame++;
  speed += 0.0015;
  score += 1;
  distance = Math.floor(frame / 6);

  player.vy += 0.85;
  player.y += player.vy;

  if (player.y >= groundY - player.height) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.jumping = false;
  }

  if (frame % Math.max(75, Math.floor(135 - speed * 6)) === 0) spawnObstacle();
  if (frame % 150 === 0) spawnCoins();
  if (frame % 540 === 0) spawnPowerItem();

  obstacles.forEach(o => (o.x -= speed));
  coinItems.forEach(c => {
    c.x -= speed;
    if (frame < magnetActiveUntil && !c.collected) {
      const dx = player.x + player.width / 2 - c.x;
      const dy = player.y + player.height / 2 - c.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 190) {
        c.x += dx * 0.12;
        c.y += dy * 0.12;
      }
    }
  });
  powerItems.forEach(p => (p.x -= speed));

  obstacles = obstacles.filter(o => o.x + o.width > -50);
  coinItems = coinItems.filter(c => c.x > -50 && !c.collected);
  powerItems = powerItems.filter(p => p.x > -50 && !p.collected);

  checkCollisions();
  updatePanel();
}

function checkCollisions() {
  for (const o of obstacles) {
    if (rectHit(player, o)) {
      if (shieldActive) {
        shieldActive = false;
        obstacles = obstacles.filter(item => item !== o);
        showMessage("護盾保護你一次！");
        score += 30;
      } else {
        endGame();
      }
      return;
    }
  }

  for (const c of coinItems) {
    if (!c.collected && circleRectHit(c, player)) {
      c.collected = true;
      coins += 1;
      score += 5;
    }
  }

  for (const p of powerItems) {
    if (!p.collected && rectHit(player, p)) {
      p.collected = true;
      currentItem = p.name;
      score += 10;
      showMessage(`取得道具：${p.name}，按 Z 使用`);
    }
  }
}

function rectHit(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function circleRectHit(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPlayer();
  obstacles.forEach(drawObstacle);
  coinItems.forEach(drawCoin);
  powerItems.forEach(drawPowerItem);
  drawStatusEffects();
  drawMessage();
}

function drawBackground() {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 7; i++) {
    const x = (i * 170 - frame * 0.45) % 1050;
    drawCloud(x, 70 + (i % 3) * 35);
  }

  ctx.fillStyle = "#5d9c43";
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = "#4e8b38";
  for (let x = -40; x < canvas.width + 40; x += 70) {
    ctx.fillRect((x - frame * speed * 0.5) % (canvas.width + 70), groundY + 18, 38, 8);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Microsoft JhengHei";
  ctx.fillText("校園操場", 24, 42);
}

function drawCloud(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.arc(x + 25, y - 10, 28, 0, Math.PI * 2);
  ctx.arc(x + 55, y, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.save();
  ctx.fillStyle = shieldActive ? "#42a5f5" : "#ff7043";
  ctx.fillRect(player.x, player.y + 16, player.width, player.height - 16);

  ctx.fillStyle = "#ffe0b2";
  ctx.beginPath();
  ctx.arc(player.x + player.width / 2, player.y + 15, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(player.x + 20, player.y + 12, 3, 0, Math.PI * 2);
  ctx.arc(player.x + 34, player.y + 12, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(player.x + 27, player.y + 18, 8, 0, Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#37474f";
  ctx.fillRect(player.x + 6, player.y + player.height - 4, 14, 12);
  ctx.fillRect(player.x + 32, player.y + player.height - 4, 14, 12);
  ctx.restore();
}

function drawObstacle(o) {
  ctx.fillStyle = o.color;
  ctx.fillRect(o.x, o.y, o.width, o.height);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 3;
  ctx.strokeRect(o.x, o.y, o.width, o.height);
}

function drawCoin(c) {
  ctx.beginPath();
  ctx.fillStyle = "#ffd54f";
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f9a825";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#fff8e1";
  ctx.font = "bold 15px Arial";
  ctx.fillText("$", c.x - 5, c.y + 5);
}

function drawPowerItem(p) {
  ctx.fillStyle = p.name === "護盾" ? "#42a5f5" : "#ab47bc";
  ctx.fillRect(p.x, p.y, p.width, p.height);
  ctx.fillStyle = "white";
  ctx.font = "bold 22px Microsoft JhengHei";
  ctx.fillText(p.name === "護盾" ? "盾" : "吸", p.x + 7, p.y + 27);
}

function drawStatusEffects() {
  if (frame < magnetActiveUntil) {
    ctx.fillStyle = "rgba(171, 71, 188, 0.18)";
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 105, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMessage() {
  if (frame < messageUntil && message) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(210, 22, 480, 48);
    ctx.strokeStyle = "#ffca28";
    ctx.lineWidth = 4;
    ctx.strokeRect(210, 22, 480, 48);
    ctx.fillStyle = "#263238";
    ctx.font = "bold 24px Microsoft JhengHei";
    ctx.textAlign = "center";
    ctx.fillText(message, 450, 54);
    ctx.textAlign = "start";
  }
}

function updatePanel() {
  scoreEl.textContent = score;
  coinsEl.textContent = coins;
  distanceEl.textContent = distance;
  if (currentItem) {
    itemNameEl.textContent = currentItem;
  } else if (shieldActive) {
    itemNameEl.textContent = "護盾啟動中";
  } else if (frame < magnetActiveUntil) {
    itemNameEl.textContent = "磁鐵啟動中";
  } else {
    itemNameEl.textContent = "無";
  }
}

function loop() {
  if (!gameRunning) return;
  update();
  draw();
  animationId = requestAnimationFrame(loop);
}

startBtn.addEventListener("click", startGame);
jumpBtn.addEventListener("click", jump);
useItemBtn.addEventListener("click", useItem);
restartBtn.addEventListener("click", startGame);

window.addEventListener("keydown", e => {
  if (e.code === "Enter" && !gameRunning) startGame();
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    jump();
  }
  if (e.key.toLowerCase() === "z") useItem();
});

draw();
