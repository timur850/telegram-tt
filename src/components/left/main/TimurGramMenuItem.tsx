import { memo } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { IconName } from '../../../types/icons';
import type { TimurGramSettingKey } from '../../../util/timurgram';
import { MAIN_THREAD_ID } from '../../../api/types';

import { selectThreadReadState } from '../../../global/selectors/threads';
import {
  clearEditedNotes,
  cycleTimurGramAccentColor,
  setTimurGramSetting,
} from '../../../util/timurgram';

import useLastCallback from '../../../hooks/useLastCallback';
import useTimurGramSettings from '../../../hooks/useTimurGramSettings';

import MenuItem from '../../ui/MenuItem';
import MenuSeparator from '../../ui/MenuSeparator';
import NestedMenuItem from '../../ui/NestedMenuItem';
import Switcher from '../../ui/Switcher';

type ToggleItem = { key: TimurGramSettingKey; icon: IconName; title: string };
type Section = { title: string; items: ToggleItem[] };

const SECTIONS: Section[] = [
  {
    title: '👻 Призрак',
    items: [
      { key: 'hideOnline', icon: 'eye-crossed', title: 'Скрывать «онлайн»' },
      { key: 'hideTyping', icon: 'keyboard', title: 'Скрывать «печатает…»' },
      { key: 'hideRead', icon: 'message-read', title: 'Читать без галочек' },
    ],
  },
  {
    title: '💬 Сообщения',
    items: [
      { key: 'keepDeleted', icon: 'delete', title: 'Сохранять удалённые' },
      { key: 'keepEdits', icon: 'edit', title: 'Показывать правки' },
    ],
  },
  {
    title: '🎨 Интерфейс',
    items: [
      { key: 'hideStories', icon: 'eye-crossed-outline', title: 'Скрыть истории' },
      { key: 'hideSponsored', icon: 'eye-crossed-outline', title: 'Скрыть рекламу в каналах' },
    ],
  },
  {
    title: '🛠 Инструменты',
    items: [
      { key: 'showIds', icon: 'info', title: 'Показывать ID в профиле' },
    ],
  },
];

const TimurGramMenuItem = () => {
  const { markChatMessagesRead, showNotification } = getActions();
  const settings = useTimurGramSettings();

  const handleToggle = useLastCallback((e: React.SyntheticEvent<HTMLElement>, key: TimurGramSettingKey) => {
    e.stopPropagation();
    setTimurGramSetting(key, !settings[key]);
  });

  const handleAccentClick = useLastCallback((e: React.SyntheticEvent<HTMLElement>) => {
    e.stopPropagation();
    cycleTimurGramAccentColor();
  });

  const handleReadAll = useLastCallback(() => {
    const global = getGlobal();
    const chatIds = [...(global.chats.listIds.active || []), ...(global.chats.listIds.archived || [])];
    let count = 0;

    chatIds.forEach((id) => {
      const readState = selectThreadReadState(global, id, MAIN_THREAD_ID);
      if (!readState?.unreadCount && !readState?.hasUnreadMark) return;

      markChatMessagesRead({ id });
      count++;
    });

    showNotification({ message: count ? `Прочитано чатов: ${count}` : 'Непрочитанных чатов нет' });
  });

  const handleClearEdits = useLastCallback(() => {
    clearEditedNotes();
    showNotification({ message: 'История правок очищена' });
  });

  return (
    <NestedMenuItem
      icon="eye-crossed"
      submenu={(
        <>
          {SECTIONS.map(({ title, items }, index) => (
            <>
              {index > 0 && <MenuSeparator />}
              <MenuItem disabled>{title}</MenuItem>
              {items.map(({ key, icon, title: itemTitle }) => (
                <MenuItem
                  key={key}
                  icon={icon}
                  onClick={(e) => handleToggle(e, key)}
                >
                  <span className="menu-item-name">{itemTitle}</span>
                  <Switcher
                    id={`timurgram-${key}`}
                    label={itemTitle}
                    checked={Boolean(settings[key])}
                    noAnimation
                  />
                </MenuItem>
              ))}
            </>
          ))}
          <MenuItem icon="readchats" onClick={handleReadAll}>Прочитать все чаты</MenuItem>
          <MenuItem icon="darkmode" onClick={handleAccentClick}>
            <span className="menu-item-name">Цвет оформления</span>
            <span
              className="right-badge"
              style={`background: ${settings.accentColor || 'var(--color-text-secondary)'}; min-width: 1.25rem;`}
            >
              {settings.accentColor ? '' : 'Ст.'}
            </span>
          </MenuItem>
          <MenuItem icon="delete" destructive onClick={handleClearEdits}>Очистить историю правок</MenuItem>
        </>
      )}
    >
      NextGram
    </NestedMenuItem>
  );
};

export default memo(TimurGramMenuItem);
