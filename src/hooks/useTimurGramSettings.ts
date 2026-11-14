import { useEffect, useState } from '../lib/teact/teact';

import { getTimurGramSettings, subscribeToTimurGram } from '../util/timurgram';

export default function useTimurGramSettings() {
  const [settings, setSettings] = useState(getTimurGramSettings);

  useEffect(() => subscribeToTimurGram(() => {
    setSettings(getTimurGramSettings());
  }), []);

  return settings;
}
