const API_BASE = (location.hostname === 'localhost')
  ? 'http://localhost:7071/api'
  : '/api'; 

const form = document.getElementById('sessionForm');
const statusEl = document.getElementById('saveStatus');
const tbody = document.getElementById('sessionsTbody');
const summaryEl = document.getElementById('summary');
const refreshBtn = document.getElementById('refresh');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());
  payload.minutes = Number(payload.minutes);
  try {
    statusEl.textContent = 'Saving...';
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await res.text());
    statusEl.textContent = 'Saved ✅';
    form.reset();
    await loadSessions();
    await loadSummary();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Error saving ';
  } finally {
    setTimeout(()=>statusEl.textContent='', 2000);
  }
});

refreshBtn.addEventListener('click', async () => {
  await Promise.all([loadSessions(), loadSummary()]);
});

async function loadSessions() {
  const res = await fetch(`${API_BASE}/sessions`);
  const data = await res.json();
  tbody.innerHTML = data.items.map(s => `
    <tr>
      <td>${new Date(s.createdAt).toLocaleString()}</td>
      <td>${s.course}</td>
      <td>${s.topic}</td>
      <td>${s.minutes}</td>
      <td>${s.mood || ''}</td>
    </tr>
  `).join('');
}

async function loadSummary() {
  const res = await fetch(`${API_BASE}/summaries/weekly`);
  if (!res.ok) { summaryEl.textContent = 'No summary yet.'; return; }
  const sum = await res.json();
  const byCourse = Object.entries(sum.byCourse || {})
    .map(([k,v]) => `${k}: ${v} min`).join(' • ');
  summaryEl.textContent = `Total: ${sum.totalMinutes || 0} min · ${byCourse || '—'}`;
}

loadSessions();
loadSummary();

