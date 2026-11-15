import { useEffect, useState } from '../lib/teact/teact';

import { getIsCheckGramPanelOpen, getTimurGramSettings, subscribeToTimurGram } from '../util/timurgram';

export default function useTimurGramSettings() {
  const [settings, setSettings] = useState(getTimurGramSettings);

  useEffect(() => subscribeToTimurGram(() => {
    setSettings(getTimurGramSettings());
  }), []);

  return settings;
}

export function useIsCheckGramPanelOpen() {
  const [isOpen, setIsOpen] = useState(getIsCheckGramPanelOpen);

  useEffect(() => subscribeToTimurGram(() => {
    setIsOpen(getIsCheckGramPanelOpen());
  }), []);

  return isOpen;
}
