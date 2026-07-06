import { getCachedImageUri } from '@/lib/image-cache';
import { useEffect, useState } from 'react';

type Status = 'loading' | 'loaded' | 'error';

export function useCachedImage(remoteUri: string, persistent = false) {
  const [status, setStatus] = useState<Status>('loading');
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setLocalUri(null);

    getCachedImageUri(remoteUri, persistent)
      .then((uri) => {
        if (cancelled) return;
        if (uri) {
          setLocalUri(uri);
          setStatus('loaded');
        } else {
          setStatus('error');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[useCachedImage] failed for', remoteUri, err);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [remoteUri, persistent]);

  return { localUri, status };
}
