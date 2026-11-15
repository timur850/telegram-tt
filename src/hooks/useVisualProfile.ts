import { useEffect, useState } from '../lib/teact/teact';

import { getVisualProfile, getVisualSendTarget, subscribeToVisualProfile } from '../util/visualProfile';

export default function useVisualProfile() {
  const [visualProfile, setVisualProfile] = useState(getVisualProfile);

  useEffect(() => subscribeToVisualProfile(() => {
    setVisualProfile(getVisualProfile());
  }), []);

  return visualProfile;
}

export function useVisualSendTarget() {
  const [target, setTarget] = useState(getVisualSendTarget);

  useEffect(() => subscribeToVisualProfile(() => {
    setTarget(getVisualSendTarget());
  }), []);

  return target;
}
