"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Bell, CheckCheck, Loader2, SquareCheckBig, Ticket, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
    getMyNotifications,
    getUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    NotificationItem,
} from "@/services/common/notification.service";
import { formatDistanceToNow, isToday, isYesterday, differenceInHours } from "date-fns";
import { useAuth } from "@/contexts/auth.context";

const PAGE_SIZE = 5;

const isNavigable = (n: NotificationItem) => {
    const type = n.referenceType ?? inferTypeFromTitle(n.title);
    return (type === "ticket" || type === "task") && !!n.referenceId && !n.title.toLowerCase().includes("delete");
};

/** Infer "task" or "ticket" from the notification title when referenceType is absent */
const inferTypeFromTitle = (title: string): string | undefined => {
    const lower = title.toLowerCase();
    if (lower.includes("task")) return "task";
    if (lower.includes("ticket")) return "ticket";
    return undefined;
};

/** Returns the icon element for a given referenceType (falls back to title inference) */
const getReferenceIcon = (
    referenceType: string | undefined,
    title: string,
    isRead: boolean,
    isDeleted: boolean,
) => {
    const type = referenceType ?? inferTypeFromTitle(title);

    // Deleted or read → always grey; unread → coloured
    const colorClass =
        isDeleted || isRead
            ? "text-muted-foreground"
            : type === "task"
                ? "text-blue-500"
                : "text-green-500";

    if (type === "task") {
        return <SquareCheckBig className={`h-4 w-4 shrink-0 mt-0.5 ${colorClass}`} />;
    }
    if (type === "ticket") {
        return <Ticket className={`h-4 w-4 shrink-0 mt-0.5 ${colorClass}`} />;
    }
    return null;
};

