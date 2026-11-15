import { memo, useEffect, useState } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { IconName } from '../../../types/icons';
import type { TimurGramSettingKey } from '../../../util/timurgram';
import { MAIN_THREAD_ID } from '../../../api/types';

import { selectChat, selectUser } from '../../../global/selectors';
import { selectThreadReadState } from '../../../global/selectors/threads';
import buildClassName from '../../../util/buildClassName';
import {
  CHECKGRAM_APP_ICONS,
  CHECKGRAM_ICON_EVENT,
  clearEditedNotes,
  cycleTimurGramAccentColor,
  getIsInNativeApp,
  getIsTimurGramGhostMode,
  getNativeAppIcon,
  setCheckGramPanelOpen,
  setNativeAppIcon,
  setTimurGramGhostMode,
  setTimurGramSetting,
  showPanicOverlay,
  triggerNativeHaptic,
} from '../../../util/timurgram';

import useLastCallback from '../../../hooks/useLastCallback';
import useTimurGramSettings, { useIsCheckGramPanelOpen } from '../../../hooks/useTimurGramSettings';

import ListItem from '../../ui/ListItem';
import Modal from '../../ui/Modal';
import Switcher from '../../ui/Switcher';

import './CheckGramPanel.scss';

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

const CheckGramPanel = () => {
  const isOpen = useIsCheckGramPanelOpen();

  const handleClose = useLastCallback(() => {
    setCheckGramPanelOpen(false);
  });

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

  const handleIconSelect = useLastCallback((name: string) => {
    setNativeAppIcon(name);
  });

  const handleToggle = useLastCallback((key: TimurGramSettingKey) => {
    triggerNativeHaptic();
    setTimurGramSetting(key, !settings[key]);
  });

  const handleAccentClick = useLastCallback(() => {
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

  const handleGhostMode = useLastCallback(() => {
    triggerNativeHaptic('medium');
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

    handleClose();
    openChat({ id });
  });

  const handleClearEdits = useLastCallback(() => {
    clearEditedNotes();
    showNotification({ message: 'История правок очищена' });
  });

  function renderToggle(key: TimurGramSettingKey | 'ghost', icon: IconName, title: string, isChecked: boolean) {
    return (
      <ListItem
        key={key}
        icon={icon}
        ripple
        onClick={key === 'ghost' ? handleGhostMode : () => handleToggle(key)}
      >
        <span className="checkgram-item-title">{title}</span>
        <Switcher id={`checkgram-${key}`} label={title} checked={isChecked} inactive />
      </ListItem>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="CheckGram"
      hasCloseButton
      className="CheckGramPanel"
      contentClassName="checkgram-content"
    >
      <div className="checkgram-section">
        {renderToggle('ghost', 'eye-crossed', 'Режим призрака (всё сразу)', getIsTimurGramGhostMode())}
      </div>
      {SECTIONS.map(({ title, items }) => (
        <div key={title} className="checkgram-section">
          <h4 className="checkgram-section-title">{title}</h4>
          {items.map(({ key, icon, title: itemTitle }) => renderToggle(key, icon, itemTitle, Boolean(settings[key])))}
        </div>
      ))}
      <div className="checkgram-section">
        <h4 className="checkgram-section-title">⚡ Действия</h4>
        <ListItem icon="readchats" ripple onClick={handleReadAll}>Прочитать все чаты</ListItem>
        <ListItem icon="search" ripple onClick={handleOpenById}>Открыть по ID</ListItem>
        <ListItem icon="lock" ripple onClick={showPanicOverlay}>Быстрое скрытие экрана</ListItem>
        <ListItem icon="darkmode" ripple onClick={handleAccentClick}>
          <span className="checkgram-item-title">Цвет оформления</span>
          <span
            className="checkgram-color-dot"
            style={`background: ${settings.accentColor || 'transparent'}`}
          >
            {settings.accentColor ? '' : 'Ст.'}
          </span>
        </ListItem>
        <ListItem icon="delete" ripple destructive onClick={handleClearEdits}>Очистить историю правок</ListItem>
      </div>
      {isInNativeApp && (
        <div className="checkgram-section">
          <h4 className="checkgram-section-title">📱 Иконка приложения</h4>
          <div className="checkgram-icon-grid">
            {CHECKGRAM_APP_ICONS.map((name) => (
              <div
                key={name}
                className={buildClassName('checkgram-icon-option', (appIcon || 'Default') === name && 'selected')}
                role="button"
                tabIndex={0}
                onClick={() => handleIconSelect(name)}
              >
                <img src={`./app-icons/${name.toLowerCase()}.png`} alt={name} draggable={false} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default memo(CheckGramPanel);
