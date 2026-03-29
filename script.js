/**
 * HerHealth+ — script.js
 * Handles: Dark mode, Navbar, Cycle Tracker, Mood Tracker,
 *          Symptom Checker, Water Tracker, Fitness Tracker,
 *          Chatbot, Contact Form
 */

/* ══════════════════════════════════════
   DARK MODE
══════════════════════════════════════ */
const darkToggle = document.getElementById('darkToggle');
const html = document.documentElement;

// Load saved preference
if (localStorage.getItem('theme') === 'dark') {
  html.setAttribute('data-theme', 'dark');
  darkToggle.textContent = '☀️';
}

darkToggle.addEventListener('click', () => {
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  darkToggle.textContent = isDark ? '🌙' : '☀️';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

/* ══════════════════════════════════════
   HAMBURGER MENU
══════════════════════════════════════ */
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// Close menu on link click
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    document.getElementById('navLinks').classList.remove('open');
  });
});

/* ══════════════════════════════════════
   ACTIVE NAV LINK (scroll spy)
══════════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 80) current = sec.id;
  });
  document.querySelectorAll('.nav-link').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
  });
});

/* ══════════════════════════════════════
   SCROLL TO TOOL HELPER
══════════════════════════════════════ */
function scrollToTool(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════
   MENSTRUAL CYCLE TRACKER
══════════════════════════════════════ */
function calculateCycle() {
  const lastPeriod  = document.getElementById('lastPeriod').value;
  const cycleLength = parseInt(document.getElementById('cycleLength').value, 10);
  const resultBox   = document.getElementById('cycleResult');

  if (!lastPeriod) {
    showResult(resultBox, '⚠️ Please enter your last period date.', false);
    return;
  }
  if (isNaN(cycleLength) || cycleLength < 21 || cycleLength > 45) {
    showResult(resultBox, '⚠️ Cycle length should be between 21 and 45 days.', false);
    return;
  }

  const last      = new Date(lastPeriod);
  const nextStart = addDays(last, cycleLength);
  const nextEnd   = addDays(nextStart, 5);

  // Fertile window: ovulation ~14 days before next period
  const ovulation    = addDays(nextStart, -14);
  const fertileStart = addDays(ovulation, -2);
  const fertileEnd   = addDays(ovulation, 2);

  const html = `
    <strong>📅 Next Period:</strong> ${fmt(nextStart)} – ${fmt(nextEnd)}<br/>
    <strong>🌿 Fertile Window:</strong> ${fmt(fertileStart)} – ${fmt(fertileEnd)}<br/>
    <strong>🥚 Estimated Ovulation:</strong> ${fmt(ovulation)}
  `;
  showResult(resultBox, html, true);

  // Persist
  localStorage.setItem('cycleData', JSON.stringify({ lastPeriod, cycleLength }));
}

// Load saved cycle data on page load
(function loadCycleData() {
  const saved = JSON.parse(localStorage.getItem('cycleData') || 'null');
  if (saved) {
    document.getElementById('lastPeriod').value  = saved.lastPeriod;
    document.getElementById('cycleLength').value = saved.cycleLength;
  }
})();

/* ══════════════════════════════════════
   MOOD TRACKER
══════════════════════════════════════ */
function logMood(mood) {
  // Highlight selected button
  document.querySelectorAll('.mood-btn').forEach(b => {
    b.classList.toggle('selected', b.dataset.mood === mood);
  });

  const logs = getMoodLogs();
  const today = todayStr();

  // Replace today's entry if exists
  const idx = logs.findIndex(e => e.date === today);
  if (idx > -1) logs[idx].mood = mood;
  else logs.unshift({ date: today, mood });

  // Keep last 14 entries
  if (logs.length > 14) logs.pop();

  localStorage.setItem('moodLogs', JSON.stringify(logs));
  renderMoodLog();
}

function getMoodLogs() {
  return JSON.parse(localStorage.getItem('moodLogs') || '[]');
}

function renderMoodLog() {
  const logs = getMoodLogs();
  const container = document.getElementById('moodLog');
  if (!logs.length) {
    container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">No mood entries yet.</p>';
    return;
  }
  container.innerHTML = logs.map(e => `
    <div class="mood-entry">
      <span>${e.mood}</span>
      <span class="mood-date">${e.date}</span>
    </div>
  `).join('');

  // Highlight today's mood button
  const today = logs.find(e => e.date === todayStr());
  if (today) {
    document.querySelectorAll('.mood-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mood === today.mood);
    });
  }
}

renderMoodLog();

/* ══════════════════════════════════════
   SYMPTOM CHECKER
══════════════════════════════════════ */

