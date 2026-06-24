import { useEffect } from 'react';
import { useHealthStore } from '@/store';
import { onIdleStatusChanged } from '@/services';

export function useIdleDetection() {
  useEffect(() => {
    const unlisten = onIdleStatusChanged(({ is_idle }) => {
      useHealthStore.getState().setIdle(is_idle);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);
}
