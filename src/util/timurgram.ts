import type { ApiFormattedText, ApiMessage } from '../api/types';

export type TimurGramSettingKey =
  'hideOnline' | 'hideTyping' | 'hideRead' | 'hideStoryViews' | 'hideListened'
  | 'keepDeleted' | 'keepEdits'
  | 'hideStories' | 'hideSponsored'
  | 'showIds';

export type TimurGramSettings = Partial<Record<TimurGramSettingKey, boolean>> & {
  accentColor?: string;
};

const STORAGE_KEY = 'tt-timurgram-settings';
const EDITS_STORAGE_KEY = 'tt-timurgram-edits';
const NOTE_SEPARATOR = '\n\n';
const MAX_STORED_EDITS = 2000;
const ACCENT_STYLE_ID = 'timurgram-accent';
const ACCENT_VARIABLES = [
  '--color-primary', '--color-primary-shade', '--color-primary-shade-darker', '--color-links',
  '--color-chat-active', '--color-active', '--color-active-darker', '--color-interactive-active',
];

export const TIMURGRAM_DELETED_NOTE = '🗑 Удалено';
export const TIMURGRAM_EDITED_PREFIX = '✏️ Было: ';
export const TIMURGRAM_ACCENT_COLORS = [
  undefined, '#e53935', '#fb8c00', '#fdd835', '#43a047', '#00acc1', '#8e24aa', '#d81b60',
] as const;

let settings: TimurGramSettings = readJson(STORAGE_KEY) || {};
// Previous message texts by `chatId_messageId`, kept across reloads
let editedNotes: Record<string, string> = readJson(EDITS_STORAGE_KEY) || {};
const listeners = new Set<NoneToVoidFunction>();

// Message ids the user deletes from this client, so their own deletions are not kept
const ownDeletedIds = new Set<number>();

applyAccentColor();

export function getTimurGramSettings() {
  return settings;
}

export function getTimurGramSetting(key: TimurGramSettingKey) {
  return Boolean(settings[key]);
}

export function setTimurGramSetting(key: TimurGramSettingKey, isEnabled: boolean) {
  updateSettings({ [key]: isEnabled });
}

export const TIMURGRAM_GHOST_KEYS: TimurGramSettingKey[] = [
  'hideOnline', 'hideTyping', 'hideRead', 'hideStoryViews', 'hideListened',
];

export function getIsTimurGramGhostMode() {
  return TIMURGRAM_GHOST_KEYS.every((key) => settings[key]);
}

export function setTimurGramGhostMode(isEnabled: boolean) {
  updateSettings(Object.fromEntries(TIMURGRAM_GHOST_KEYS.map((key) => [key, isEnabled])));
}

export function cycleTimurGramAccentColor() {
  const index = TIMURGRAM_ACCENT_COLORS.indexOf(settings.accentColor as typeof TIMURGRAM_ACCENT_COLORS[number]);
  const nextColor = TIMURGRAM_ACCENT_COLORS[(index + 1) % TIMURGRAM_ACCENT_COLORS.length];
  updateSettings({ accentColor: nextColor });
  applyAccentColor();
}

export function subscribeToTimurGram(cb: NoneToVoidFunction) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function markOwnDeletedIds(ids: number[]) {
  ids.forEach((id) => ownDeletedIds.add(id));
}

export function consumeOwnDeletedId(id: number) {
  return ownDeletedIds.delete(id);
}

export function appendTimurGramNote(text: ApiFormattedText | undefined, note: string): ApiFormattedText {
  if (!text?.text) return { text: note };

  return { text: `${text.text}${NOTE_SEPARATOR}${note}`, entities: text.entities };
}

export function hasTimurGramDeletedNote(text: ApiFormattedText | undefined) {
  return Boolean(text?.text.endsWith(TIMURGRAM_DELETED_NOTE));
}

export function saveEditedNote(chatId: string, messageId: number, note: string) {
  editedNotes[buildNoteKey(chatId, messageId)] = note;

  const keys = Object.keys(editedNotes);
  if (keys.length > MAX_STORED_EDITS) {
    keys.slice(0, keys.length - MAX_STORED_EDITS).forEach((key) => {
      delete editedNotes[key];
    });
  }

  writeJson(EDITS_STORAGE_KEY, editedNotes);
}

export function getEditedNote(chatId: string, messageId: number) {
  return editedNotes[buildNoteKey(chatId, messageId)];
}

export function applyStoredEditNote(message: ApiMessage): ApiMessage {
  const note = editedNotes[buildNoteKey(message.chatId, message.id)];
  const text = message.content.text;
  if (!note || !text || text.text.endsWith(note)) return message;

  return { ...message, content: { ...message.content, text: appendTimurGramNote(text, note) } };
}

