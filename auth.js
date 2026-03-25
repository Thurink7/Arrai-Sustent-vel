/**
 * Arraiá Sustentável — autenticação
 */
import {
  getSessionEmail,
  setSessionEmail,
  getUserByEmail,
  upsertUser,
} from './storage.js';

export function getCurrentUser() {
  const email = getSessionEmail();
  if (!email) return null;
  return getUserByEmail(email);
}

export function register(email, password) {
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, message: 'Preencha e-mail e senha.' };
  }
  if (getUserByEmail(normalized)) {
    return { ok: false, message: 'Este e-mail já está cadastrado.' };
  }
  const user = {
    email: normalized,
    password,
    pontos: 0,
    streak: 0,
    ultimoAcesso: '',
  };
  upsertUser(user);
  setSessionEmail(normalized);
  return { ok: true, user };
}

export function login(email, password) {
  const normalized = String(email).trim().toLowerCase();
  const user = getUserByEmail(normalized);
  if (!user || user.password !== password) {
    return { ok: false, message: 'E-mail ou senha inválidos.' };
  }
  setSessionEmail(normalized);
  return { ok: true, user };
}

export function logout() {
  setSessionEmail(null);
}

export function requireAuth(redirectPath = 'login.html') {
  if (!getSessionEmail()) {
    window.location.href = redirectPath;
    return false;
  }
  return true;
}
