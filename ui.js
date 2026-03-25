/**
 * Arraiá Sustentável — UI, gamificação e tema
 */
import { PONTOS_META, getSessionEmail, getUserByEmail, upsertUser } from './storage.js';

export function refreshStreakAndSave() {
  const email = getSessionEmail();
  if (!email) return null;
  let user = getUserByEmail(email);
  if (!user) return null;
  user = computeStreakUpdate(user);
  upsertUser(user);
  return user;
}

export function getGreetingTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function firstNameFromEmail(email) {
  if (!email) return 'você';
  const local = email.split('@')[0] || '';
  const first = local.split(/[._-]/)[0] || local;
  if (!first) return 'você';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

export function motivationalLine() {
  const lines = [
    'Sustentabilidade com sotaque de festa.',
    'Cada ponto é um passo mais verde.',
    'Junino de verdade combina com atitude.',
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

export function showToast(message, type = 'info') {
  let el = document.getElementById('arraia-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'arraia-toast';
    document.body.appendChild(el);
  }
  const base =
    'fixed bottom-24 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-medium shadow-lg shadow-black/40 transition-all duration-200 md:left-auto md:right-4 md:mx-0';
  const bg =
    type === 'success'
      ? 'border border-emerald-500/30 bg-emerald-950/95 text-emerald-100'
      : type === 'error'
        ? 'border border-red-500/30 bg-red-950/95 text-red-100'
        : 'border border-blue-500/30 bg-neutral-900 text-neutral-100';
  el.className = `${base} ${bg}`;
  el.textContent = message;
  clearTimeout(el._hide);
  el._hide = setTimeout(() => {
    el.classList.add('opacity-0');
  }, 3200);
  el.classList.remove('opacity-0');
}

/** Overlay de feedback pós-scan (+10) */
export function showScanFeedbackOverlay(pointsGained, newTotal) {
  const root = document.getElementById('scan-feedback-root');
  if (!root) return;

  root.classList.remove('pointer-events-none', 'opacity-0');
  root.classList.add('opacity-100');
  root.setAttribute('aria-hidden', 'false');

  const ptsEl = document.getElementById('scan-feedback-delta');
  const totalEl = document.getElementById('scan-feedback-total');
  if (ptsEl) {
    ptsEl.textContent = `+${pointsGained}`;
    ptsEl.classList.remove('point-pop');
    void ptsEl.offsetWidth;
    ptsEl.classList.add('point-pop');
  }
  if (totalEl && typeof newTotal === 'number') {
    totalEl.textContent = String(newTotal);
    totalEl.classList.remove('point-pop');
    void totalEl.offsetWidth;
    totalEl.classList.add('point-pop');
  }
}

export function animateNumber(el, from, to, duration = 700) {
  if (!el) return;
  const start = performance.now();
  function frame(now) {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - p) ** 3;
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

export function formatDateBR(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDayHeading(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
  if (sameDay(d, today)) return 'Hoje';
  if (sameDay(d, yesterday)) return 'Ontem';
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

export function dateOnly(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.toISOString().slice(0, 10);
}

export function computeStreakUpdate(user) {
  const today = dateOnly(new Date().toISOString());
  const last = user.ultimoAcesso ? dateOnly(user.ultimoAcesso) : null;
  let streak = user.streak || 0;

  if (!last) {
    streak = 1;
  } else if (last === today) {
    // mantém
  } else {
    const lastD = new Date(`${last}T12:00:00`);
    const todayD = new Date(`${today}T12:00:00`);
    const diffDays = Math.round((todayD - lastD) / 86400000);
    if (diffDays === 1) streak += 1;
    else if (diffDays > 1) streak = 1;
  }

  return {
    ...user,
    streak,
    ultimoAcesso: new Date().toISOString(),
  };
}

export function renderPointsProgress(pontos) {
  const pct = Math.min(100, Math.round((pontos / PONTOS_META) * 100));
  const showBadge = pontos >= PONTOS_META * 0.5;
  return {
    pct,
    showBadge,
    html: `
      <div class="mt-2">
        <div class="mb-2 flex items-center justify-between text-xs text-neutral-400">
          <span>Meta ${PONTOS_META} pts</span>
          <span class="font-semibold text-neutral-200">${pct}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            class="h-full rounded-full bg-gradient-to-r from-[#FACC15] to-orange-500 shadow-lg shadow-[#FACC15]/20 transition-all duration-500"
            style="width:${pct}%"
          ></div>
        </div>
        ${
          showBadge
            ? '<p class="mt-3 text-center text-xs font-medium text-[#FACC15]/90">No ritmo certo</p>'
            : ''
        }
      </div>
    `,
  };
}
