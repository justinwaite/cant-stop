import { useCallback, useState } from 'react';

// UI helpers
export function useHandleCopy() {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback((value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  return { copied, handleCopy };
}
