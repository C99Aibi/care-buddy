import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHealthStore } from '../store';
import { Pause, Play, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  pauseTimer,
  resumeTimer,
  timerPauseTask,
  timerResumeTask,
  timerResetTask,
} from '../services';
import { cn } from '@/lib/utils';

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function CountdownSection() {
  const { t } = useTranslation();
  const tasks = useHealthStore((s) => s.tasks);
  const taskStates = useHealthStore((s) => s.taskStates);
  const isPaused = useHealthStore((s) => s.isPaused);
  const setPaused = useHealthStore((s) => s.setPaused);
  const pauseTask = useHealthStore((s) => s.pauseTask);
  const resumeTask = useHealthStore((s) => s.resumeTask);
  const resetTask = useHealthStore((s) => s.resetTask);
  const resetAllTasks = useHealthStore((s) => s.resetAllTasks);

  const [cardPage, setCardPage] = useState(1);
  const cardsPerPage = 3;

  const enabledTasks = useMemo(() => tasks.filter((t) => t.enabled), [tasks]);

  // 主计时卡：显示倒计时最短的活跃提醒
  const mainTask = useMemo(() => {
    if (enabledTasks.length === 0) return null;
    return enabledTasks.reduce((best, task) => {
      const ts = taskStates[task.id];
      const remaining = ts?.countdown ?? task.interval * 60;
      if (!best || remaining < best.remaining) {
        return { task, remaining };
      }
      return best;
    }, null as { task: typeof enabledTasks[0]; remaining: number } | null);
  }, [enabledTasks, taskStates]);

  // 即将提醒：下一个进入预通知窗口的任务
  const upcomingTask = useMemo(() => {
    return enabledTasks.reduce((best, task) => {
      const ts = taskStates[task.id];
      const remaining = ts?.countdown ?? task.interval * 60;
      if (remaining <= 0) return best;
      if (!best || remaining < best.remaining) {
        return { task, remaining };
      }
      return best;
    }, null as { task: typeof enabledTasks[0]; remaining: number } | null);
  }, [enabledTasks, taskStates]);

  // 状态统计
  const runningCount = enabledTasks.filter((t) => {
    const ts = taskStates[t.id];
    return ts && !ts.paused && ts.countdown > 0;
  }).length;
  const pausedCount = enabledTasks.filter((t) => {
    const ts = taskStates[t.id];
    return ts?.paused || isPaused;
  }).length;

  // 卡片分页
  const totalCardPages = Math.ceil(enabledTasks.length / cardsPerPage);
  const startIndex = (cardPage - 1) * cardsPerPage;
  const currentCards = enabledTasks.slice(startIndex, startIndex + cardsPerPage);

  const mainProgress = mainTask
    ? 1 - mainTask.remaining / (mainTask.task.interval * 60)
    : 0;

  const handleTogglePause = async (taskId: string) => {
    const ts = taskStates[taskId];
    if (!ts) return;
    if (ts.paused) {
      resumeTask(taskId);
      await timerResumeTask(taskId).catch(console.warn);
    } else {
      pauseTask(taskId);
      await timerPauseTask(taskId).catch(console.warn);
    }
  };

  const handleReset = async (taskId: string) => {
    resetTask(taskId);
    await timerResetTask(taskId).catch(console.warn);
  };

  const handleGlobalPause = async () => {
    if (isPaused) {
      setPaused(false);
      await resumeTimer().catch(console.warn);
    } else {
      setPaused(true);
      await pauseTimer().catch(console.warn);
    }
  };

  return (
    <div className="relative" style={{ height: '246px' }}>
      {/* ================================================================ */}
      {/* 标题行 — 绝对定位 */}
      {/* ================================================================ */}
      <div
        className="absolute top-0 left-0 flex items-center justify-between"
        style={{ width: 'var(--grid-content)', height: '24px' }}
      >
        <div className="flex items-center gap-1">
          <h2 className="text-type-card-title font-semibold text-foreground">
            {t('dashboard.countdown', { defaultValue: '倒计时' })}
          </h2>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex">
              <Button
                variant="outline"
                size="icon-xs"
                className="flex-col rounded-md border-[#ebebeb] [&_svg]:size-3"
                tabIndex={-1}
              >
                <ChevronUp size={12} strokeWidth={2} />
                <ChevronDown size={12} strokeWidth={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleGlobalPause}>
                {isPaused ? (
                  <>
                    <Play size={14} />
                    {t('dashboard.resumeAll', { defaultValue: '继续所有提醒' })}
                  </>
                ) : (
                  <>
                    <Pause size={14} />
                    {t('dashboard.pauseAll', { defaultValue: '暂停所有提醒' })}
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => resetAllTasks()}>
                <RotateCcw size={14} />
                {t('dashboard.resetAll', { defaultValue: '重置所有提醒' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 分页器 — 只有 >1 页时显示 */}
        {totalCardPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              {Array.from({ length: totalCardPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === cardPage}
                    onClick={() => setCardPage(page)}
                    size="icon-xs"
                    className={cn(
                      'rounded-md',
                      page === cardPage && 'border border-[#ebebeb]'
                    )}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* ================================================================ */}
      {/* 主计时卡 — 绝对定位 */}
      {/* ================================================================ */}
      <Card
        className="absolute overflow-hidden ring-0"
        style={{
          top: 'calc(24px + var(--grid-gap))',
          left: 0,
          width: 'calc(var(--grid-col)*4 + var(--grid-gap)*3)',
          height: '210px',
          borderRadius: '14px',
          padding: '12px',
        }}
      >
        {/* 状态指示 */}
        <div
          className="absolute flex flex-col"
          style={{ top: '30px', left: '100px' }}
        >
          <div className="flex items-center gap-1">
            <span className="size-2 shrink-0 rounded-full bg-[#2da44e]" />
            <span className="text-type-caption text-muted-foreground">
              {t('dashboard.runningReminders', { count: runningCount, defaultValue: '{{count}}个提醒进行中' }).replace('{{count}}', String(runningCount))}
            </span>
          </div>
          {pausedCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="size-2 shrink-0 rounded-full bg-[#f97716]" />
              <span className="text-type-caption text-muted-foreground">
                {t('dashboard.pausedReminders', { count: pausedCount, defaultValue: '{{count}}个提醒暂停中' }).replace('{{count}}', String(pausedCount))}
              </span>
            </div>
          )}
        </div>

        {/* 计时器盒 */}
        <div
          className="absolute flex flex-col items-center justify-center rounded-[22px] bg-muted border border-[#efefef]"
          style={{ top: '60px', left: '50px', width: '192px', height: '88px' }}
        >
          <span className="text-type-timer-number font-bold text-foreground tabular-nums">
            {mainTask ? formatCountdown(mainTask.remaining) : '--:--:--'}
          </span>
          <span className="text-type-caption text-muted-foreground">
            {mainTask
              ? t('dashboard.remainingPercent', { percent: Math.round((1 - mainProgress) * 100), defaultValue: `剩余${Math.round((1 - mainProgress) * 100)}%` }).replace('{{percent}}', String(Math.round((1 - mainProgress) * 100)))
              : ''}
          </span>
        </div>

        {/* 即将提醒 */}
        {upcomingTask && (
          <div
            className="absolute flex items-center gap-1"
            style={{ top: '160px', left: '85.5px' }}
          >
            <span className="text-type-body text-muted-foreground">
              {t('dashboard.upcoming', { defaultValue: '即将提醒:' })}
            </span>
            <span className="text-type-body text-foreground">
              {t('taskNames.' + upcomingTask.task.id, { defaultValue: upcomingTask.task.title })}
            </span>
          </div>
        )}
      </Card>

      {/* ================================================================ */}
      {/* 提醒卡片区 — 绝对定位 */}
      {/* ================================================================ */}
      <div
        className="absolute"
        style={{
          top: 'calc(24px + var(--grid-gap))',
          left: 'calc(var(--grid-col)*4 + var(--grid-gap)*4)',
          width: 'calc(var(--grid-col)*2 + var(--grid-gap))',
          height: '210px',
        }}
      >
        {currentCards.map((task, index) => {
          const ts = taskStates[task.id];
          const remaining = ts?.countdown ?? task.interval * 60;
          const progress = 1 - remaining / (task.interval * 60);
          const taskPaused = ts?.paused || isPaused;

          return (
            <Card
              key={task.id}
              className={cn(
                'absolute overflow-hidden border border-border ring-0',
                taskPaused && 'opacity-60'
              )}
              style={{
                top: `${index * 74}px`,
                left: 0,
                width: 'calc(var(--grid-col)*2 + var(--grid-gap))',
                height: '62px',
                borderRadius: '10px',
                padding: '8px',
              }}
            >
              <div className="flex h-full items-center justify-between">
                {/* 左侧：倒计时 + 任务名 */}
                <div className="flex flex-col">
                  <span className="text-type-card-number font-semibold text-foreground tabular-nums leading-[var(--type-card-number-lh)]">
                    {formatCountdown(remaining)}
                  </span>
                  <span className="text-type-body text-muted-foreground leading-[var(--type-body-lh)]">
                    {t('taskNames.' + task.id, { defaultValue: task.title })}
                  </span>
                </div>

                {/* 右侧：百分比 + 状态 */}
                <div className="flex flex-col items-end">
                  <span className="text-type-caption text-muted-foreground leading-[var(--type-caption-lh)]">
                    {Math.round((1 - progress) * 100)}%
                  </span>
                  <span className="text-type-caption font-medium text-muted-foreground leading-[var(--type-caption-lh)]">
                    {taskPaused
                      ? t('dashboard.paused', { defaultValue: '已暂停' })
                      : t('dashboard.normal', { defaultValue: '正常' })}
                  </span>
                </div>
              </div>

              {/* Hover 操作按钮 */}
              <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-[10px] bg-card/90 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="rounded-md"
                  onClick={() => handleTogglePause(task.id)}
                >
                  {ts?.paused ? <Play size={12} /> : <Pause size={12} />}
                </Button>
                <Button
                  variant="outline"
                  size="icon-xs"
                  className="rounded-md"
                  onClick={() => handleReset(task.id)}
                >
                  <RotateCcw size={12} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}