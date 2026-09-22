'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TicketCard from './TicketCard';

interface TicketGroupViewProps {
  data: any[];
  relations: Record<number, any>;
  configData: any;
  getIconComponent: (iconName: string | undefined) => LucideIcon | null;
  onEdit: (ticket: any) => void;
  onDelete: (ticket: any) => void;
  onUpdateTicket: (ticketId: number, updates: any, updatedData?: any) => Promise<void>;
  onCardClick?: (ticket: any) => void;
}

type GroupByOption = 'severity' | 'status' | 'type';

export default function TicketGroupView({
  data,
  relations,
  configData,
  getIconComponent,
  onEdit,
  onDelete,
  onUpdateTicket,
  onCardClick,
}: TicketGroupViewProps) {
  const [groupBy, setGroupBy] = useState<GroupByOption>('status');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Extract config data for grouping/sorting (not passed to TicketCard)
  const ticketTypes = useMemo(() => configData?.types || [], [configData?.types]);
  const statuses = useMemo(() => configData?.statuses || [], [configData?.statuses]);
  const severities = useMemo(() => configData?.severities || [], [configData?.severities]);

  // Group tickets based on selected option
  const groupedTickets = useMemo(() => {
    const groups: Record<string, { items: any[]; config: any }> = {};

    data.forEach((ticket) => {
      const ticketRelations = relations[ticket.id] || {};
      let groupKey: string;
      let groupConfig: any;

      switch (groupBy) {
        case 'severity':
          const severity = ticketRelations.severity;
          groupKey = severity?.id?.toString() || 'unassigned';
          groupConfig = severity || { id: 'unassigned', name: 'No Severity', color: '#9CA3AF' };
          break;
        case 'status':
          const status = ticketRelations.status;
          groupKey = status?.id?.toString() || 'unassigned';
          groupConfig = status || { id: 'unassigned', name: 'No Status', color: '#9CA3AF' };
          break;
        case 'type':
          const type = ticketRelations.ticketType;
          groupKey = type?.id?.toString() || 'unassigned';
          groupConfig = type || { id: 'unassigned', name: 'No Type', color: '#9CA3AF', icon: null };
          break;
        default:
          groupKey = 'unassigned';
          groupConfig = { id: 'unassigned', name: 'Unassigned', color: '#9CA3AF' };
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { items: [], config: groupConfig };
      }
      groups[groupKey].items.push(ticket);
    });

    return groups;
  }, [data, relations, groupBy]);

  // Get sorted group keys based on groupBy option
  const sortedGroupKeys = useMemo(() => {
    const keys = Object.keys(groupedTickets);

    // Sort based on the config list order
    return keys.sort((a, b) => {
      const groupA = groupedTickets[a].config;
      const groupB = groupedTickets[b].config;

      // Put "unassigned" at the end
      if (a === 'unassigned') return 1;
      if (b === 'unassigned') return -1;

      // Sort by the order in the config arrays
      let configArray: any[] = [];
      switch (groupBy) {
        case 'severity':
          configArray = severities;
          break;
        case 'status':
          configArray = statuses;
          break;
        case 'type':
          configArray = ticketTypes;
          break;
      }

      const indexA = configArray.findIndex((item: any) => item.id === groupA.id);
      const indexB = configArray.findIndex((item: any) => item.id === groupB.id);

      return indexA - indexB;
    });
  }, [groupedTickets, groupBy, severities, statuses, ticketTypes]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleAll = () => {
    if (expandedGroups.size === sortedGroupKeys.length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(sortedGroupKeys));
    }
  };

  return (
    <div className="space-y-4">
      {/* Group By Selector */}
      <div className="flex items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Group by
          </span>
          <div className="inline-flex items-center rounded-lg border border-border bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setGroupBy('status')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                groupBy === 'status'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Status
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('severity')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                groupBy === 'severity'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Severity
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('type')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                groupBy === 'type'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Type
            </button>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={toggleAll}
          className="h-8 text-xs"
        >
          {expandedGroups.size === sortedGroupKeys.length ? 'Collapse All' : 'Expand All'}
        </Button>
      </div>

      {/* Grouped Tickets */}
      <div className="space-y-3">
        {sortedGroupKeys.map((groupKey) => {
          const group = groupedTickets[groupKey];
          const isExpanded = expandedGroups.has(groupKey);
          const { config, items } = group;

          return (
            <div
              key={groupKey}
              className="border border-border rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm"
            >
              {/* Group Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                style={{
                  backgroundColor: config.color ? `${config.color}10` : undefined,
                  borderLeft: `4px solid ${config.color || '#9CA3AF'}`,
                }}
                onClick={() => toggleGroup(groupKey)}
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>

                  {/* Group Icon/Indicator */}
                  <div className="flex items-center gap-2">
                    {groupBy === 'type' && config.icon && (
                      <span className="flex-shrink-0">
                        {React.createElement(
                          getIconComponent(config.icon) || 'div',
                          { className: 'w-4 h-4', style: { color: config.color } }
                        )}
                      </span>
                    )}
                    {groupBy !== 'type' && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                    )}
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {config.name}
                    </h3>
                  </div>

                  {/* Ticket Count */}
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
              </div>

              {/* Group Content - Collapsible */}
              {isExpanded && (
                <div className="border-t border-border p-3 bg-gray-50/50 dark:bg-gray-900/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {items.map((ticket: any) => {
                      const ticketRelations = relations[ticket.id] || {};

                      return (
                        <TicketCard
                          key={ticket.id}
                          ticket={ticket}
                          ticketRelations={ticketRelations}
                          getIconComponent={getIconComponent}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onUpdateTicket={onUpdateTicket}
                          onCardClick={onCardClick}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* No Data Message */}
      {sortedGroupKeys.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400">No tickets to display</p>
        </div>
      )}
    </div>
  );
}

