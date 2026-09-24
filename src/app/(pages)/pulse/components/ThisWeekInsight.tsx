import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Activity } from 'lucide-react';

import { MeetingStats } from '@/services/common/meetings-integration.service';

interface ThisWeekInsightProps {
  synlioActivityData: any[];
  needsAttentionData: any[];
  loggedUserWorkingHoursPerWeek?: number;
  meetingStats?: MeetingStats | null;
  loading: boolean;
}

const generateDescription = (
  synlioData: any[],
  needsData: any[],
  loggedUserWorkingHoursPerWeek: number = 0,
  meetingStats: MeetingStats | null = null
): React.ReactNode => {
  if (!synlioData.length && !needsData.length && (!meetingStats || meetingStats.totalHours === 0)) {
    return "No activity to summarize for the selected period.";
  }

  // Calculate times
  const uniqueActivities = Array.from(new Map(synlioData.map(item => [`${item.id}-${item.postType}`, item])).values());
  const synlioActivityTime = uniqueActivities.reduce((acc, item) => acc + parseFloat(item.totalEffortInRange || '0'), 0);
  const meetingTimeHours = meetingStats?.totalHours ?? 0;

  const totalTrackedTime = synlioActivityTime + meetingTimeHours;
  const missingTime = Math.max(0, loggedUserWorkingHoursPerWeek - totalTrackedTime);

  // Most active space
  const spaceCounts = synlioData.reduce((acc, item) => {
    if (item.space) {
      acc[item.space] = (acc[item.space] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topSpace = Object.keys(spaceCounts).sort((a, b) => spaceCounts[b] - spaceCounts[a])[0];

  // Lagging tasks
  const overdueCount = needsData.filter(item => new Date(item.dueDate) < new Date()).length;

  const Highlight = ({ children }: { children: React.ReactNode }) => (
    <span className="">{children}</span>
  );

  return (
    <>
      Solid week on <Highlight>{topSpace || 'your work'}</Highlight>.{' '}
      {totalTrackedTime > 0 && (
        <>You tracked <Highlight>{totalTrackedTime.toFixed(1)} hours</Highlight>. </>
      )}
      {missingTime > 0 && loggedUserWorkingHoursPerWeek > 0 ? (
        <>You are missing <Highlight>{missingTime.toFixed(1)} hours</Highlight>. </>
      ) : totalTrackedTime > 0 && totalTrackedTime >= loggedUserWorkingHoursPerWeek && loggedUserWorkingHoursPerWeek > 0 ? (
        <>You <Highlight>fully met</Highlight> your expected logged time! </>
      ) : null}
      {overdueCount > 0 && (
        <><Highlight>{overdueCount} items</Highlight> need attention. </>
      )}
      Review before submitting.
    </>
  );
};

const ThisWeekInsight: React.FC<ThisWeekInsightProps> = ({
  synlioActivityData,
  needsAttentionData,
  loggedUserWorkingHoursPerWeek,
  meetingStats,
  loading
}) => {
  const today = new Date();
  const dayOfWeek = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${today.toLocaleDateString('en-US', { weekday: 'long' })}`;
  const syncTime = today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const description = loading ? 'Generating summary...' : generateDescription(
    synlioActivityData,
    needsAttentionData,
    loggedUserWorkingHoursPerWeek ?? 0,
    meetingStats ?? null
  );

  return (
    <Card className="rounded-lg">
      <CardContent className="flex items-center gap-4">
        <div className="bg-white text-[#F59E0B] border p-1.5 rounded-full dark:bg-card dark:text-[#F59E0B]">
          <Activity className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold flex gap-2 justify-start">
            <span>{dayOfWeek}</span>
            <span>·</span>
            <span>Synced at {syncTime}</span>
          </span>
          <p className="text-sm">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThisWeekInsight;