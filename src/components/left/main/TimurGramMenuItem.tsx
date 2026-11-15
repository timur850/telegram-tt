import { memo, useEffect, useState } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { IconName } from '../../../types/icons';
import type { TimurGramSettingKey } from '../../../util/timurgram';
import { MAIN_THREAD_ID } from '../../../api/types';

import { selectChat, selectUser } from '../../../global/selectors';
import { selectThreadReadState } from '../../../global/selectors/threads';
import {
  CHECKGRAM_APP_ICONS,
  CHECKGRAM_ICON_EVENT,
  clearEditedNotes,
  cycleTimurGramAccentColor,
  getIsInNativeApp,
  getIsTimurGramGhostMode,
  getNativeAppIcon,
  setTimurGramGhostMode,
  setNativeAppIcon,
  setTimurGramSetting,
  showPanicOverlay,
} from '../../../util/timurgram';

import useLastCallback from '../../../hooks/useLastCallback';
import useTimurGramSettings from '../../../hooks/useTimurGramSettings';

import MenuItem from '../../ui/MenuItem';
import MenuSeparator from '../../ui/MenuSeparator';
import NestedMenuItem from '../../ui/NestedMenuItem';
import Switcher from '../../ui/Switcher';

import './TimurGramMenuItem.scss';

type ToggleItem = { key: TimurGramSettingKey; icon: IconName; title: string };
type Section = { title: string; items: ToggleItem[] };

const SECTIONS: Section[] = [
  {
    title: '👻 Призрак',
    items: [
      { key: 'hideOnline', icon: 'eye-crossed', title: 'Скрывать «онлайн»' },
      { key: 'hideTyping', icon: 'keyboard', title: 'Скрывать «печатает…»' },
      { key: 'hideRead', icon: 'message-read', title: 'Читать без галочек' },
      { key: 'hideStoryViews', icon: 'eye-crossed-outline', title: 'Смотреть истории тайно' },
      { key: 'hideListened', icon: 'eye-crossed-outline', title: 'Не отмечать «прослушано»' },
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
  const { markChatMessagesRead, showNotification, openChat } = getActions();
  const settings = useTimurGramSettings();
  const isInNativeApp = getIsInNativeApp();
  const [appIcon, setAppIcon] = useState(getNativeAppIcon);

  useEffect(() => {
    if (!isInNativeApp) return undefined;

    const handleIconChange = () => setAppIcon(getNativeAppIcon());
    window.addEventListener(CHECKGRAM_ICON_EVENT, handleIconChange);
    return () => window.removeEventListener(CHECKGRAM_ICON_EVENT, handleIconChange);
  }, [isInNativeApp]);

  const handleIconSelect = useLastCallback((e: React.SyntheticEvent<HTMLElement>, name: string) => {
    e.stopPropagation();
    setNativeAppIcon(name);
  });

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

  const handleGhostMode = useLastCallback((e: React.SyntheticEvent<HTMLElement>) => {
    e.stopPropagation();
    setTimurGramGhostMode(!getIsTimurGramGhostMode());
  });

  const handleOpenById = useLastCallback(() => {
    const id = window.prompt('ID пользователя, группы или канала')?.trim();
    if (!id) return;

    const global = getGlobal();
    if (!selectUser(global, id) && !selectChat(global, id)) {
      showNotification({ message: 'Не найдено. Открыть можно только тех, кого клиент уже видел.' });
      return;
    }

    openChat({ id });
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
          <MenuItem icon="eye-crossed" onClick={handleGhostMode}>
            <span className="menu-item-name">Режим призрака (всё сразу)</span>
            <Switcher
              id="timurgram-ghost"
              label="Режим призрака"
              checked={getIsTimurGramGhostMode()}
              noAnimation
            />
          </MenuItem>
          <MenuSeparator />
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
          {isInNativeApp && (
            <>
              <MenuSeparator />
              <MenuItem disabled>📱 Иконка приложения</MenuItem>
              <div className="checkgram-icon-grid">
                {CHECKGRAM_APP_ICONS.map((name) => (
                  <div
                    key={name}
                    className={`checkgram-icon-option${(appIcon || 'Default') === name ? ' selected' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => handleIconSelect(e, name)}
                  >
                    <img src={`./app-icons/${name.toLowerCase()}.png`} alt={name} draggable={false} />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
              <MenuSeparator />
            </>
          )}
          <MenuItem icon="readchats" onClick={handleReadAll}>Прочитать все чаты</MenuItem>
          <MenuItem icon="search" onClick={handleOpenById}>Открыть по ID</MenuItem>
          <MenuItem icon="lock" onClick={showPanicOverlay}>Быстрое скрытие экрана</MenuItem>
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
      CheckGram
    </NestedMenuItem>
  );
};

export default memo(TimurGramMenuItem);
