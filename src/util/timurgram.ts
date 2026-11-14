import type { ApiFormattedText } from '../api/types';

export type TimurGramSettingKey = 'hideOnline' | 'hideTyping' | 'hideRead' | 'keepDeleted' | 'keepEdits';
export type TimurGramSettings = Partial<Record<TimurGramSettingKey, boolean>>;

const STORAGE_KEY = 'tt-timurgram-settings';
const NOTE_SEPARATOR = '\n\n';

export const TIMURGRAM_DELETED_NOTE = '🗑 Удалено';
export const TIMURGRAM_EDITED_PREFIX = '✏️ Было: ';

let settings: TimurGramSettings = readSettings();

// Message ids the user deletes from this client, so their own deletions are not kept
const ownDeletedIds = new Set<number>();

export function getTimurGramSettings() {
  return settings;
}

export function getTimurGramSetting(key: TimurGramSettingKey) {
  return Boolean(settings[key]);
}

export function setTimurGramSetting(key: TimurGramSettingKey, isEnabled: boolean) {
  settings = { ...settings, [key]: isEnabled };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    // Storage can be unavailable in private mode
  }
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

function readSettings(): TimurGramSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as TimurGramSettings : {};
  } catch (err) {
    return {};
  }
}
