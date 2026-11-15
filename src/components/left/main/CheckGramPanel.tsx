import { memo, useEffect, useState } from '../../../lib/teact/teact';
import { getActions, getGlobal } from '../../../global';

import type { IconName } from '../../../types/icons';
import type { TimurGramSettingKey } from '../../../util/timurgram';
import type { VisualCurrency, VisualGift } from '../../../util/visualProfile';
import {
  buyVisualGift,
  removeVisualGift,
  resetVisualProfile,
  setVisualBalance,
  setVisualPhone,
  setVisualUsername,
  VISUAL_GIFT_CATALOG,
} from '../../../util/visualProfile';
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
import useVisualProfile from '../../../hooks/useVisualProfile';

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
  const visualProfile = useVisualProfile();
  const [isGiftShopOpen, setIsGiftShopOpen] = useState(false);

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

  const handleSetBalance = useLastCallback((currency: VisualCurrency) => {
    const name = currency === 'stars' ? 'звёзд' : 'TON';
    const value = window.prompt(`Сколько ${name} показывать на балансе?`, String(visualProfile[currency]));
    if (value === null) return;

    const amount = Number(value.replace(',', '.'));
    if (!Number.isFinite(amount) || amount < 0) {
      showNotification({ message: 'Нужно число, например 10000' });
      return;
    }
    setVisualBalance(currency, amount);
  });

  const handleSetPhone = useLastCallback(() => {
    const value = window.prompt('Номер для профиля (например +888 0123 4567). Пусто — убрать.', visualProfile.phone || '');
    if (value !== null) setVisualPhone(value);
  });

  const handleSetUsername = useLastCallback(() => {
    const value = window.prompt('Юзернейм для профиля. Пусто — убрать.', visualProfile.username || '');
    if (value !== null) setVisualUsername(value);
  });

  const handleOpenGiftShop = useLastCallback(() => {
    setIsGiftShopOpen(true);
  });

  const handleCloseGiftShop = useLastCallback(() => {
    setIsGiftShopOpen(false);
  });

  const handleBuyGift = useLastCallback((gift: VisualGift) => {
    if (buyVisualGift(gift)) {
      showNotification({ message: `Куплено: ${gift.title}` });
    } else {
      showNotification({ message: 'Не хватает визуального баланса' });
    }
  });

  const handleRemoveGift = useLastCallback((index: number) => {
    removeVisualGift(index);
  });

  const handleResetVisualProfile = useLastCallback(() => {
    if (!window.confirm('Сбросить визуальный профиль, баланс и подарки?')) return;

    resetVisualProfile();
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
    <>
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
      <div className="checkgram-section">
        <h4 className="checkgram-section-title">💎 Визуальный профиль (виден только в CheckGram)</h4>
        <ListItem icon="star" ripple onClick={() => handleSetBalance('stars')}>
          <span className="checkgram-item-title">Баланс звёзд</span>
          <span className="checkgram-value">{visualProfile.stars}</span>
        </ListItem>
        <ListItem icon="diamond" ripple onClick={() => handleSetBalance('ton')}>
          <span className="checkgram-item-title">Баланс TON</span>
          <span className="checkgram-value">{visualProfile.ton}</span>
        </ListItem>
        <ListItem icon="phone-filled" ripple onClick={handleSetPhone}>
          <span className="checkgram-item-title">Номер в профиле</span>
          <span className="checkgram-value">{visualProfile.phone || '—'}</span>
        </ListItem>
        <ListItem icon="mention-filled" ripple onClick={handleSetUsername}>
          <span className="checkgram-item-title">Юзернейм в профиле</span>
          <span className="checkgram-value">{visualProfile.username ? `@${visualProfile.username}` : '—'}</span>
        </ListItem>
        <ListItem icon="gift" ripple onClick={handleOpenGiftShop}>
          <span className="checkgram-item-title">Купить подарок</span>
          <span className="checkgram-value">{visualProfile.gifts.length}</span>
        </ListItem>
        <ListItem icon="delete" ripple destructive onClick={handleResetVisualProfile}>
          Сбросить визуальный профиль
        </ListItem>
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
    <Modal
      isOpen={isGiftShopOpen}
      onClose={handleCloseGiftShop}
      title="Визуальные подарки"
      hasCloseButton
      className="CheckGramPanel"
      contentClassName="checkgram-content"
    >
      <div className="checkgram-section">
        <h4 className="checkgram-section-title">
          {`⭐ ${visualProfile.stars}  ·  TON ${visualProfile.ton}`}
        </h4>
        {VISUAL_GIFT_CATALOG.map((gift) => (
          <ListItem key={gift.title} icon="gift" ripple onClick={() => handleBuyGift(gift)}>
            <span className="checkgram-item-title">{gift.title}</span>
            <span className="checkgram-value">
              {gift.currency === 'ton' ? `${gift.price} TON` : `${gift.price} ⭐`}
            </span>
          </ListItem>
        ))}
      </div>
      {Boolean(visualProfile.gifts.length) && (
        <div className="checkgram-section">
          <h4 className="checkgram-section-title">Мои визуальные подарки (нажми, чтобы убрать)</h4>
          {visualProfile.gifts.map((gift, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <ListItem key={`${gift.title}-${index}`} icon="gift-filled" ripple onClick={() => handleRemoveGift(index)}>
              <span className="checkgram-item-title">{gift.title}</span>
            </ListItem>
          ))}
        </div>
      )}
    </Modal>
    </>
  );
};

export default memo(CheckGramPanel);
