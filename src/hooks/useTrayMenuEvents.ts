import { useEffect } from 'react';
import { useHealthStore } from '@/store';
import { listen, pauseTimer, resumeTimer, timerResetAll, updatePauseMenu, emitPauseStateUpdated } from '@/services';

export function useTrayMenuEvents() {
  useEffect(() => {
    const unlistenResetAll = listen<null>('reset-all-tasks', () => {
      useHealthStore.getState().resetAllTasks();
      timerResetAll().catch(console.warn);
    });

    const unlistenTogglePause = listen<null>('toggle-pause', async () => {
      const currentPaused = useHealthStore.getState().isPaused;
      const nextPaused = !currentPaused;
      try {
        if (nextPaused) {
          await pauseTimer();
        } else {
          await resumeTimer();
        }
        useHealthStore.getState().setPaused(nextPaused);
        await updatePauseMenu(nextPaused).catch(console.warn);
        await emitPauseStateUpdated(nextPaused).catch(console.warn);
      } catch (e) {
        console.warn('toggle-pause failed:', e);
      }
    });

    return () => {
      unlistenResetAll.then((f) => f());
      unlistenTogglePause.then((f) => f());
    };
  }, []);
}
