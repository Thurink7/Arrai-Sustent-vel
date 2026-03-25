/**
 * Arraiá Sustentável — app único (sem ES modules → funciona em file:// e http)
 */
(function () {
  'use strict';

  var PONTOS_META = 200;
  var PONTOS_SCAN = 10;

  var SK = {
    USERS: 'arraia_users',
    SESSION: 'arraia_session',
    HISTORY: 'arraia_history',
  };

  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch (e) {
      return fallback;
    }
  }

  function getUsers() {
    return safeParse(localStorage.getItem(SK.USERS), []);
  }

  function saveUsers(users) {
    localStorage.setItem(SK.USERS, JSON.stringify(users));
  }

  function getSessionEmail() {
    return localStorage.getItem(SK.SESSION);
  }

  function setSessionEmail(email) {
    if (email) localStorage.setItem(SK.SESSION, email);
    else localStorage.removeItem(SK.SESSION);
  }

  function getUserByEmail(email) {
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) return users[i];
    }
    return null;
  }

  function upsertUser(user) {
    var users = getUsers();
    var i = -1;
    for (var j = 0; j < users.length; j++) {
      if (users[j].email === user.email) {
        i = j;
        break;
      }
    }
    if (i >= 0) users[i] = user;
    else users.push(user);
    saveUsers(users);
  }

  function getHistoryForEmail(email) {
    var all = safeParse(localStorage.getItem(SK.HISTORY), {});
    return Array.isArray(all[email]) ? all[email] : [];
  }

  function appendHistoryEntry(email, entry) {
    var all = safeParse(localStorage.getItem(SK.HISTORY), {});
    if (!Array.isArray(all[email])) all[email] = [];
    all[email].unshift(entry);
    localStorage.setItem(SK.HISTORY, JSON.stringify(all));
  }

  function clearInvalidSession() {
    var email = getSessionEmail();
    if (email && !getUserByEmail(email)) setSessionEmail(null);
  }

  function login(email, password) {
    var normalized = String(email).trim().toLowerCase();
    var user = getUserByEmail(normalized);
    if (!user || user.password !== password) {
      return { ok: false, message: 'E-mail ou senha inválidos.' };
    }
    setSessionEmail(normalized);
    return { ok: true, user: user };
  }

  function register(email, password) {
    var normalized = String(email).trim().toLowerCase();
    if (!normalized || !password) {
      return { ok: false, message: 'Preencha e-mail e senha.' };
    }
    if (getUserByEmail(normalized)) {
      return { ok: false, message: 'Este e-mail já está cadastrado.' };
    }
    var user = {
      email: normalized,
      password: password,
      pontos: 0,
      streak: 0,
      ultimoAcesso: '',
    };
    upsertUser(user);
    setSessionEmail(normalized);
    return { ok: true, user: user };
  }

  function logout() {
    setSessionEmail(null);
  }

  function getCurrentUser() {
    var email = getSessionEmail();
    if (!email) return null;
    return getUserByEmail(email);
  }

  function requireAuth(redirectPath) {
    redirectPath = redirectPath || 'login.html';
    clearInvalidSession();
    var email = getSessionEmail();
    if (!email) {
      window.location.href = redirectPath;
      return false;
    }
    if (!getUserByEmail(email)) {
      setSessionEmail(null);
      window.location.href = redirectPath;
      return false;
    }
    return true;
  }

  function dateOnly(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.toISOString().slice(0, 10);
  }

  function computeStreakUpdate(user) {
    var today = dateOnly(new Date().toISOString());
    var last = user.ultimoAcesso ? dateOnly(user.ultimoAcesso) : null;
    var streak = user.streak || 0;

    if (!last) {
      streak = 1;
    } else if (last === today) {
      /* mantém */
    } else {
      var lastD = new Date(last + 'T12:00:00');
      var todayD = new Date(today + 'T12:00:00');
      var diffDays = Math.round((todayD - lastD) / 86400000);
      if (diffDays === 1) streak += 1;
      else if (diffDays > 1) streak = 1;
    }

    var out = {};
    for (var key in user) {
      if (Object.prototype.hasOwnProperty.call(user, key)) {
        out[key] = user[key];
      }
    }
    out.streak = streak;
    out.ultimoAcesso = new Date().toISOString();
    return out;
  }

  function refreshStreakAndSave() {
    var email = getSessionEmail();
    if (!email) return null;
    var user = getUserByEmail(email);
    if (!user) return null;
    user = computeStreakUpdate(user);
    upsertUser(user);
    return user;
  }

  function getGreetingTime() {
    var h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  function firstNameFromEmail(email) {
    if (!email) return 'você';
    var local = email.split('@')[0] || '';
    var first = (local.split(/[._-]/)[0] || local) || '';
    if (!first) return 'você';
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }

  function motivationalLine() {
    var lines = [
      'Sustentabilidade com sotaque de festa.',
      'Cada ponto é um passo mais verde.',
      'Junino de verdade combina com atitude.',
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function showToast(message, type) {
    type = type || 'info';
    var el = document.getElementById('arraia-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'arraia-toast';
      document.body.appendChild(el);
    }
    var base =
      'fixed bottom-24 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl px-4 py-3 text-center text-sm font-medium shadow-lg shadow-black/40 transition-all duration-200 md:left-auto md:right-4 md:mx-0';
    var bg =
      type === 'success'
        ? 'border border-emerald-500/30 bg-emerald-950/95 text-emerald-100'
        : type === 'error'
          ? 'border border-red-500/30 bg-red-950/95 text-red-100'
          : 'border border-blue-500/30 bg-neutral-900 text-neutral-100';
    el.className = base + ' ' + bg;
    el.textContent = message;
    el.classList.remove('opacity-0');
  }

  function showScanFeedbackOverlay(pointsGained, newTotal) {
    var root = document.getElementById('scan-feedback-root');
    if (!root) return;
    root.classList.remove('pointer-events-none', 'opacity-0');
    root.classList.add('opacity-100');
    root.setAttribute('aria-hidden', 'false');
    var ptsEl = document.getElementById('scan-feedback-delta');
    var totalEl = document.getElementById('scan-feedback-total');
    if (ptsEl) {
      ptsEl.textContent = '+' + pointsGained;
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

  function formatDateBR(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDayHeading(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    function sameDay(a, b) {
      return (
        a.getDate() === b.getDate() &&
        a.getMonth() === b.getMonth() &&
        a.getFullYear() === b.getFullYear()
      );
    }
    if (sameDay(d, today)) return 'Hoje';
    if (sameDay(d, yesterday)) return 'Ontem';
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  }

  function renderPointsProgress(pontos) {
    var pct = Math.min(100, Math.round((pontos / PONTOS_META) * 100));
    var showBadge = pontos >= PONTOS_META * 0.5;
    return {
      html:
        '<div class="mt-2">' +
        '<div class="mb-2 flex items-center justify-between text-xs text-neutral-400">' +
        '<span>Meta ' +
        PONTOS_META +
        ' pontos</span>' +
        '<span class="font-semibold text-neutral-200">' +
        pct +
        '%</span></div>' +
        '<div class="h-2 w-full overflow-hidden rounded-full bg-neutral-800">' +
        '<div class="h-full rounded-full bg-gradient-to-r from-[#FACC15] to-orange-500 shadow-lg shadow-[#FACC15]/20 transition-all duration-500" style="width:' +
        pct +
        '%"></div></div>' +
        (showBadge
          ? '<p class="mt-3 text-center text-xs font-medium text-[#FACC15]/90">No ritmo certo</p>'
          : '') +
        '</div>',
    };
  }

  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  var CATALOG = [
    { id: '1', nome: 'Garrafa reutilizável', custo: 50 },
    { id: '2', nome: 'Ecobag temática', custo: 100 },
    { id: '3', nome: 'Ingresso área VIP', custo: 200 },
  ];

  function grantScanPoints(localLabel) {
    var user = getCurrentUser();
    if (!user) return { ok: false, message: 'Sessão inválida.' };
    user.pontos = (user.pontos || 0) + PONTOS_SCAN;
    upsertUser(user);
    appendHistoryEntry(user.email, {
      data: new Date().toISOString(),
      local: localLabel || 'QR / manual',
      pontos: PONTOS_SCAN,
    });
    return { ok: true, pontos: user.pontos };
  }

  var scanHandled = false;

  function initDashboard() {
    if (!requireAuth()) return;
    var user = refreshStreakAndSave();
    if (!user) return;

    var greetEl = document.getElementById('dashboard-greeting');
    var subEl = document.getElementById('dashboard-sub');
    if (greetEl) greetEl.textContent = getGreetingTime() + ', ' + firstNameFromEmail(user.email);
    if (subEl) subEl.textContent = motivationalLine();

    var pontosEl = document.getElementById('dashboard-pontos');
    var streakEl = document.getElementById('dashboard-streak');
    var lastEl = document.getElementById('dashboard-ultima');
    var progressEl = document.getElementById('dashboard-progress');
    var previewEl = document.getElementById('dashboard-history-preview');

    var targetPts = user.pontos || 0;
    if (pontosEl) pontosEl.textContent = String(targetPts);
    if (streakEl) streakEl.textContent = String(user.streak || 0);

    var list = getHistoryForEmail(user.email);
    if (lastEl) {
      lastEl.textContent =
        list.length > 0 ? formatDateBR(list[0].data) : 'Nenhuma leitura ainda';
    }

    if (progressEl) {
      progressEl.innerHTML = renderPointsProgress(targetPts).html;
    }

    if (previewEl) {
      var slice = list.slice(0, 3);
      if (slice.length === 0) {
        previewEl.innerHTML =
          '<p class="text-sm text-neutral-500">Escaneie um QR para ver atividades aqui.</p>';
      } else {
        previewEl.innerHTML = slice
          .map(function (h) {
            return (
              '<div class="flex items-center justify-between border-b border-neutral-800 py-3 last:border-0">' +
              '<div class="min-w-0 flex-1">' +
              '<p class="truncate text-sm font-medium text-neutral-100">' +
              escapeHtml(h.local) +
              '</p>' +
              '<p class="text-xs text-neutral-500">' +
              formatDateBR(h.data) +
              '</p></div>' +
              '<span class="ml-3 shrink-0 text-sm font-semibold text-[#FACC15]">+' +
              h.pontos +
              '</span></div>'
            );
          })
          .join('');
      }
    }
  }

  function initProfilePage() {
    if (!requireAuth()) return;
    var user = refreshStreakAndSave();
    if (!user) return;

    var initial = firstNameFromEmail(user.email).charAt(0).toUpperCase();
    var av = document.getElementById('profile-avatar');
    if (av) av.textContent = initial;

    var emailEl = document.getElementById('profile-email');
    var pontosEl = document.getElementById('profile-pontos');
    var streakEl = document.getElementById('profile-streak');
    if (emailEl) emailEl.textContent = user.email;
  if (pontosEl) pontosEl.textContent = String(user.pontos || 0);
  if (streakEl) streakEl.textContent = String(user.streak || 0);

    var btn = document.getElementById('profile-logout');
    if (btn) {
      btn.addEventListener('click', function () {
        logout();
        window.location.href = 'login.html';
      });
    }
  }

  function initHistoryPage() {
    if (!requireAuth()) return;
    var user = refreshStreakAndSave();
    if (!user) return;
    var root = document.getElementById('history-list');
    if (!root) return;

    var items = getHistoryForEmail(user.email);
    if (items.length === 0) {
      root.innerHTML =
        '<p class="py-12 text-center text-sm text-neutral-500">Nenhum registro. Use a aba Escanear.</p>';
      return;
    }

    var byDay = {};
    items.forEach(function (h) {
      var key = h.data ? h.data.slice(0, 10) : '';
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(h);
    });

    var dayKeys = Object.keys(byDay).sort(function (a, b) {
      return b.localeCompare(a);
    });

    var sections = dayKeys.map(function (dayKey) {
      var dayItems = byDay[dayKey];
      var heading = formatDayHeading(dayItems[0].data);
      var cards = dayItems
        .map(function (h) {
          return (
            '<article class="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 shadow-lg transition-all duration-200 hover:border-neutral-700">' +
            '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0">' +
            '<p class="text-sm font-medium text-neutral-100">' +
            escapeHtml(h.local) +
            '</p>' +
            '<p class="mt-1 text-xs text-neutral-500">' +
            formatDateBR(h.data) +
            '</p></div>' +
            '<span class="shrink-0 rounded-lg bg-[#FACC15]/10 px-2 py-1 text-xs font-semibold text-[#FACC15]">+' +
            h.pontos +
            '</span></div></article>'
          );
        })
        .join('');
      return (
        '<section class="space-y-3">' +
        '<h2 class="px-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">' +
        heading +
        '</h2>' +
        '<div class="space-y-2">' +
        cards +
        '</div></section>'
      );
    });

    root.innerHTML = '<div class="space-y-8">' + sections.join('') + '</div>';
  }

  function finishScanFlow(localLabel) {
    if (scanHandled) return;
    scanHandled = true;
    var result = grantScanPoints(localLabel);
    if (!result.ok) {
      showToast(result.message, 'error');
      scanHandled = false;
      return;
    }
    showScanFeedbackOverlay(PONTOS_SCAN, result.pontos);
    showToast('+' + PONTOS_SCAN + ' pontos', 'success');
    setTimeout(function () {
      window.location.href = 'index.html';
    }, 1900);
  }

  function initScanPage() {
    if (!requireAuth()) return;
    refreshStreakAndSave();
    scanHandled = false;

    var manualForm = document.getElementById('scan-manual-form');
    var manualInput = document.getElementById('scan-manual-input');

    if (manualForm && manualInput) {
      manualForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = manualInput.value.trim();
        if (!text) {
          showToast('Informe um código ou identificador.', 'error');
          return;
        }
        manualInput.value = '';
        finishScanFlow(text);
      });
    }

    var readerId = 'qr-reader';
    var el = document.getElementById(readerId);
    if (!el || typeof Html5Qrcode === 'undefined') {
      if (el && typeof Html5Qrcode === 'undefined') {
        showToast('Carregando leitor… use o campo manual se precisar.', 'info');
      }
      return;
    }

    var html5QrCode = new Html5Qrcode(readerId);
    var config = { fps: 10, qrbox: { width: 240, height: 240 } };

    html5QrCode
      .start(
        { facingMode: 'environment' },
        config,
        function (decodedText) {
          if (scanHandled) return;
          html5QrCode.stop().catch(function () {});
          finishScanFlow(decodedText || 'QR lido');
        },
        function () {}
      )
      .catch(function () {
        showToast('Câmera indisponível. Use o código manual.', 'error');
      });
  }

  function redeemReward(rewardId) {
    var reward = null;
    for (var c = 0; c < CATALOG.length; c++) {
      if (CATALOG[c].id === rewardId) {
        reward = CATALOG[c];
        break;
      }
    }
    if (!reward) {
      showToast('Recompensa não encontrada.', 'error');
      return false;
    }
    var user = getCurrentUser();
    if (!user) {
      showToast('Faça login novamente.', 'error');
      return false;
    }
    if (user.pontos < reward.custo) {
      showToast('Faltam ' + (reward.custo - user.pontos) + ' pontos para desbloquear.', 'error');
      return false;
    }
    user.pontos -= reward.custo;
    upsertUser(user);
    showToast(reward.nome + ' resgatado (−' + reward.custo + ' pontos)', 'success');
    return true;
  }

  function initRewardsPage() {
    if (!requireAuth()) return;
    refreshStreakAndSave();

    var root = document.getElementById('rewards-list');
    if (!root) return;

    function render() {
      var user = getCurrentUser();
      var pts = user ? user.pontos || 0 : 0;
      var saldoEl = document.getElementById('rewards-saldo');
      if (saldoEl) saldoEl.textContent = String(pts);

      root.innerHTML = CATALOG.map(function (r) {
        var can = pts >= r.custo;
        var cardCls = can
          ? 'border-neutral-800 bg-neutral-900 shadow-lg shadow-[#FACC15]/5'
          : 'border-neutral-800/80 bg-neutral-900/60 opacity-75';
        var btnCls = can
          ? 'bg-[#FACC15] hover:bg-yellow-300 text-black font-semibold'
          : 'cursor-not-allowed bg-neutral-800 text-neutral-500';
        return (
          '<article class="rounded-2xl border p-5 transition-all duration-200 ' +
          cardCls +
          '">' +
          '<div class="flex items-start justify-between gap-3">' +
          '<div>' +
          '<h3 class="text-base font-semibold text-neutral-100">' +
          escapeHtml(r.nome) +
          '</h3>' +
          '<p class="mt-1 text-sm text-neutral-400">' +
          r.custo +
          ' pontos</p></div>' +
          '<span class="shrink-0 rounded-full border border-neutral-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ' +
          (can ? 'border-[#FACC15]/40 text-[#FACC15]' : 'text-neutral-500') +
          '">' +
          (can ? 'Disponível' : 'Bloqueado') +
          '</span></div>' +
          '<button type="button" data-reward="' +
          r.id +
          '" ' +
          (can ? '' : 'disabled') +
          ' class="mt-5 w-full rounded-2xl py-3 text-sm transition-all duration-200 ' +
          (can ? btnCls + ' hover:scale-105 active:scale-100' : btnCls) +
          '">' +
          (can ? 'Resgatar' : 'Pontos insuficientes') +
          '</button></article>'
        );
      }).join('');

      root.querySelectorAll('[data-reward]:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-reward');
          if (redeemReward(id)) render();
        });
      });
    }

    render();
  }

  function initLoginForm() {
    clearInvalidSession();
    var email = getSessionEmail();
    if (email && getUserByEmail(email)) {
      window.location.href = 'index.html';
      return;
    }
    if (email) setSessionEmail(null);

    var form = document.getElementById('form-login');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = document.getElementById('email').value;
      var pw = document.getElementById('password').value;
      var r = login(em, pw);
      if (r.ok) window.location.href = 'index.html';
      else alert(r.message);
    });
  }

  function initRegisterForm() {
    clearInvalidSession();
    var email = getSessionEmail();
    if (email && getUserByEmail(email)) {
      window.location.href = 'index.html';
      return;
    }
    if (email) setSessionEmail(null);

    var form = document.getElementById('form-register');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = document.getElementById('email').value;
      var pw = document.getElementById('password').value;
      var r = register(em, pw);
      if (r.ok) window.location.href = 'index.html';
      else alert(r.message);
    });
  }

  function boot() {
    if (document.getElementById('form-login')) {
      initLoginForm();
      return;
    }
    if (document.getElementById('form-register')) {
      initRegisterForm();
      return;
    }

    var page = document.body && document.body.getAttribute('data-page');
    if (page === 'dashboard') initDashboard();
    else if (page === 'profile') initProfilePage();
    else if (page === 'history') initHistoryPage();
    else if (page === 'scan') initScanPage();
    else if (page === 'rewards') initRewardsPage();
    else if (page === 'map') {
      if (requireAuth()) refreshStreakAndSave();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
