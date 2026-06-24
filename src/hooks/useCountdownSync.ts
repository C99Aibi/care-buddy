import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { emit } from '@tauri-apps/api/event';
import { useHealthStore } from '@/store';
import {
  onCountdownUpdate,
  showFloatingWindow,
  hideFloatingWindow,
  showNotification,
  playNotificationSound,
} from '@/services';

export function useCountdownSync() {
  const { t } = useTranslation();
  const notifiedPre = useRef(new Set<string>());
  const floatingVisible = useRef(false);

  useEffect(() => {
    const unlisten = onCountdownUpdate((countdowns) => {
      const state = useHealthStore.getState();
      state.updateCountdowns(countdowns);

      const currentTasks = state.tasks;

      for (const id of [...notifiedPre.current]) {
        const task = currentTasks.find((t) => t.id === id);
        if (!task) {
          notifiedPre.current.delete(id);
          continue;
        }
        const remaining = countdowns[id];
        if (remaining === undefined || remaining <= 0 || remaining > task.preNotificationSeconds) {
          notifiedPre.current.delete(id);
        }
      }

      const previewTarget = currentTasks.reduce<{
        id: string; title: string; icon: string; remaining: number; preNotificationSeconds: number;
      } | null>((best, task) => {
        const remaining = countdowns[task.id];
        if (remaining === undefined) return best;
        if (!task.enabled || task.preNotificationSeconds <= 0) return best;
        if (remaining <= 0 || remaining > task.preNotificationSeconds) return best;
        if (!best || remaining < best.remaining) {
          return { id: task.id, title: task.title, icon: task.icon, remaining, preNotificationSeconds: task.preNotificationSeconds };
        }
        return best;
      }, null);

      if (previewTarget) {
        emit('floating-preview-update', previewTarget);
        if (!floatingVisible.current) {
          floatingVisible.current = true;
          showFloatingWindow().catch(console.warn);
        }

        if (!notifiedPre.current.has(previewTarget.id)) {
          notifiedPre.current.add(previewTarget.id);
          showNotification(previewTarget.title, t('timerCarousel.preNotificationBody', { defaultValue: '即将提醒' })).catch(console.warn);
          playNotificationSound(previewTarget.id).catch(console.warn);
        }
      } else {
        if (floatingVisible.current) {
          floatingVisible.current = false;
          hideFloatingWindow().catch(console.warn);
        }
      }
    });

    return () => { unlisten.then((fn) => fn()); };
  }, [t]);
}
