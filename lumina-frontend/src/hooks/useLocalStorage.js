import { useState, useCallback } from 'react';
import { getWithExpiry, setWithExpiry } from '../utils/storage';

export default function useLocalStorage(key, initialValue, ttl) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const stored = getWithExpiry(key);
      return stored !== null ? stored : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      setStoredValue((prev) => {
        const nextValue = typeof value === 'function' ? value(prev) : value;
        setWithExpiry(key, nextValue, ttl);
        return nextValue;
      });
    },
    [key, ttl],
  );

  return [storedValue, setValue];
}
