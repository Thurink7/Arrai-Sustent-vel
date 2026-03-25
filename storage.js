/**
 * Arraiá Sustentável — persistência (LocalStorage)
 */
const STORAGE_KEYS = {
  USERS: 'arraia_users',
  SESSION: 'arraia_session',
  HISTORY: 'arraia_history',
};

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function getUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  return safeParse(raw, []);
}

export function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

export function getSessionEmail() {
  return localStorage.getItem(STORAGE_KEYS.SESSION);
}

export function setSessionEmail(email) {
  if (email) localStorage.setItem(STORAGE_KEYS.SESSION, email);
  else localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function getUserByEmail(email) {
  return getUsers().find((u) => u.email === email) || null;
}

export function upsertUser(user) {
  const users = getUsers();
  const i = users.findIndex((u) => u.email === user.email);
  if (i >= 0) users[i] = user;
  else users.push(user);
  saveUsers(users);
}

export function getHistoryForEmail(email) {
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
  const all = safeParse(raw, {});
  return Array.isArray(all[email]) ? all[email] : [];
}

export function appendHistoryEntry(email, entry) {
  const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
  const all = safeParse(raw, {});
  if (!Array.isArray(all[email])) all[email] = [];
  all[email].unshift(entry);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(all));
}

/** Meta para barra de progresso / badge (próximo “nível” em pontos) */
export const PONTOS_META = 200;
