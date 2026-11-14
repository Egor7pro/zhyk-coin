// ====== Состояние игры ======
let price = 1.0;
let priceHistory = [];
let usd = Number(localStorage.getItem('zhykUsd') ?? 1000);
let coins = Number(localStorage.getItem('zhykCoins') ?? 0);
let totalSpent = Number(localStorage.getItem('zhykSpent') ?? 0);
let tapEarned = Number(localStorage.getItem('zhykTapEarned') ?? 0);
let cityLevels = JSON.parse(localStorage.getItem('zhykCity') ?? '{}');
let boost = JSON.parse(localStorage.getItem('zhykBoost') ?? 'null');
if (boost && Date.now() >= boost.until) boost = null;

let tradeTab = 'buy';
let dayOpen = null;

// Стартовая история цен
for (let i = 0; i < 80; i++) {
  price *= 1 + (Math.random() - 0.48) * 0.02;
  priceHistory.push(price);
}
dayOpen = priceHistory[0];

function save() {
  localStorage.setItem('zhykUsd', usd);
  localStorage.setItem('zhykCoins', coins);
  localStorage.setItem('zhykSpent', totalSpent);
  localStorage.setItem('zhykTapEarned', tapEarned);
  localStorage.setItem('zhykCity', JSON.stringify(cityLevels));
  localStorage.setItem('zhykBoost', boost ? JSON.stringify(boost) : 'null');
}

// ====== Навигация по страницам ======
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.page === id));
  window.scrollTo(0, 0);
  if (id === 'page-trade') drawChart();
}
document.querySelectorAll('.nav-btn').forEach(b =>
  b.addEventListener('click', () => showPage(b.dataset.page)));

// ====== Форматирование ======
const fmt = n => n.toFixed(2);
const fmtPrice = n => '$' + n.toFixed(4);

function boostMult() {
  return boost && Date.now() < boost.until ? boost.mult : 1;
}

function boostText() {
  if (!boost || Date.now() >= boost.until) return '';
  const left = Math.ceil((boost.until - Date.now()) / 1000);
  return '⚡ Бустер x' + boost.mult + ' — осталось ' + left + ' сек';
}

// ====== Обновление интерфейса ======
function updateUI() {
  document.getElementById('price').textContent = fmtPrice(price);
  const change = ((price - dayOpen) / dayOpen) * 100;
  const chEl = document.getElementById('change');
  chEl.textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
  chEl.className = change >= 0 ? 'up' : 'down';

  const usdStr = '$' + fmt(usd);
  document.getElementById('usd-main').textContent = usdStr;
  document.getElementById('usd').textContent = usdStr;
  document.getElementById('usd-book').textContent = usdStr;
  document.getElementById('coins').textContent = coins.toFixed(2);
  document.getElementById('coins-main').textContent = coins.toFixed(2);
  document.getElementById('tap-earned').textContent = '$' + fmt(tapEarned);

  const portfolioValue = coins * price;
  const pnl = portfolioValue - totalSpent;
  const pnlEl = document.getElementById('pnl');
  pnlEl.textContent = (pnl >= 0 ? '+$' : '-$') + fmt(Math.abs(pnl));
  pnlEl.className = pnl >= 0 ? 'up' : 'down';

  const amount = parseFloat(document.getElementById('amount').value) || 0;
  document.getElementById('estimate').textContent = '≈ ' + fmtPrice(amount * price);

  const bs = boostText();
  document.getElementById('boost-status').textContent = bs;
  document.getElementById('boost-status-shop').textContent = bs;
}

// ====== Тапалка ======
document.getElementById('tap-coin').addEventListener('click', function (event) {
  const gain = boostMult();
  usd += gain;
  tapEarned += gain;
  save();
  updateUI();

  const plus = document.createElement('div');
  plus.className = 'plus-one';
  plus.textContent = '+$' + gain;
  plus.style.left = event.clientX + 'px';
  plus.style.top = event.clientY + 'px';
  document.body.appendChild(plus);
  setTimeout(() => plus.remove(), 800);
});

// ====== Биржа ======
function setTradeTab(name) {
  tradeTab = name;
  document.getElementById('tab-buy').className = 'tab' + (name === 'buy' ? ' active buy-active' : '');
  document.getElementById('tab-sell').className = 'tab' + (name === 'sell' ? ' active sell-active' : '');
  const btn = document.getElementById('action-btn');
  btn.className = 'action ' + name;
  btn.textContent = name === 'buy' ? 'Купить ZHYK' : 'Продать ZHYK';
}

