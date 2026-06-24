import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useHealthStore } from '../store';
import { MonitorCheck, Activity, PersonStanding, Eye, GlassWater } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import type { ExerciseCategory, PackageType } from '../types';

const CATEGORIES: ExerciseCategory[] = ['spine', 'circulation', 'metabolism', 'vision', 'wrist'];
const PACKAGES: PackageType[] = ['package-quick', 'package-standard', 'package-deep'];

function computeStreak(dailyStats: { date: string; exercisesCompleted: number; sitBreaks: number; waterCups: number; customBreaks: number }[]): number {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const day = dailyStats.find((s) => s.date === dateStr);
    if (day && (day.sitBreaks > 0 || day.waterCups > 0 || day.exercisesCompleted > 0 || day.customBreaks > 0)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

export function TodayStatsSection() {
  const { t } = useTranslation();
  const todayStats = useHealthStore((s) => s.todayStats);
  const dailyStats = useHealthStore((s) => s.dailyStats);

  const [statPage, setStatPage] = useState(1);
  const [chartMode, setChartMode] = useState<'exercise' | 'package'>('exercise');

  const streak = useMemo(() => computeStreak(dailyStats), [dailyStats]);

  const statCards = [
    {
      icon: <MonitorCheck size={20} />,
      label: t('dashboard.workMinutes', { defaultValue: '运行时长' }),
      value: todayStats.workMinutes,
      unit: t('dashboard.minutes', { defaultValue: '分钟' }),
    },
    {
      icon: <Activity size={20} />,
      label: t('dashboard.streakDays', { defaultValue: '连续天数' }),
      value: streak,
      unit: t('dashboard.days', { defaultValue: '天' }),
    },
    {
      icon: <PersonStanding size={20} />,
      label: t('statCards.sitReminder', { defaultValue: '久坐提醒' }),
      value: todayStats.sitBreaks,
      unit: t('dashboard.times', { defaultValue: '次' }),
    },
    {
      icon: <Eye size={20} />,
      label: t('statCards.eyeCare', { defaultValue: '护眼提醒' }),
      value: todayStats.eyeCare,
      unit: t('dashboard.times', { defaultValue: '次' }),
    },
    {
      icon: <GlassWater size={20} />,
      label: t('statCards.waterReminder', { defaultValue: '喝水提醒' }),
      value: todayStats.waterCups,
      unit: t('dashboard.times', { defaultValue: '次' }),
    },
  ];

  // TODO: 分页按自定义提醒分组，后续页显示自定义提醒统计
  const totalStatPages = 1;

  const chartData = useMemo(() => {
    if (chartMode === 'exercise') {
      return CATEGORIES.map((cat) => ({
        name: t('categories.' + cat),
        count: todayStats.categoryCounts[cat] ?? 0,
      }));
    }
    return PACKAGES.map((pkg) => ({
      name: pkg === 'package-quick'
        ? t('categories.wrist')
        : pkg === 'package-standard'
          ? t('categories.circulation')
          : t('categories.metabolism'),
      count: todayStats.packageCounts[pkg] ?? 0,
    }));
  }, [chartMode, todayStats, t]);

  const chartConfig = {
    count: {
      label: t('statCards.todayExercise', { defaultValue: '今日锻炼' }),
      color: 'var(--primary)',
    },
  } satisfies ChartConfig;

  return (
    <div className="relative" style={{ height: '346px' }}>
      {/* ================================================================ */}
      {/* 标题行 — 绝对定位 */}
      {/* ================================================================ */}
      <div
        className="absolute top-0 left-0 flex items-center justify-between"
        style={{ width: 'var(--grid-content)', height: '24px' }}
      >
        <h2 className="text-type-card-title font-semibold text-foreground">
          {t('dashboard.todayStats', { defaultValue: '今日统计' })}
        </h2>
        {totalStatPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              {Array.from({ length: totalStatPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === statPage}
                    onClick={() => setStatPage(page)}
                    size="icon-xs"
                    className="rounded-md"
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
      {/* 5 张统计卡片 — 绝对定位单行排列 */}
      {/* ================================================================ */}
      <div
        className="absolute"
        style={{ top: '36px', left: 0, width: 'var(--grid-content)', height: '122px' }}
      >
        {statCards.map((card, index) => (
          <Card
            key={card.label}
            className="absolute flex flex-col items-center justify-between ring-0 border border-border p-2"
            style={{
              top: 0,
              left: `calc(${index} * (79.2px + var(--grid-gap)))`,
              width: '79.2px',
              height: '122px',
              borderRadius: '10px',
            }}
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              {card.icon}
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-type-card-number font-semibold text-foreground tabular-nums">
                {card.value}
              </span>
              <span className="text-type-caption text-muted-foreground">
                {card.unit}
              </span>
            </div>
            <span className="text-type-body text-muted-foreground text-center leading-tight">
              {card.label}
            </span>
          </Card>
        ))}
      </div>

      {/* ================================================================ */}
      {/* 今日锻炼图表卡片 */}
      {/* ================================================================ */}
      <Card
        className="absolute ring-0 border border-border p-3"
        style={{
          top: 'calc(36px + 122px + var(--grid-gap))',
          left: 0,
          width: 'var(--grid-content)',
          height: '176px',
          borderRadius: '14px',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Activity size={13} />
          </div>
          <span className="text-sm font-semibold text-foreground">
            {t('statCards.todayExercise', { defaultValue: '今日锻炼' })}
          </span>
          <div className="ml-auto flex gap-1">
            <Toggle
              size="sm"
              pressed={chartMode === 'exercise'}
              onPressedChange={() => setChartMode('exercise')}
              className="rounded-full px-2.5 text-xs"
            >
              {t('statCards.exercise', { defaultValue: '动作' })}
            </Toggle>
            <Toggle
              size="sm"
              pressed={chartMode === 'package'}
              onPressedChange={() => setChartMode('package')}
              className="rounded-full px-2.5 text-xs"
            >
              {t('statCards.package', { defaultValue: '套餐' })}
            </Toggle>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="!aspect-auto mt-2 w-full" style={{ height: 'calc(176px - 32px - 8px - 16px)' }}>
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: -6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis width={28} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', textAnchor: 'end' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} barSize={18} />
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  );
}