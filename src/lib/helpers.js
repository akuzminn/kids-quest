export const AVATARS = ['🤖', '🐱', '🦊', '🐼', '🐵', '🦁', '🐸', '🐧', '🦄', '🚀', '🧑‍🚀', '🕵️'];

export const DEFAULT_TEAMS = [
  { name: 'Сині інженери', emoji: '🔵' },
  { name: 'Зелені хакери', emoji: '🟢' },
  { name: 'Жовті дослідники', emoji: '🟡' },
  { name: 'Червоні творці', emoji: '🔴' },
];

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || min)));
}

export function normalizeRoomCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function makeRoomCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums = '23456789';
  let code = '';
  for (let i = 0; i < 4; i += 1) code += letters[Math.floor(Math.random() * letters.length)];
  code += '-';
  for (let i = 0; i < 3; i += 1) code += nums[Math.floor(Math.random() * nums.length)];
  return code;
}

export function getErrorMessage(err) {
  if (!err) return 'Невідома помилка.';
  return err.message || String(err);
}

export function formatTimeLeft(iso) {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return '00:00';
  const seconds = Math.floor(diff / 1000);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