function trade() {
  const amount = parseFloat(document.getElementById('amount').value);
  if (!amount || amount <= 0) return alert('Введи количество ZHYK');

  const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (tradeTab === 'buy') {
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
    totalSpent -= (totalSpent / (coins + amount)) * amount;
    if (coins < 0.001) totalSpent = 0;
    addTx('sell', amount, gain, now);
  }
  save();
  updateUI();
}

document.getElementById('amount').addEventListener('input', updateUI);

function addTx(type, amount, total, time) {
  const list = document.getElementById('tx-list');
  if (!list) return;
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

// ====== Город ======
const cityBuildings = [
  { id: 'kiosk',   icon: '🏪', name: 'Ларёк Zhyk',        desc: 'Мелкий бизнес у остановки',   base: 100,   income: 0.1 },
  { id: 'cafe',    icon: '☕', name: 'Кафе Zhyk Coffee',  desc: 'Кофе для тапающих тейкеров',  base: 500,   income: 0.5 },
  { id: 'store',   icon: '🏬', name: 'Магазин ZhykMart',  desc: 'Продажа снеков из магазина',  base: 2000,  income: 2 },
  { id: 'arena',   icon: '🏟', name: 'ZHYK Arena',        desc: 'Домашний стадион Zhykwin FC', base: 10000, income: 10 },
  { id: 'tower',   icon: '🏢', name: 'Zhyk Tower',        desc: 'Штаб-квартира империи Zhyk',  base: 50000, income: 50 },
];

function cityIncome() {
  return cityBuildings.reduce((sum, b) => sum + (cityLevels[b.id] || 0) * b.income, 0);
}

function renderCity() {
  const list = document.getElementById('city-list');
  list.innerHTML = '';
  cityBuildings.forEach(b => {
    const level = cityLevels[b.id] || 0;
    const cost = b.base * (level + 1);
    const card = document.createElement('div');
    card.className = 'city-card';
    card.innerHTML = `
      <div class="city-info">
        <div class="city-name">${b.icon} ${b.name}${level ? '<em>ур. ' + level + '</em>' : ''}</div>
        <div class="city-desc">${b.desc} — $${b.income}/сек за уровень</div>
      </div>
      <button class="city-buy" data-id="${b.id}">Купить · $${fmt(cost)}</button>`;
    list.appendChild(card);
  });
}

document.getElementById('city-list').addEventListener('click', function (e) {
  const btn = e.target.closest('.city-buy');
  if (!btn) return;
  const b = cityBuildings.find(x => x.id === btn.dataset.id);
  const level = cityLevels[b.id] || 0;
  const cost = b.base * (level + 1);
  if (usd < cost) return alert('Не хватает денег! Нужно $' + fmt(cost));
  usd -= cost;
  cityLevels[b.id] = level + 1;
  save();
  updateUI();
  renderCity();
});

// ====== Букмекерская ZHYKWIN ======
const teams = ['Zhyk FC', 'Кибер-Казань', 'Динамо Тапов', 'Спартак Монета', 'Локомотив Ликвидити', 'Зенит Зик'];
let match = null;
let betPending = false;

function newMatch() {
  const a = teams[Math.floor(Math.random() * teams.length)];
  let b = teams[Math.floor(Math.random() * teams.length)];
  while (b === a) b = teams[Math.floor(Math.random() * teams.length)];
  const rnd = (min, max) => (Math.random() * (max - min) + min).toFixed(2);
  match = { team1: a, team2: b, odds1: Number(rnd(1.4, 3.0)), oddsX: Number(rnd(2.8, 4.5)), odds2: Number(rnd(1.4, 3.0)) };
  renderMatch();
}

function renderMatch() {
  document.getElementById('match-teams').innerHTML =
    `<span>${match.team1}</span><span class="match-vs">VS</span><span>${match.team2}</span>`;
  document.getElementById('bet1').textContent = `${match.team1} · x${match.odds1}`;
  document.getElementById('betX').textContent = `Ничья · x${match.oddsX}`;
  document.getElementById('bet2').textContent = `${match.team2} · x${match.odds2}`;
}

function placeBet(choice) {
  if (betPending) return;
  const bet = parseFloat(document.getElementById('bet-amount').value);
  if (!bet || bet <= 0) return alert('Введи сумму ставки');
  if (bet > usd) return alert('Не хватает денег на ставку!');

  usd -= bet;
  save();
  updateUI();
  betPending = true;
  const resultEl = document.getElementById('bet-result');
  resultEl.className = 'bet-result';
  resultEl.textContent = '⚽ Матч идёт...';

  document.querySelectorAll('.bet-btn').forEach(b => b.disabled = true);

  setTimeout(function () {
    // честные шансы с небольшой маржой букмекера
    const raw = [1 / match.odds1, 1 / match.oddsX, 1 / match.odds2];
    const total = raw.reduce((s, p) => s + p, 0) / 0.95;
    const r = Math.random() * total;
    let outcome = 'X';
    if (r < raw[0]) outcome = '1';
    else if (r < raw[0] + raw[1]) outcome = 'X';
    else outcome = '2';

    const odds = outcome === '1' ? match.odds1 : outcome === 'X' ? match.oddsX : match.odds2;
    const label = outcome === '1' ? match.team1 : outcome === 'X' ? 'Ничья' : match.team2;

    if (outcome === choice.key) {
      usd += bet * odds;
      resultEl.className = 'bet-result win';
      resultEl.textContent = `🎉 Гол! Выиграла ставка на «${label}» — +$${fmt(bet * odds)}`;
    } else {
      resultEl.className = 'bet-result lose';
      resultEl.textContent = `💔 Увы, «${label}» — ставка $${fmt(bet)} сгорела`;
    }

    betPending = false;
    document.querySelectorAll('.bet-btn').forEach(b => b.disabled = false);
    save();
    updateUI();
    newMatch();
  }, 3000);
}

document.getElementById('bet1').addEventListener('click', () => placeBet({ key: '1' }));
document.getElementById('betX').addEventListener('click', () => placeBet({ key: 'X' }));
document.getElementById('bet2').addEventListener('click', () => placeBet({ key: '2' }));

// ====== Магазин ======
const shopItems = [
  { id: 'lemonade', icon: '🥤', name: 'Лимонад Zhyk Fresh',      price: 10,  mult: 1.5, time: 120 },
  { id: 'chips',    icon: '🍟', name: 'Чипсы Zhyk Crunch',      price: 25,  mult: 2,   time: 120 },
  { id: 'choco',    icon: '🍫', name: 'Шоколадка Zhyk Gold',    price: 50,  mult: 3,   time: 180 },
  { id: 'energy',   icon: '⚡', name: 'Энергетик ZHYKENERGY',   price: 100, mult: 5,   time: 180 },
];

function renderShop() {
  const list = document.getElementById('shop-list');
  list.innerHTML = '';
  shopItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-info">
        <div class="shop-name">${item.icon} ${item.name}</div>
        <div class="shop-desc">Буст тапалки x${item.mult} на ${item.time / 60} мин</div>
      </div>
      <button class="shop-buy" data-id="${item.id}">Купить · $${item.price}</button>`;
    list.appendChild(card);
  });
}

document.getElementById('shop-list').addEventListener('click', function (e) {
  const btn = e.target.closest('.shop-buy');
  if (!btn) return;
  const item = shopItems.find(x => x.id === btn.dataset.id);
  if (usd < item.price) return alert('Не хватает денег! Нужно $' + item.price);
  usd -= item.price;
  boost = { mult: item.mult, until: Date.now() + item.time * 1000 };
  save();
  updateUI();
});

// ====== Симуляция цены ======
function tick() {
  price = Math.max(0.05, price * (1 + (Math.random() - 0.48) * 0.025));
  priceHistory.push(price);
  if (priceHistory.length > 120) priceHistory.shift();

  // пассивный доход города
  const inc = cityIncome();
  if (inc > 0) usd += inc;

  // бустер мог закончиться
  if (boost && Date.now() >= boost.until) boost = null;

  save();
  updateUI();
  drawChart();
}
setInterval(tick, 1000);

// ====== Отрисовка графика ======
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

function drawChart() {
  const w = canvas.clientWidth;
  if (!w) return; // страница биржи скрыта
  const dpr = window.devicePixelRatio || 1;
  const h = canvas.clientHeight;
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

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, up ? 'rgba(0,229,160,.25)' : 'rgba(255,84,112,.25)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));

  ctx.save();
  ctx.lineTo(x(priceHistory.length - 1), h);
  ctx.lineTo(x(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(x(0), y(priceHistory[0]));
  for (let i = 1; i < priceHistory.length; i++) ctx.lineTo(x(i), y(priceHistory[i]));
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const lastX = x(priceHistory.length - 1);
  const lastY = y(price);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 4 + Math.sin(Date.now() / 300) * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = lineColor;
  ctx.fill();
}

// ====== Запуск ======
renderCity();
renderShop();
newMatch();
updateUI();
drawChart();
