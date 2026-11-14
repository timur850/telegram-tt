import type { ApiMessage } from '../../api/types';
import { getGlobal } from '../../global';

import { getUserFullName } from '../../global/helpers';
import { selectChat, selectChatMessages, selectUser } from '../../global/selectors';
import { getTranslationFn } from '../../util/localization';

const TOP_SENDERS_COUNT = 5;
const HOURS_IN_DAY = 24;

export function exportChatToText(chatId: string) {
  const messages = getLoadedMessages(chatId);
  if (!messages.length) {
    window.alert('В чате нет загруженных сообщений. Пролистай историю вверх и попробуй ещё раз.');
    return;
  }

  const title = selectChat(getGlobal(), chatId)?.title || getSenderName(chatId);
  const lines = messages.map((message) => {
    const date = new Date(message.date * 1000).toLocaleString('ru-RU');
    return `[${date}] ${getSenderName(message.senderId || chatId)}: ${getMessageText(message)}`;
  });

  const header = `Экспорт чата «${title}» — ${messages.length} сообщ.\n\n`;
  const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(title)}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function showChatStats(chatId: string) {
  const messages = getLoadedMessages(chatId);
  if (!messages.length) {
    window.alert('В чате нет загруженных сообщений.');
    return;
  }

  const countBySender = new Map<string, number>();
  const countByHour = new Array<number>(HOURS_IN_DAY).fill(0);
  let voiceCount = 0;
  let mediaCount = 0;

  messages.forEach((message) => {
    const senderId = message.senderId || chatId;
    countBySender.set(senderId, (countBySender.get(senderId) || 0) + 1);
    countByHour[new Date(message.date * 1000).getHours()]++;

    const { content } = message;
    if (content.voice || content.video?.isRound) voiceCount++;
    else if (content.photo || content.video || content.document || content.sticker) mediaCount++;
  });

  const topSenders = [...countBySender.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_SENDERS_COUNT)
    .map(([senderId, count], index) => `${index + 1}. ${getSenderName(senderId)} — ${count}`);
  const busiestHour = countByHour.indexOf(Math.max(...countByHour));
  const firstDate = new Date(messages[0].date * 1000).toLocaleDateString('ru-RU');
  const lastDate = new Date(messages[messages.length - 1].date * 1000).toLocaleDateString('ru-RU');

  window.alert([
    `📊 Статистика (загружено ${messages.length} сообщ.)`,
    `Период: ${firstDate} — ${lastDate}`,
    `Голосовые и кружки: ${voiceCount}`,
    `Фото, видео, файлы, стикеры: ${mediaCount}`,
    `Самый активный час: ${busiestHour}:00–${busiestHour + 1}:00`,
    '',
    'Кто больше пишет:',
    ...topSenders,
  ].join('\n'));
}

function getLoadedMessages(chatId: string) {
  const byId = selectChatMessages(getGlobal(), chatId) || {};

  return Object.values(byId)
    .filter((message) => !message.content.action)
    .sort((a, b) => a.date - b.date || a.id - b.id);
}

function getSenderName(peerId: string) {
  const global = getGlobal();
  const user = selectUser(global, peerId);
  if (user) return getUserFullName(getTranslationFn(), user) || 'Без имени';

  return selectChat(global, peerId)?.title || peerId;
}

function getMessageText(message: ApiMessage) {
  const { content } = message;
  const text = content.text?.text;
  const label = content.voice ? '[Голосовое]'
    : content.video?.isRound ? '[Кружок]'
      : content.photo ? '[Фото]'
        : content.video ? '[Видео]'
          : content.sticker ? '[Стикер]'
            : content.document ? `[Файл: ${content.document.fileName}]`
              : undefined;

  return [label, text].filter(Boolean).join(' ') || '[Сообщение]';
}

function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80) || 'chat';
}
