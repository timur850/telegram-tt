import { memo } from '../../../lib/teact/teact';

import { setCheckGramPanelOpen } from '../../../util/timurgram';

import useLastCallback from '../../../hooks/useLastCallback';

import MenuItem from '../../ui/MenuItem';

const TimurGramMenuItem = () => {
  const handleClick = useLastCallback(() => {
    setCheckGramPanelOpen(true);
  });

  return (
    <MenuItem icon="eye-crossed" onClick={handleClick}>
      CheckGram
    </MenuItem>
  );
};

export default memo(TimurGramMenuItem);
