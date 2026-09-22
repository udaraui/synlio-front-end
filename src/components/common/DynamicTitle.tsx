"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/home",                              title: "Home" },
  { prefix: "/synalytics",                        title: "Synalytics" },
  { prefix: "/task-management/task-space",        title: "Project Space" },
  { prefix: "/task-management/task/form",         title: "Task Create" },
  { prefix: "/task-management/task",              title: "Task" },
  { prefix: "/ticket-management/ticket-space",    title: "Ticket Space" },
  { prefix: "/ticket-management/ticket/form",     title: "Ticket Create" },
  { prefix: "/ticket-management/ticket",          title: "Ticket" },
  { prefix: "/pulse",                             title: "Pulse" },
  { prefix: "/resource/management",               title: "Resource" },
  { prefix: "/resource/pools",                    title: "Resource Group" },
  { prefix: "/resource/skills",                   title: "Skill Categories" },
  { prefix: "/resource/calendar",                 title: "Calendar" },
  { prefix: "/user-management",                   title: "User" },
  { prefix: "/environment/roles",                 title: "Role" },
  { prefix: "/environment/company",               title: "Company" },
  { prefix: "/login",                             title: "Login" },
];

export function DynamicTitle() {
  const pathname = usePathname();

  useEffect(() => {
    const match = ROUTE_TITLES.find(
      ({ prefix }) => pathname === prefix || pathname.startsWith(prefix + "/")
    );
    document.title = match ? `${match.title} - Synlio` : "Synlio";
  }, [pathname]);

  return null;
}

