/**
 * Arraiá Sustentável — escaneamento QR (+ input manual)
 */
import { requireAuth, getCurrentUser } from './auth.js';
import { appendHistoryEntry, upsertUser } from './storage.js';
import {
  showToast,
  refreshStreakAndSave,
  showScanFeedbackOverlay,
} from './ui.js';

export const PONTOS_SCAN = 10;

export function grantScanPoints(localLabel) {
  const user = getCurrentUser();
  if (!user) return { ok: false, message: 'Sessão inválida.' };

  user.pontos = (user.pontos || 0) + PONTOS_SCAN;
  upsertUser(user);

  const entry = {
    data: new Date().toISOString(),
    local: localLabel || 'QR / manual',
    pontos: PONTOS_SCAN,
  };
  appendHistoryEntry(user.email, entry);

  return { ok: true, pontos: user.pontos, entry };
}

let scanHandled = false;

function finishScanFlow(localLabel) {
  if (scanHandled) return;
  scanHandled = true;
  const result = grantScanPoints(localLabel);
  if (!result.ok) {
    showToast(result.message, 'error');
    scanHandled = false;
    return;
  }
  showScanFeedbackOverlay(PONTOS_SCAN, result.pontos);
  showToast(`+${PONTOS_SCAN} pontos`, 'success');
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1900);
}

export function initScanPage() {
  if (!requireAuth()) return;
  refreshStreakAndSave();

  const manualForm = document.getElementById('scan-manual-form');
  const manualInput = document.getElementById('scan-manual-input');

  if (manualForm && manualInput) {
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = manualInput.value.trim();
      if (!text) {
        showToast('Informe um código ou identificador.', 'error');
        return;
      }
      manualInput.value = '';
      finishScanFlow(text);
    });
  }

  const readerId = 'qr-reader';
  const el = document.getElementById(readerId);
  if (!el || typeof Html5Qrcode === 'undefined') {
    if (el && typeof Html5Qrcode === 'undefined') {
      showToast('Carregando leitor… use o campo manual se precisar.', 'info');
    }
    return;
  }

  const html5QrCode = new Html5Qrcode(readerId);
  const config = { fps: 10, qrbox: { width: 240, height: 240 } };

  html5QrCode
    .start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (scanHandled) return;
        html5QrCode.stop().catch(() => {});
        finishScanFlow(decodedText || 'QR lido');
      },
      () => {}
    )
    .catch(() => {
      showToast('Câmera indisponível. Use o código manual.', 'error');
    });
}
