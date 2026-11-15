// Visual-only profile: phone, username, wallet and gifts shown in this client, never sent to Telegram
export type VisualCurrency = 'stars' | 'ton';

export type VisualGift = {
  title: string;
  price: number;
  currency: VisualCurrency;
};

export type VisualProfile = {
  stars: number;
  ton: number;
  phone?: string;
  username?: string;
  gifts: VisualGift[];
};

const STORAGE_KEY = 'tt-visual-profile';
const MAX_GIFTS = 30;

export const VISUAL_GIFT_CATALOG: VisualGift[] = [
  { title: 'Plush Pepe', price: 3000, currency: 'ton' },
  { title: 'Heart Locket', price: 600, currency: 'ton' },
  { title: "Durov's Cap", price: 400, currency: 'ton' },
  { title: 'Precious Peach', price: 250, currency: 'ton' },
  { title: 'Loot Bag', price: 100, currency: 'ton' },
  { title: 'Delicious Cake', price: 50, currency: 'stars' },
  { title: 'Green Star', price: 50, currency: 'stars' },
  { title: 'Blue Star', price: 50, currency: 'stars' },
  { title: 'Red Star', price: 50, currency: 'stars' },
  { title: 'Bear', price: 15, currency: 'stars' },
  { title: 'Heart', price: 15, currency: 'stars' },
  { title: 'Trophy', price: 100, currency: 'stars' },
  { title: 'Ring', price: 100, currency: 'stars' },
  { title: 'Rocket', price: 50, currency: 'stars' },
];

const EMPTY_PROFILE: VisualProfile = { stars: 0, ton: 0, gifts: [] };

let profile: VisualProfile = { ...EMPTY_PROFILE, ...readStoredProfile() };
const listeners = new Set<NoneToVoidFunction>();

export function getVisualProfile() {
  return profile;
}

export function subscribeToVisualProfile(cb: NoneToVoidFunction) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function setVisualBalance(currency: VisualCurrency, amount: number) {
  if (!Number.isFinite(amount) || amount < 0) return;

  updateProfile(currency === 'stars' ? { stars: amount } : { ton: amount });
}

export function setVisualPhone(phone: string) {
  updateProfile({ phone: phone.trim() || undefined });
}

export function setVisualUsername(username: string) {
  updateProfile({ username: username.trim().replace(/^@/, '') || undefined });
}

// Returns false when the balance is too low or the gift list is full
export function buyVisualGift(gift: VisualGift) {
  if (profile[gift.currency] < gift.price || profile.gifts.length >= MAX_GIFTS) return false;

  const balance = profile[gift.currency] - gift.price;
  const gifts = [...profile.gifts, gift];
  updateProfile(gift.currency === 'stars' ? { stars: balance, gifts } : { ton: balance, gifts });
  return true;
}

export function removeVisualGift(index: number) {
  updateProfile({ gifts: profile.gifts.filter((_, i) => i !== index) });
}

export function resetVisualProfile() {
  profile = EMPTY_PROFILE;
  writeProfile();
  listeners.forEach((cb) => cb());
}

function updateProfile(update: Partial<VisualProfile>) {
  profile = { ...profile, ...update };
  writeProfile();
  listeners.forEach((cb) => cb());
}

function readStoredProfile(): Partial<VisualProfile> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Partial<VisualProfile> : undefined;
  } catch (err) {
    return undefined;
  }
}

function writeProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    // Storage can be unavailable in private mode
  }
}
