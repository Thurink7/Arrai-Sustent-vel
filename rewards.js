/**
 * Arraiá Sustentável — recompensas
 */
import { requireAuth, getCurrentUser } from './auth.js';
import { upsertUser } from './storage.js';
import { showToast, refreshStreakAndSave } from './ui.js';

export const CATALOG = [
  { id: '1', nome: 'Garrafa reutilizável', custo: 50 },
  { id: '2', nome: 'Ecobag temática', custo: 100 },
  { id: '3', nome: 'Ingresso área VIP', custo: 200 },
];

export function redeemReward(rewardId) {
  const reward = CATALOG.find((r) => r.id === rewardId);
  if (!reward) {
    showToast('Recompensa não encontrada.', 'error');
    return false;
  }
  const user = getCurrentUser();
  if (!user) {
    showToast('Faça login novamente.', 'error');
    return false;
  }
  if (user.pontos < reward.custo) {
    showToast(
      `Faltam ${reward.custo - user.pontos} pts para desbloquear.`,
      'error'
    );
    return false;
  }
  user.pontos -= reward.custo;
  upsertUser(user);
  showToast(`${reward.nome} resgatado · −${reward.custo} pts`, 'success');
  return true;
}

export function initRewardsPage() {
  if (!requireAuth()) return;
  refreshStreakAndSave();

  const root = document.getElementById('rewards-list');
  if (!root) return;

  function render() {
    const user = getCurrentUser();
    const pts = user?.pontos ?? 0;
    const saldoEl = document.getElementById('rewards-saldo');
    if (saldoEl) saldoEl.textContent = String(pts);

    root.innerHTML = CATALOG.map((r) => {
      const can = pts >= r.custo;
      const cardCls = can
        ? 'border-neutral-800 bg-neutral-900 shadow-lg shadow-[#FACC15]/5'
        : 'border-neutral-800/80 bg-neutral-900/60 opacity-75';
      const btnCls = can
        ? 'bg-[#FACC15] hover:bg-yellow-300 text-black font-semibold'
        : 'cursor-not-allowed bg-neutral-800 text-neutral-500';
      return `
      <article class="rounded-2xl border p-5 transition-all duration-200 ${cardCls}">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold text-neutral-100">${escapeHtml(r.nome)}</h3>
            <p class="mt-1 text-sm text-neutral-400">${r.custo} pts</p>
          </div>
          <span class="shrink-0 rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${can ? 'border-[#FACC15]/40 text-[#FACC15]' : 'text-neutral-500'}">${can ? 'Disponível' : 'Bloqueado'}</span>
        </div>
        <button type="button" data-reward="${r.id}" ${can ? '' : 'disabled'}
          class="mt-5 w-full rounded-2xl py-3 text-sm transition-all duration-200 ${can ? `${btnCls} hover:scale-105 active:scale-100` : btnCls}">
          ${can ? 'Resgatar' : 'Pontos insuficientes'}
        </button>
      </article>`;
    }).join('');

    root.querySelectorAll('[data-reward]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-reward');
        if (redeemReward(id)) render();
      });
    });
  }

  render();
}

function escapeHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
