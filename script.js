// ====== Состояние игры ======
let price = 1.0;
let priceHistory = [];
let usd = 1000;
let coins = 0;
let totalSpent = 0;   // сколько всего вложил (для PnL)
let tab = 'buy';
let dayOpen = null;

// Генерируем стартовую историю цен
for (let i = 0; i < 80; i++) {
  price *= 1 + (Math.random() - 0.48) * 0.02;
  priceHistory.push(price);
}
dayOpen = priceHistory[0];

// ====== Симуляция цены (случайное блуждание) ======
function tick() {
  price = Math.max(0.05, price * (1 + (Math.random() - 0.48) * 0.025));
  priceHistory.push(price);
  if (priceHistory.length > 120) priceHistory.shift();
  updateUI();
  drawChart();
}
setInterval(tick, 1000);

// ====== Форматирование ======
const fmt = n => n.toFixed(2);
const fmtPrice = n => '$' + n.toFixed(4);

// ====== Обновление интерфейса ======
function updateUI() {
  document.getElementById('price').textContent = fmtPrice(price);
  const change = ((price - dayOpen) / dayOpen) * 100;
  const chEl = document.getElementById('change');
  chEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  chEl.className = change >= 0 ? 'up' : 'down';

  document.getElementById('usd').textContent = '$' + fmt(usd);
  document.getElementById('coins').textContent = coins.toFixed(2);

  // PnL: сколько стоит портфель сейчас минус сколько вложено
  const portfolioValue = coins * price;
  const pnl = portfolioValue - totalSpent;
  const pnlEl = document.getElementById('pnl');
  pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(pnl));
  pnlEl.className = pnl >= 0 ? 'up' : 'down';

  // Оценка сделки
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  document.getElementById('estimate').textContent = '≈ ' + fmtPrice(amount * price);
}

// ====== Переключение Купить/Продать ======
function setTab(name) {
  tab = name;
  document.getElementById('tab-buy').className = 'tab' + (name === 'buy' ? ' active buy-active' : '');
  document.getElementById('tab-sell').className = 'tab' + (name === 'sell' ? ' active sell-active' : '');
  const btn = document.getElementById('action-btn');
  btn.className = 'action ' + name;
  btn.textContent = name === 'buy' ? 'Купить ZHYK' : 'Продать ZHYK';
}

// ====== Сделка ======
function trade() {
  const amount = parseFloat(document.getElementById('amount').value);
  if (!amount || amount <= 0) return alert('Введи количество ZHYK');

  const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (tab === 'buy') {
    const cost = amount * price;
    if (cost > usd) return alert('Недостаточно средств! Нужно $' + fmt(cost));
    usd -= cost;
    coins += amount;
    totalSpent += cost;
    addTx('buy', amount, cost, now);
  } else {
    if (amount > coins) return alert('У тебя только ' + coins.toFixed(2) + ' ZHYK');
    coins -= amount;
    const gain = amount * price;
    usd += gain;
    totalSpent -= (totalSpent / (coins + amount)) * amount; // убираем долю себестоимости
    if (coins < 0.001) totalSpent = 0;
    addTx('sell', amount, gain, now);
  }
  updateUI();
}

// ====== Добавление сделки в историю ======
function addTx(type, amount, total, time) {
  const list = document.getElementById('tx-list');
  const empty = list.querySelector('.empty');
  if (empty) empty.remove();

  const li = document.createElement('li');
  li.className = type + '-tx';
  li.innerHTML = `
    <span>${type === 'buy' ? '🟢 Покупка' : '🔴 Продажа'}</span>
    <span>${amount.toFixed(2)} ZHYK</span>
    <span>$${fmt(total)}</span>
    <span>${time}</span>`;
  list.prepend(li);
}

// ====== Отрисовка графика ======
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function drawChart() {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const pad = 10;
  const min = Math.min(...priceHistory) * 0.998;
  const max = Math.max(...priceHistory) * 1.002;

  const x = i => pad + (i / (priceHistory.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - pad * 2);

  const up = priceHistory[priceHistory.length - 1] >= dayOpen;
  const lineColor = up ? '#00e5a0' : '#ff5470';

  // Градиентная заливка под линией
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, up ? 'rgba(0,229,160,.25)' : 'rgba(255,84,112,.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));

  // Заливка
  ctx.save();
  ctx.lineTo(x(priceHistory.length - 1), h);
  ctx.lineTo(x(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Линия со свечением
  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Пульсирующая точка на конце
  const lastX = x(priceHistory.length - 1);
  const lastY = y(price);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4 + Math.sin(Date.now() / 300) * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
}

// ====== Анимации появления при скролле ======
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
});
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Первые отрисовка и обновление
updateUI();
drawChart();
window.addEventListener('resize', drawChart);