const getNotificationGroup = (index: number, createdAt: string) => {
    if (index < 5) return "Recent";

    const date = new Date(createdAt);
    const now = new Date();

    const hours = differenceInHours(now, date);
    if (hours < 1) return "Less than an hour ago";
    if (hours < 2) return "1 hour ago";
    if (hours < 24 && isToday(date)) return "Earlier today";
    if (isYesterday(date)) return "Yesterday";

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} days ago`;
    if (days < 14) return "Last week";
    if (days < 21) return "Two weeks ago";
    return "Older";
};

function Notification() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    /**
     * If the notification title is "Ticket Assigned to {name}" and {name}
     * matches the logged-in user, replace it with "Ticket Assigned to You".
     */
    const displayTitle = useCallback(
        (title: string): string => {
            if (!user) return title;
            const SUFFIX = " Ticket Assigned to ";
            const closeBracket = title.indexOf("]");
            const markerIdx = title.indexOf(SUFFIX);
            // Title must start with "[..." and contain the marker
            if (title[0] !== "[" || closeBracket < 0 || markerIdx < 0) return title;
            const assigneeName = title.slice(markerIdx + SUFFIX.length);
            const currentUserName =
                `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
            if (assigneeName === currentUserName) {
                return title.slice(0, markerIdx + SUFFIX.length) + "You";
            }
            return title;
        },
        [user],
    );

    const hasMore = notifications.length < total;

    /** Lightweight poll — only fetches the badge count */
    const pollBadgeCount = useCallback(async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch {
            // silently fail
        }
    }, []);

    /** Load the FIRST page (replaces current list) */
    const fetchInitial = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getMyNotifications(PAGE_SIZE, 0);
            setNotifications(result.data);
            setTotal(result.total);
            setUnreadCount(result.unreadCount);
        } catch {
            // silently fail
        } finally {
            setIsLoading(false);
        }
    }, []);

    /** Append the next page */
    const handleLoadMore = async () => {
        setLoadingMore(true);
        try {
            const result = await getMyNotifications(PAGE_SIZE, notifications.length);
            setNotifications((prev) => [...prev, ...result.data]);
            setTotal(result.total);
            setUnreadCount(result.unreadCount);
        } catch {
            // ignore
        } finally {
            setLoadingMore(false);
        }
    };

    // No polling — badge count is kept accurate via:
    //   • single fetch on mount
    //   • optimistic updates on mark-as-read / mark-all-as-read
    //   • fetchInitial() whenever the dropdown opens
    //   • BroadcastChannel 'notifications' message posted by any code that
    //     sends a notification:  new BroadcastChannel('notifications').postMessage('refresh')
    useEffect(() => {
        void pollBadgeCount();

        const channel = new BroadcastChannel('notifications');
        const onMessage = (e: MessageEvent) => {
            if (e.data === 'refresh') void pollBadgeCount();
        };
        channel.addEventListener('message', onMessage);

        return () => {
            channel.removeEventListener('message', onMessage);
            channel.close();
        };
    }, [pollBadgeCount]);

    // Fetch full list only when dropdown opens
    useEffect(() => {
        if (open) void fetchInitial();
    }, [open, fetchInitial]);

    const handleNotificationClick = async (notification: NotificationItem) => {
        // Navigate first (synchronously) to prevent browser pop-up blocker from blocking navigation
        if (isNavigable(notification)) {
            setOpen(false);
            const type = notification.referenceType ?? inferTypeFromTitle(notification.title);
            let url = "";

            if (type === "ticket") {
                const spaceParam = notification.referenceSpaceId
                    ? `&ticketSpaceId=${notification.referenceSpaceId}`
                    : "";
                url = `/ticket-management/ticket/form?edit=true&ticketId=${notification.referenceId}${spaceParam}`;
            } else if (type === "task") {
                const spaceParam = notification.referenceSpaceId
                    ? `&taskSpaceId=${notification.referenceSpaceId}`
                    : "";
                url = `/task-management/task/form?id=${notification.referenceId}${spaceParam}`;
            }

            if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
            }
        }

        // Always mark as read on click
        if (!notification.isRead) {
            setNotifications((prev) =>
                prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
            try {
                await markNotificationAsRead(notification.id);
            } catch {
                // revert on failure
                setNotifications((prev) =>
                    prev.map((n) =>
                        n.id === notification.id ? { ...n, isRead: false } : n
                    )
                );
                setUnreadCount((prev) => prev + 1);
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        try {
            await markAllNotificationsAsRead();
        } catch {
            void fetchInitial();
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative cursor-pointer"
                            onPointerDown={(e) => e.currentTarget.blur()}
                            onClick={(e) => e.currentTarget.blur()}
                        >
                            <Bell className="h-4 w-4" />
                            {unreadCount > 0 && (
                                <span className={`absolute -top-0.5 -right-0.5 flex h-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ${unreadCount > 99 ? "px-1 min-w-4" : "w-4"}`}>
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Notifications</p>
                </TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" className="w-96 p-0" onCloseAutoFocus={(e) => e.preventDefault()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <DropdownMenuLabel className="p-0 text-sm font-semibold">
                        Notifications
                        {unreadCount > 0 && (
                            <span className={`ml-2 inline-flex h-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none ${unreadCount > 99 ? "px-1 min-w-4" : "w-4"}`}>
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </DropdownMenuLabel>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={handleMarkAllAsRead}
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                <DropdownMenuSeparator className="my-0" />

                {/* Notification list */}
                <div className="max-h-[420px] overflow-y-auto">
                    {isLoading ? (
                        <div className="divide-y">
                            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-muted shrink-0" />
                                    <div className="flex-1 space-y-2 min-w-0">
                                        <div className="h-3 bg-muted rounded w-4/5" />
                                        <div className="h-2.5 bg-muted rounded w-1/3" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-30" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    ) : (
                        <>
                            {notifications.map((notification, index) => {
                                const navigable = isNavigable(notification);

                                const currentGroup = getNotificationGroup(index, notification.createdAt);
                                const prevGroup = index > 0 ? getNotificationGroup(index - 1, notifications[index - 1].createdAt) : null;

                                const header = currentGroup !== prevGroup ? (
                                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 sticky top-0 backdrop-blur-sm z-10 border-b">
                                        {currentGroup}
                                    </div>
                                ) : null;

                                const inner = (
                                    <div className="flex items-start gap-2">
                                        <span
                                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${!notification.isRead ? "bg-blue-500" : "bg-transparent"
                                                }`}
                                        />
                                        {/*{getReferenceIcon(notification.referenceType, notification.title, notification.isRead, !navigable)}*/}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p
                                                    className={[
                                                        "text-sm leading-snug truncate",
                                                        !notification.isRead
                                                            ? "font-semibold text-foreground"
                                                            : "font-normal text-muted-foreground"
                                                    ].join(" ")}
                                                >
                                                    {displayTitle(notification.title)}
                                                </p>
                                            </div>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {formatDistanceToNow(
                                                    new Date(notification.createdAt),
                                                    { addSuffix: true }
                                                )}
                                            </p>
                                        </div>
                                        {navigable && (
                                            <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center shrink-0" />
                                        )}
                                    </div>
                                );

                                // Deleted notifications — mark as read on click, but never navigate
                                if (!navigable) {
                                    if (notification.isRead) {
                                        return (
                                            <React.Fragment key={notification.id}>
                                                {header}
                                                <div className="w-full text-left px-4 py-3 border-b last:border-b-0 cursor-not-allowed opacity-80">
                                                    {inner}
                                                </div>
                                            </React.Fragment>
                                        );
                                    }

                                    return (
                                        <React.Fragment key={notification.id}>
                                            {header}
                                            <button
                                                className="w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors bg-blue-50 dark:bg-blue-950/20 cursor-pointer hover:bg-muted/60"
                                                onClick={async () => {
                                                    setNotifications((prev) =>
                                                        prev.map((n) =>
                                                            n.id === notification.id
                                                                ? { ...n, isRead: true }
                                                                : n
                                                        )
                                                    );
                                                    setUnreadCount((prev) => Math.max(0, prev - 1));
                                                    try {
                                                        await markNotificationAsRead(notification.id);
                                                    } catch {
                                                        setNotifications((prev) =>
                                                            prev.map((n) =>
                                                                n.id === notification.id
                                                                    ? { ...n, isRead: false }
                                                                    : n
                                                            )
                                                        );
                                                        setUnreadCount((prev) => prev + 1);
                                                    }
                                                }}
                                            >
                                                {inner}
                                            </button>
                                        </React.Fragment>
                                    );
                                }

                                // Normal notifications — clickable button with hover
                                return (
                                    <React.Fragment key={notification.id}>
                                        {header}
                                        <button
                                            className={[
                                                "group w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors cursor-pointer hover:bg-muted/60 flex items-center justify-between",
                                                !notification.isRead
                                                    ? "bg-blue-50 dark:bg-blue-950/20"
                                                    : "",
                                            ].join(" ")}
                                            onClick={() => void handleNotificationClick(notification)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                {inner}
                                            </div>
                                        </button>
                                    </React.Fragment>
                                );
                            })}

                            {/* Load more */}
                            {hasMore && (
                                <div className="border-t px-4 py-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs text-muted-foreground hover:text-foreground"
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                Loading...
                                            </>
                                        ) : (
                                            "Load more"
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default Notification;
