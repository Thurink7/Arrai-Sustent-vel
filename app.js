/**
 * Arraiá Sustentável — bootstrap (ES modules)
 * A interface usa js/arraia-app.js (script clássico) para funcionar também via file://
 */
import { requireAuth, logout } from './auth.js';
import { getHistoryForEmail } from './storage.js';
import {
  renderPointsProgress,
  formatDateBR,
  refreshStreakAndSave,
  getGreetingTime,
  firstNameFromEmail,
  motivationalLine,
  animateNumber,
  formatDayHeading,
} from './ui.js';
import { initScanPage } from './scan.js';
import { initRewardsPage } from './rewards.js';

function initDashboard() {
  if (!requireAuth()) return;
  const user = refreshStreakAndSave();
  if (!user) return;

  const greetEl = document.getElementById('dashboard-greeting');
  const subEl = document.getElementById('dashboard-sub');
  if (greetEl) {
    greetEl.textContent = `${getGreetingTime()}, ${firstNameFromEmail(user.email)}`;
  }
  if (subEl) subEl.textContent = motivationalLine();

  const pontosEl = document.getElementById('dashboard-pontos');
  const streakEl = document.getElementById('dashboard-streak');
  const lastEl = document.getElementById('dashboard-ultima');
  const progressEl = document.getElementById('dashboard-progress');
  const previewEl = document.getElementById('dashboard-history-preview');

  const targetPts = user.pontos ?? 0;
  if (pontosEl) animateNumber(pontosEl, 0, targetPts, 900);
  if (streakEl) streakEl.textContent = String(user.streak ?? 0);

  const list = getHistoryForEmail(user.email);
  if (lastEl) {
    lastEl.textContent =
      list.length > 0 ? formatDateBR(list[0].data) : 'Nenhuma leitura ainda';
  }

  if (progressEl) {
    const { html } = renderPointsProgress(targetPts);
    progressEl.innerHTML = html;
  }

  if (previewEl) {
    const slice = list.slice(0, 3);
    if (slice.length === 0) {
      previewEl.innerHTML =
        '<p class="text-sm text-neutral-500">Escaneie um QR para ver atividades aqui.</p>';
    } else {
      previewEl.innerHTML = slice
        .map(
          (h) => `
        <div class="flex items-center justify-between border-b border-neutral-800 py-3 last:border-0">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-neutral-100">${escapeHtml(h.local)}</p>
            <p class="text-xs text-neutral-500">${formatDateBR(h.data)}</p>
          </div>
          <span class="ml-3 shrink-0 text-sm font-semibold text-[#FACC15]">+${h.pontos}</span>
        </div>`
        )
        .join('');
    }
  }
}

function initProfilePage() {
  if (!requireAuth()) return;
  const user = refreshStreakAndSave();
  if (!user) return;

  const initial = firstNameFromEmail(user.email).charAt(0).toUpperCase();
  const av = document.getElementById('profile-avatar');
  if (av) av.textContent = initial;

  const emailEl = document.getElementById('profile-email');
  const pontosEl = document.getElementById('profile-pontos');
  const streakEl = document.getElementById('profile-streak');
  if (emailEl) emailEl.textContent = user.email;
  if (pontosEl) {
    animateNumber(pontosEl, 0, user.pontos ?? 0, 700);
  }
  if (streakEl) streakEl.textContent = String(user.streak ?? 0);

  const btn = document.getElementById('profile-logout');
  if (btn) {
    btn.addEventListener('click', () => {
      logout();
      window.location.href = 'login.html';
    });
  }
}

function initHistoryPage() {
  if (!requireAuth()) return;
  const user = refreshStreakAndSave();
  if (!user) return;
  const root = document.getElementById('history-list');
  if (!root) return;

  const items = getHistoryForEmail(user.email);

  if (items.length === 0) {
    root.innerHTML =
      '<p class="py-12 text-center text-sm text-neutral-500">Nenhum registro. Escaneie um QR na aba Scan.</p>';
    return;
  }

  const byDay = new Map();
  items.forEach((h) => {
    const key = h.data ? h.data.slice(0, 10) : '';
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(h);
  });

  const dayKeys = Array.from(byDay.keys()).sort((a, b) => b.localeCompare(a));

  const sections = [];
  dayKeys.forEach((dayKey) => {
    const dayItems = byDay.get(dayKey);
    const heading = formatDayHeading(dayItems[0].data);
    const cards = dayItems
      .map(
        (h) => `
      <article class="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-lg transition-all duration-200 hover:border-neutral-700">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-medium text-neutral-100">${escapeHtml(h.local)}</p>
            <p class="mt-1 text-xs text-neutral-500">${formatDateBR(h.data)}</p>
          </div>
          <span class="shrink-0 rounded-lg bg-[#FACC15]/10 px-2 py-1 text-xs font-semibold text-[#FACC15]">+${h.pontos}</span>
        </div>
      </article>`
      )
      .join('');
    sections.push(`
      <section class="space-y-3">
        <h2 class="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">${heading}</h2>
        <div class="space-y-2">${cards}</div>
      </section>`);
  });

  root.innerHTML = `<div class="space-y-8">${sections.join('')}</div>`;
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

const page = document.body?.dataset?.page;

if (page === 'dashboard') initDashboard();
else if (page === 'profile') initProfilePage();
else if (page === 'history') initHistoryPage();
else if (page === 'scan') initScanPage();
else if (page === 'rewards') initRewardsPage();
else if (page === 'map') {
  if (requireAuth()) refreshStreakAndSave();
}