// Knowledge base: symptom sets → possible conditions + suggestions
const symptomDB = [
  {
    conditions: ['PCOS (Polycystic Ovary Syndrome)'],
    match: ['irregular_periods', 'acne', 'hair_loss', 'weight_gain'],
    threshold: 3,
    suggestions: [
      'Consult a gynecologist for hormonal evaluation.',
      'Maintain a balanced diet low in refined carbs.',
      'Regular moderate exercise can help regulate hormones.',
    ]
  },
  {
    conditions: ['Iron-Deficiency Anemia'],
    match: ['fatigue', 'heavy_bleeding', 'headaches'],
    threshold: 2,
    suggestions: [
      'Include iron-rich foods: spinach, lentils, red meat.',
      'Pair iron foods with vitamin C for better absorption.',
      'Ask your doctor about iron level testing.',
    ]
  },
  {
    conditions: ['Premenstrual Syndrome (PMS)'],
    match: ['mood_swings', 'bloating', 'cramps', 'fatigue'],
    threshold: 2,
    suggestions: [
      'Track your cycle to anticipate PMS symptoms.',
      'Reduce salt and caffeine intake before your period.',
      'Light exercise and adequate sleep can ease symptoms.',
    ]
  },
  {
    conditions: ['Endometriosis'],
    match: ['cramps', 'heavy_bleeding', 'bloating', 'fatigue'],
    threshold: 3,
    suggestions: [
      'Severe cramps with heavy bleeding warrant a medical evaluation.',
      'Keep a symptom diary to share with your doctor.',
      'Heat therapy can provide temporary relief from cramps.',
    ]
  },
  {
    conditions: ['Stress / Burnout'],
    match: ['mood_swings', 'headaches', 'fatigue', 'irregular_periods'],
    threshold: 2,
    suggestions: [
      'Practice mindfulness or meditation daily.',
      'Prioritize 7–9 hours of quality sleep.',
      'Consider speaking with a mental health professional.',
    ]
  },
];

function checkSymptoms() {
  const checked = [...document.querySelectorAll('#symptomGrid input:checked')].map(i => i.value);
  const resultBox = document.getElementById('symptomResult');

  if (!checked.length) {
    showResult(resultBox, '⚠️ Please select at least one symptom.', false);
    return;
  }

  const matches = symptomDB.filter(entry => {
    const overlap = entry.match.filter(s => checked.includes(s)).length;
    return overlap >= entry.threshold;
  });

  if (!matches.length) {
    showResult(resultBox, '✅ No strong pattern detected. If symptoms persist, consult a healthcare provider.', true);
    return;
  }

  let html = '';
  matches.forEach(m => {
    html += `<strong>🔍 Possible: ${m.conditions.join(', ')}</strong><br/>`;
    m.suggestions.forEach(s => { html += `• ${s}<br/>`; });
    html += '<br/>';
  });

  showResult(resultBox, html, true);
}

/* ══════════════════════════════════════
   WATER INTAKE TRACKER
══════════════════════════════════════ */
const WATER_GOAL = 8;

function getWaterData() {
  const saved = JSON.parse(localStorage.getItem('waterData') || 'null');
  // Reset if saved date is not today
  if (!saved || saved.date !== todayStr()) return { date: todayStr(), count: 0 };
  return saved;
}

function saveWaterData(count) {
  localStorage.setItem('waterData', JSON.stringify({ date: todayStr(), count }));
}

function renderWater() {
  const { count } = getWaterData();
  document.getElementById('waterCount').textContent = count;
  const pct = Math.min((count / WATER_GOAL) * 100, 100);
  document.getElementById('waterBar').style.width = pct + '%';

  // Render glass icons
  const container = document.getElementById('waterGlasses');
  container.innerHTML = '';
  for (let i = 0; i < WATER_GOAL; i++) {
    const span = document.createElement('span');
    span.className = 'glass-icon' + (i < count ? ' filled' : '');
    span.textContent = i < count ? '🥤' : '🫙';
    container.appendChild(span);
  }
}

function addWater() {
  const data = getWaterData();
  if (data.count >= WATER_GOAL) return;
  data.count++;
  saveWaterData(data.count);
  renderWater();
}

function resetWater() {
  saveWaterData(0);
  renderWater();
}

renderWater();

/* ══════════════════════════════════════
   FITNESS TRACKER
══════════════════════════════════════ */
const EXERCISES = [
  { id: 'yoga',      icon: '🧘', name: 'Morning Yoga (20 min)' },
  { id: 'walk',      icon: '🚶', name: 'Brisk Walk (30 min)' },
  { id: 'stretch',   icon: '🤸', name: 'Full Body Stretch' },
  { id: 'breathing', icon: '🌬️', name: 'Breathing Exercises' },
  { id: 'dance',     icon: '💃', name: 'Dance Workout (15 min)' },
];

function getFitnessData() {
  const saved = JSON.parse(localStorage.getItem('fitnessData') || 'null');
  if (!saved || saved.date !== todayStr()) return { date: todayStr(), done: [] };
  return saved;
}

function saveFitnessData(done) {
  localStorage.setItem('fitnessData', JSON.stringify({ date: todayStr(), done }));
}

function toggleExercise(id) {
  const data = getFitnessData();
  const idx  = data.done.indexOf(id);
  if (idx > -1) data.done.splice(idx, 1);
  else data.done.push(id);
  saveFitnessData(data.done);
  renderFitness();
}

