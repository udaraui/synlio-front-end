import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, AlertTriangle, Clock, MousePointerClick } from 'lucide-react';
import { MeetingStats } from '@/services/meetings-integration.service';
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardsProps {
  needsAttentionData: any[];
  synlioActivityData: any[];
  loggedUserWorkingHoursPerWeek: number;
  meetingStats: MeetingStats | null;
  loading: boolean;
}

const providerInfo: Record<string, { label: string; color: string }> = {
  teams: { label: 'Teams', color: '#6264A7' },
  zoom: { label: 'Zoom', color: '#2D8CFF' },
  google_meet: { label: 'Google', color: '#00A783' },
  slack: { label: 'Slack', color: '#4A154B' },
  internal: { label: 'Internal', color: '#8b5cf6' },
  // legacy static data labels still work
  TEAMS: { label: 'Teams', color: '#6264A7' },
  GOOGLEMEET: { label: 'Google', color: '#00A783' },
  ZOOM: { label: 'Zoom', color: '#2D8CFF' },
  MEETING: { label: 'Meeting', color: '#b89494' },
};

const Pill = ({ color, label, count }: { color: string, label: string, count: string }) => (
  <div className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 bg-card text-card-foreground text-[11px] border rounded-md shrink-0")}>
    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <span className="font-semibold">{label.charAt(0).toUpperCase() + label.slice(1)}</span>
    <span>{count}</span>
  </div>
);


const StatCards: React.FC<StatCardsProps> = ({ needsAttentionData, synlioActivityData, loggedUserWorkingHoursPerWeek, meetingStats, loading }) => {

  // Card 1: Synlio Activity Time
  const uniqueActivities = Array.from(new Map(synlioActivityData.map(item => [`${item.id}-${item.postType}`, item])).values());
  const synlioActivityTime = uniqueActivities.reduce((acc, item) => acc + parseFloat(item.totalEffortInRange || '0'), 0);
  const uniqueTasks = new Set(synlioActivityData.filter(item => item.postType === 'Task').map(item => item.id));
  const synlioTasks = uniqueTasks.size;
  const uniqueTickets = new Set(synlioActivityData.filter(item => item.postType === 'Ticket').map(item => item.id));
  const synlioTickets = uniqueTickets.size;
  const uniqueActivitiesSet = new Set(synlioActivityData.filter(item => item.postType === 'Activity').map(item => item.id));
  const activityCount = uniqueActivitiesSet.size;

  // Card 2: Meeting Time — from real backend stats
  const meetingTimeHours = meetingStats?.totalHours ?? 0;
  const providerCounts: Record<string, number> = {};
  (meetingStats?.byProvider ?? []).forEach((p) => {
    providerCounts[p.provider] = p.count;
  });

  // Card 3: Missing Time
  const missingTime = loggedUserWorkingHoursPerWeek - (synlioActivityTime + meetingTimeHours);

  // Card 4: Needs Attention
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const uniqueNeedsAttention = Array.from(new Map(needsAttentionData.map(item => [`${item.id}-${item.postType}`, item])).values());
  const overdueCount = uniqueNeedsAttention.filter(item => new Date(item.dueDate) < now).length;
  const upcomingCount = uniqueNeedsAttention.filter(item => {
    const deadline = new Date(item.dueDate);
    return deadline >= now && deadline <= twoDaysFromNow;
  }).length;

  const stats = [
    {
      title: 'Synlio Activity',
      value: `${synlioActivityTime.toFixed(1)}h`,
      subheading: (
        <div className="flex flex-wrap items-center gap-2">
          <Pill color="#10B981" label="tasks" count={synlioTasks?.toString()} />
          <Pill color="#3B82F6" label="tickets" count={synlioTickets?.toString()} />
          {activityCount > 0 && <Pill color="#F59E0B" label="activities" count={activityCount.toString()} />}
        </div>
      ),
      icon: <MousePointerClick className="h-4 w-4 text-muted-foreground" />,
      color: '',
    },
    {
      title: 'Meeting Time',
      value: `${meetingTimeHours.toFixed(1)}h`,
      subheading: (
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(providerCounts).map(([p, c]) => (
            <Pill key={p} color={providerInfo[p]?.color || '#000'} label={p.toLowerCase()} count={c?.toString()} />
          ))}
        </div>
      ),
      icon: <Video className="h-4 w-4 text-muted-foreground" />,
      color: '',
    },
    {
      title: missingTime === 0
        ? 'Time Complete'
        : missingTime > loggedUserWorkingHoursPerWeek
          ? 'Over Time'
          : 'Missing Time',
      value: `${missingTime.toFixed(1)}h`,
      subheading: (
        <div className="flex flex-wrap items-center gap-2">
          <Pill color="#10B981" label="utilized" count={`${(synlioActivityTime + meetingTimeHours).toFixed(1)}h`} />
          <Pill color="#F59E0B" label="expected" count={loggedUserWorkingHoursPerWeek?.toString() + 'h'} />
        </div>
      ),
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      color: missingTime === 0 ? '#10B981' : (missingTime > 0 ? '#F59E0B' : ''),
    },
    {
      title: 'Need Attention',
      value: `${overdueCount + upcomingCount} items`,
      subheading: (
        <div className="flex flex-wrap items-center gap-2">
          <Pill color="#EF4444" label="overdue" count={overdueCount?.toString()} />
          <Pill color="#F97316" label="upcoming" count={upcomingCount?.toString()} />
        </div>
      ),
      icon: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
      color: overdueCount > 0 ? '#EF4444' : '',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index} className="rounded-lg bg-card text-card-foreground py-4 px-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-semibold">{stat.title}</CardTitle>
            {/*{stat.icon}*/}
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4 mt-2" />
              </>
            ) : (
              <>
                <div className="text-3xl font-semibold" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-xs mt-2">{stat.subheading}</div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatCards;