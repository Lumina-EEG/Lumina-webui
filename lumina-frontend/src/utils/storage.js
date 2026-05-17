const PREFIX = 'lumina_';
const ONE_HOUR = 60 * 60 * 1000;

export function setWithExpiry(key, value, ttl = ONE_HOUR) {
  try {
    const item = { value, expiry: Date.now() + ttl };
    localStorage.setItem(PREFIX + key, JSON.stringify(item));
    return true;
  } catch (e) {
    console.warn('Storage write failed:', e.message);
    return false;
  }
}

export function getWithExpiry(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (Date.now() > item.expiry) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return item.value;
  } catch {
    removeItem(key);
    return null;
  }
}

export function removeItem(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* localStorage unavailable */
  }
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* localStorage unavailable */
  }
}

export function clearExpired() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const item = JSON.parse(raw);
            if (Date.now() > item.expiry) {
              localStorage.removeItem(k);
            }
          }
        } catch {
          localStorage.removeItem(k);
        }
      });
  } catch {
    /* localStorage unavailable */
  }
}
