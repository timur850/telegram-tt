import { useEffect, useState } from '../lib/teact/teact';

import { getVisualProfile, subscribeToVisualProfile } from '../util/visualProfile';

export default function useVisualProfile() {
  const [visualProfile, setVisualProfile] = useState(getVisualProfile);

  useEffect(() => subscribeToVisualProfile(() => {
    setVisualProfile(getVisualProfile());
  }), []);

  return visualProfile;
}
