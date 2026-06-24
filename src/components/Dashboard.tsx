import { useTranslation } from 'react-i18next';
import { CountdownSection } from './CountdownSection';
import { TodayStatsSection } from './TodayStatsSection';

export function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col gap-4">
      <CountdownSection />
      <TodayStatsSection />
    </div>
  );
}