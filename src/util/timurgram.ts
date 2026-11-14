import type { ApiFormattedText, ApiMessage } from '../api/types';

export type TimurGramSettingKey =
  'hideOnline' | 'hideTyping' | 'hideRead'
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