function renderFitness() {
  const { done } = getFitnessData();
  const list = document.getElementById('exerciseList');
  list.innerHTML = EXERCISES.map(ex => `
    <li class="exercise-item ${done.includes(ex.id) ? 'done' : ''}" id="ex-${ex.id}">
      <div class="ex-left">
        <span class="ex-icon">${ex.icon}</span>
        <span>${ex.name}</span>
      </div>
      <button class="check-btn" onclick="toggleExercise('${ex.id}')" aria-label="Toggle ${ex.name}">
        ${done.includes(ex.id) ? '✓' : ''}
      </button>
    </li>
  `).join('');

  const count = done.length;
  document.getElementById('fitnessCount').textContent = count;
  const pct = (count / EXERCISES.length) * 100;
  document.getElementById('fitnessBar').style.width = pct + '%';
}

renderFitness();

/* ══════════════════════════════════════
   WELLNESS CHATBOT (rule-based)
══════════════════════════════════════ */
const chatRules = [
  { pattern: /hello|hi|hey/i,           reply: "Hi there! 💜 How can I support your wellness today?" },
  { pattern: /period|cycle|menstrual/i,  reply: "Tracking your cycle helps you understand your body better. Use the Cycle Tracker above to predict your next period and fertile window! 🌙" },
  { pattern: /mood|sad|stress|anxious/i, reply: "It's okay to not feel okay. 💛 Try journaling, a short walk, or deep breathing. You can also log your mood in the Mood Tracker." },
  { pattern: /water|hydrat/i,            reply: "Aim for 8 glasses of water a day. Staying hydrated supports energy, skin health, and hormonal balance! 💧" },
  { pattern: /sleep/i,                   reply: "Quality sleep (7–9 hours) is essential for hormonal health and mental well-being. Try a consistent bedtime routine. 😴" },
  { pattern: /exercise|yoga|fitness|workout/i, reply: "Even 20 minutes of gentle movement daily can boost your mood and energy. Check out the Fitness Tracker! 🧘" },
  { pattern: /diet|food|nutrition|eat/i, reply: "Focus on whole foods: leafy greens, legumes, healthy fats, and lean protein. Limit processed sugar and refined carbs. 🥗" },
  { pattern: /pcos|hormone/i,            reply: "PCOS affects many women. A balanced diet, regular exercise, and medical guidance are key. Use the Symptom Checker for more info. 🩺" },
  { pattern: /pregnant|pregnancy/i,      reply: "Congratulations! 🤰 Prenatal care, folic acid, and regular check-ups are vital. Always consult your OB-GYN for personalized advice." },
  { pattern: /thank/i,                   reply: "You're so welcome! 💜 Take care of yourself — you deserve it." },
  { pattern: /help/i,                    reply: "I can help with: cycle tracking, mood, hydration, sleep, nutrition, fitness, and general wellness tips. What would you like to know?" },
];

const DEFAULT_REPLY = "That's a great question! For personalized medical advice, please consult a healthcare professional. I'm here for general wellness support. 💜";

function sendChat() {
  const input = document.getElementById('chatInput');
  const msg   = input.value.trim();
  if (!msg) return;

  appendChat(msg, 'user');
  input.value = '';

  // Find matching rule
  const rule  = chatRules.find(r => r.pattern.test(msg));
  const reply = rule ? rule.reply : DEFAULT_REPLY;

  // Simulate typing delay
  setTimeout(() => appendChat(reply, 'bot'), 500);
}

function appendChat(text, sender) {
  const window = document.getElementById('chatWindow');
  const div    = document.createElement('div');
  div.className = `chat-msg ${sender}`;
  div.textContent = text;
  window.appendChild(div);
  window.scrollTop = window.scrollHeight;
}

/* ══════════════════════════════════════
   CONTACT FORM VALIDATION
══════════════════════════════════════ */
document.getElementById('contactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  let valid = true;

  const name  = document.getElementById('cName').value.trim();
  const email = document.getElementById('cEmail').value.trim();
  const msg   = document.getElementById('cMsg').value.trim();

  // Clear previous errors
  ['cNameErr','cEmailErr','cMsgErr'].forEach(id => document.getElementById(id).textContent = '');

  if (!name) {
    document.getElementById('cNameErr').textContent = 'Name is required.';
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('cEmailErr').textContent = 'Please enter a valid email address.';
    valid = false;
  }
  if (!msg || msg.length < 10) {
    document.getElementById('cMsgErr').textContent = 'Message must be at least 10 characters.';
    valid = false;
  }

  const feedback = document.getElementById('formFeedback');
  if (valid) {
    feedback.className = 'form-feedback success';
    feedback.textContent = '✅ Message sent! We\'ll get back to you soon.';
    feedback.hidden = false;
    this.reset();
  } else {
    feedback.className = 'form-feedback error';
    feedback.textContent = '❌ Please fix the errors above and try again.';
    feedback.hidden = false;
  }

  setTimeout(() => { feedback.hidden = true; }, 5000);
});

/* ══════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════ */

/** Add days to a Date object */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Format date as "Mon DD, YYYY" */
function fmt(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Today's date as YYYY-MM-DD string */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Show/hide result box with content */
function showResult(el, html, success) {
  el.innerHTML = html;
  el.className = 'result-box' + (success ? ' success' : '');
  el.hidden = false;
}
