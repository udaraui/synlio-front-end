'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Home, LayoutDashboard, Ticket,
  Users, Contact, Shapes, Calendar, User, BriefcaseBusiness, LucideIcon,
  Activity, ShieldUser, ChartNoAxesCombined, MousePointerClick, BotMessageSquare
} from 'lucide-react';
import { BreadcrumbItem as BreadcrumbItemType, useBreadcrumb } from '@/contexts/breadcrumb.context';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface EnhancedBreadcrumbProps {
  items: BreadcrumbItemType[];
}

// Maps pathname prefixes to the sidebar icon for that section
const PRIMARY = 'var(--primary)';

const PAGE_ICONS: { match: (p: string) => boolean; icon: LucideIcon | React.ElementType; color?: string }[] = [
  { match: (p) => p === '/home',                             icon: Home,              color: PRIMARY },
  { match: (p) => p.startsWith('/synalytics'),               icon: ChartNoAxesCombined,          color: PRIMARY },
  { match: (p) => p.startsWith('/task-management'),          icon: LayoutDashboard,   color: PRIMARY },
  { match: (p) => p.startsWith('/ticket-management'),        icon: Ticket,            color: PRIMARY },
  { match: (p) => p.startsWith('/pulse'),                    icon: Activity,          color: '#facc15' },
  { match: (p) => p.startsWith('/resource/management'),      icon: Users,             color: PRIMARY },
  { match: (p) => p.startsWith('/resource/pools'),           icon: Contact,           color: PRIMARY },
  { match: (p) => p.startsWith('/resource/skills'),          icon: Shapes,            color: PRIMARY },
  { match: (p) => p.startsWith('/resource/calendar'),        icon: Calendar,          color: PRIMARY },
  { match: (p) => p.startsWith('/user-management'),          icon: User,              color: PRIMARY },
  { match: (p) => p.startsWith('/environment/company'),      icon: BriefcaseBusiness, color: PRIMARY },
  { match: (p) => p.startsWith('/environment/roles'),        icon: ShieldUser,        color: PRIMARY },
  { match: (p) => p.startsWith('/chat'),                     icon: BotMessageSquare,  color: PRIMARY },
];

export function EnhancedBreadcrumb({ items }: EnhancedBreadcrumbProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { onBack } = useBreadcrumb();

  // Page detection — computed once and reused throughout
  const isTicketPage       = pathname.includes('/ticket-management/');
  const isTaskPage         = pathname.includes('/task-management/task');
  const isTicketCreatePage = !!pathname.match(/\/ticket-management\/ticket\/create$/);
  const isTicketSpacePage  = !!pathname.match(/\/ticket-management\/ticket$/) && searchParams.has('ticketSpaceId');
  const isTaskFormPage     = !!pathname.match(/\/task-management\/task\/form$/);
  const isTaskListPage     = !!pathname.match(/\/task-management\/task$/);
  const isMeetingsPage     = !!pathname.match(/^\/meetings/);

  if (items.length === 0) return null;

  const filteredItems = items.filter((item, index) => {
    const isLastItem = index === items.length - 1;
    if (isTicketPage || isTaskPage || isMeetingsPage) return true;
    return !(isLastItem && item.isCurrentPage && items.length > 1);
  });

  if (filteredItems.length === 0) return null;

  const handleBackNavigation = () => {
    sessionStorage.removeItem('task-table-expanded-state');
    sessionStorage.removeItem('taskPageFilters');

    if (isTaskFormPage || isTicketCreatePage) {
      const fallback = isTaskFormPage ? '/task-management/task' : '/ticket-management/ticket';
      router.replace(filteredItems[0]?.href || fallback, { scroll: false });
      return;
    }

    if (isTaskListPage) {
      if (onBack) { onBack(); return; }
      const parent = filteredItems.filter((i) => !i.isCurrentPage).at(-1);
      if (parent?.href) { router.replace(parent.href, { scroll: false }); return; }
      
      const meetingId = searchParams.get('meetingId');
      const fallback = meetingId ? `/task-management/task-space?meetingId=${meetingId}` : '/task-management/task-space';
      router.replace(fallback, { scroll: false });
      return;
    }

    if (isTicketSpacePage) {
      router.replace('/ticket-management/ticket-space', { scroll: false });
      return;
    }

    if (filteredItems.length > 1) {
      const parentItem = filteredItems.filter((item) => !item.isCurrentPage).at(-1) || filteredItems.at(-1);
      if (parentItem?.href) {
        router.replace(parentItem.href, { scroll: false });
        return;
      }
      const fallbackItem = filteredItems.find((item) => item.href);
      if (fallbackItem?.href) {
        router.replace(fallbackItem.href, { scroll: false });
      }
    }
  };

  const showBackButton =
    filteredItems.length > 0 &&
    (filteredItems.length > 1 ||
      isTicketCreatePage ||
      isTicketSpacePage ||
      isTaskFormPage ||
      isTaskListPage ||
      isMeetingsPage);

  const PageIcon = !showBackButton
    ? PAGE_ICONS.find((e) => e.match(pathname)) ?? null
    : null;

  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <Breadcrumb>
        <BreadcrumbList>
          {showBackButton ? (
            <BreadcrumbItem>
              <button
                onClick={handleBackNavigation}
                title="Go back"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center"
              >
                <ArrowLeft className="size-3.5" />
              </button>
            </BreadcrumbItem>
          ) : PageIcon ? (
            <BreadcrumbItem>
              <span className="inline-flex items-center">
                <PageIcon.icon
                  className="size-4"
                  style={{ color: PageIcon.color ?? undefined, ...(!PageIcon.color ? {} : {}) }}
                  {...(PageIcon.icon !== MousePointerClick ? { strokeWidth: 3 } : {})}
                />
              </span>
            </BreadcrumbItem>
          ) : null}
          {filteredItems.map((item, index) => {
            const isLast = index === filteredItems.length - 1;
            const isCurrentPage = isLast || item.isCurrentPage;
            const MAX_LABEL = 22;
            const truncated = item.label.length > MAX_LABEL
              ? item.label.slice(0, MAX_LABEL) + '…'
              : item.label;
            const needsTitle = item.label.length > MAX_LABEL;

            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {isCurrentPage ? (
                    <BreadcrumbPage
                      className={isLast ? "font-semibold" : "font-normal"}
                      title={needsTitle ? item.label : undefined}
                    >
                      {truncated}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href || '#'}
                        title={needsTitle ? item.label : undefined}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          sessionStorage.removeItem('task-table-expanded-state');
                          router.replace(item.href || '#', { scroll: false });
                        }}
                      >
                        {truncated}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
