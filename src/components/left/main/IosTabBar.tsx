import { memo } from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import type { IconName } from '../../../types/icons';
import { LeftColumnContent } from '../../../types';

import buildClassName from '../../../util/buildClassName';
import { triggerNativeHaptic } from '../../../util/timurgram';

import useLastCallback from '../../../hooks/useLastCallback';

import Icon from '../../common/icons/Icon';

import styles from './IosTabBar.module.scss';

type OwnProps = {
  content: LeftColumnContent;
  onReset: NoneToVoidFunction;
};

type Tab = { key: LeftColumnContent; icon: IconName; activeIcon: IconName; title: string };

const TABS: Tab[] = [
  { key: LeftColumnContent.Contacts, icon: 'user', activeIcon: 'user-filled', title: 'Контакты' },
  { key: LeftColumnContent.ChatList, icon: 'comments', activeIcon: 'comments', title: 'Чаты' },
  { key: LeftColumnContent.Settings, icon: 'settings', activeIcon: 'settings-filled', title: 'Настройки' },
];

const IosTabBar = ({ content, onReset }: OwnProps) => {
  const { openLeftColumnContent } = getActions();

  const handleTabClick = useLastCallback((key: LeftColumnContent) => {
    if (key === content) return;

    triggerNativeHaptic('selection');

    if (key === LeftColumnContent.ChatList) {
      onReset();
      return;
    }

    openLeftColumnContent({ contentKey: key });
  });

  return (
    <nav className={styles.root}>
      {TABS.map(({ key, icon, activeIcon, title }) => {
        const isActive = key === content;

        return (
          <button
            key={key}
            type="button"
            className={buildClassName(styles.tab, isActive && styles.active)}
            onClick={() => handleTabClick(key)}
          >
            <Icon name={isActive ? activeIcon : icon} className={styles.icon} />
            <span className={styles.title}>{title}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default memo(IosTabBar);
