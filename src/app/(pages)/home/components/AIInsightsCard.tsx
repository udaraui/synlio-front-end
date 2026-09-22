"use client";

import React from 'react';
import { AlertTriangle, Hourglass, Sparkles } from 'lucide-react';

const InsightItem = ({ icon, title, children, iconClass, bgClass }: { icon: React.ElementType, title: string, children: React.ReactNode, iconClass?: string, bgClass?: string }) => {
  const Icon = icon;
  return (
    <div className={`flex items-start gap-3 p-2 rounded-lg ${bgClass}`}>
      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${iconClass}`} />
      <div className="flex flex-col">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
};

const AIInsightsCard = () => {
  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-3 flex flex-col min-h-[200px]">
      <div className="flex items-center mb-3 shrink-0">
        <Sparkles className="h-5 w-5 mr-2 text-primary" />
        <h2 className="text-md font-semibold">AI Insights</h2>
      </div>
      <div className="flex flex-col gap-2 flex-1 justify-around">
        <InsightItem icon={AlertTriangle} title="3 Overdue Tasks" iconClass="text-red-500" bgClass="bg-red-500/10">
          Prioritize them to stay on track with your project deadlines.
        </InsightItem>
        <InsightItem icon={Hourglass} title="2 Tickets are Waiting" iconClass="text-blue-500" bgClass="bg-blue-500/10">
          These items are pending your action or review.
        </InsightItem>
        <InsightItem icon={AlertTriangle} title="Workload Alert" iconClass="text-orange-400" bgClass="bg-orange-500/10">
          Your busiest day next week seems to be Tuesday. Plan accordingly.
        </InsightItem>
      </div>
    </div>
  );
};

export default AIInsightsCard;