export function applyStoredEditNotes(byId: Record<number, ApiMessage>) {
  if (!Object.keys(editedNotes).length) return byId;

  let result = byId;
  Object.values(byId).forEach((message) => {
    const updated = applyStoredEditNote(message);
    if (updated === message) return;

    if (result === byId) result = { ...byId };
    result[message.id] = updated;
  });

  return result;
}

export function clearEditedNotes() {
  editedNotes = {};
  writeJson(EDITS_STORAGE_KEY, editedNotes);
}

function updateSettings(update: TimurGramSettings) {
  settings = { ...settings, ...update };
  writeJson(STORAGE_KEY, settings);
  listeners.forEach((cb) => cb());
}

function applyAccentColor() {
  if (typeof document === 'undefined') return;

  let styleElement = document.getElementById(ACCENT_STYLE_ID);
  if (!settings.accentColor) {
    styleElement?.remove();
    return;
  }

  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.id = ACCENT_STYLE_ID;
    document.head.appendChild(styleElement);
  }

  // Theme palettes are applied inline, so the override needs `!important` on every element
  const color = settings.accentColor;
  const variables = ACCENT_VARIABLES.map((name) => `${name}: ${color} !important;`).join(' ');
  styleElement.textContent = `html, body, body * { ${variables} }`;
}

function buildNoteKey(chatId: string, messageId: number) {
  return `${chatId}_${messageId}`;
}

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : undefined;
  } catch (err) {
    return undefined;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Storage can be unavailable in private mode
  }
}

// Known user ids with their approximate registration month, used for interpolation
const REGISTRATION_POINTS: [number, number, number][] = [
  [2768409, 2013, 11], [11538514, 2014, 4], [44634663, 2014, 11], [63263518, 2015, 3],
  [101260938, 2015, 7], [122600695, 2016, 1], [152079341, 2016, 8], [181783990, 2016, 12],
  [222021233, 2017, 3], [294851037, 2017, 8], [352940995, 2018, 1], [400169472, 2018, 4],
  [681896077, 2018, 11], [796147074, 2019, 3], [925078064, 2019, 7], [1029255437, 2020, 1],
  [1218917542, 2020, 7], [1543355823, 2021, 1], [1974255900, 2021, 7], [5000000000, 2021, 10],
  [5400000000, 2022, 6], [5800000000, 2022, 11], [6000000000, 2023, 2], [6500000000, 2023, 8],
  [7000000000, 2024, 3], [7500000000, 2024, 9], [8000000000, 2025, 2], [8500000000, 2025, 9],
];
const MONTHS_IN_YEAR = 12;
const MONTH_NAMES = [
  'янв.', 'февр.', 'март', 'апр.', 'май', 'июнь', 'июль', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.',
];

export function estimateRegistrationDate(userId: string) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) return undefined;

  const toMonths = ([, year, month]: [number, number, number]) => year * MONTHS_IN_YEAR + month - 1;
  const points = REGISTRATION_POINTS;
  let months: number;

  if (id <= points[0][0]) {
    months = toMonths(points[0]);
  } else if (id >= points[points.length - 1][0]) {
    months = toMonths(points[points.length - 1]);
  } else {
    const nextIndex = points.findIndex(([pointId]) => pointId >= id);
    const prev = points[nextIndex - 1];
    const next = points[nextIndex];
    const ratio = (id - prev[0]) / (next[0] - prev[0]);
    months = Math.round(toMonths(prev) + ratio * (toMonths(next) - toMonths(prev)));
  }

  const isLatest = id >= points[points.length - 1][0];
  const label = `${MONTH_NAMES[months % MONTHS_IN_YEAR]} ${Math.floor(months / MONTHS_IN_YEAR)}`;

  return isLatest ? `после ${label}` : `≈ ${label}`;
}

const PANIC_OVERLAY_ID = 'timurgram-panic';

export function showPanicOverlay() {
  if (document.getElementById(PANIC_OVERLAY_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = PANIC_OVERLAY_ID;
  overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:var(--color-background, #fff);'
    + 'display:flex;align-items:center;justify-content:center;color:var(--color-text-secondary, #888);'
    + 'font-size:0.875rem;user-select:none;';
  overlay.textContent = 'Дважды нажми, чтобы открыть';
  overlay.addEventListener('dblclick', () => overlay.remove());
  document.body.appendChild(overlay);
}

export type MutedPeerMode = 'all' | 'me';

const MUTED_STORAGE_KEY = 'tt-timurgram-muted';
let mutedPeers: Record<string, MutedPeerMode> = readJson(MUTED_STORAGE_KEY) || {};

export function getMutedPeerMode(peerId: string): MutedPeerMode | undefined {
  return mutedPeers[peerId];
}

export function setMutedPeerMode(peerId: string, mode: MutedPeerMode | undefined) {
  mutedPeers = { ...mutedPeers };
  if (mode) {
    mutedPeers[peerId] = mode;
  } else {
    delete mutedPeers[peerId];
  }
  writeJson(MUTED_STORAGE_KEY, mutedPeers);
}
