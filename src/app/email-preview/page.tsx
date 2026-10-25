"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Calendar,
  ArrowUpRight,
  ArrowRight,
  Smartphone,
  Monitor,
  Tag,
  FolderClosed,
  Target,
  Copy,
  Check,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Logo from "../../../public/logo.png";

type EmailTab = "alert" | "verification" | "password-reset" | "pulse-verification";

export default function EmailPreviewPage() {
  const [tab, setTab] = useState<EmailTab>("alert");
  const [isMobile, setIsMobile] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get("type");
      if (typeParam === "pulse" || typeParam === "pulse-verification") {
        setTab("pulse-verification");
      } else if (typeParam === "password-reset") {
        setTab("password-reset");
      } else if (typeParam === "verification") {
        setTab("verification");
      } else if (typeParam === "alert") {
        setTab("alert");
      }
    }
  }, []);

  const handleCopy = (text: string) => {
    if (typeof window !== "undefined" && navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#030712] py-8 px-4 transition-colors">
      {/* ── Top Floating Toolbar ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-8 bg-white/90 dark:bg-[#0c1527]/90 backdrop-blur border border-slate-200 dark:border-[#1e2d4d] rounded-full p-2 px-4 flex flex-wrap items-center justify-between gap-3 sticky top-4 z-50">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-sky-500 dark:text-sky-400 tracking-wider pr-3 border-r border-slate-200 dark:border-[#1e2d4d]">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            Email Studio
          </span>

          {/* Template Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#070e1c] p-1 rounded-full border border-slate-200 dark:border-[#1e2d4d]">
            <button
              onClick={() => setTab("alert")}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-all cursor-pointer ${tab === "alert"
                ? "bg-sky-500 text-white font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              Alert Card
            </button>
            <button
              onClick={() => setTab("verification")}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-all cursor-pointer ${tab === "verification"
                ? "bg-sky-500 text-white font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              Verification
            </button>
            <button
              onClick={() => setTab("password-reset")}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-all cursor-pointer ${tab === "password-reset"
                ? "bg-sky-500 text-white font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              Password Reset
            </button>
            <button
              onClick={() => setTab("pulse-verification")}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-all cursor-pointer ${tab === "pulse-verification"
                ? "bg-sky-500 text-white font-semibold"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
            >
              Pulse Verification
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Viewport Width Switcher */}
          <button
            onClick={() => setIsMobile(!isMobile)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#1e2d4d] bg-slate-50 dark:bg-[#070e1c] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Toggle Viewport Preview Width"
          >
            {isMobile ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-sky-500" />
                <span>375px (Mobile)</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5 text-sky-500" />
                <span>600px (Desktop)</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <div className="flex items-center border-l border-slate-200 dark:border-[#1e2d4d] pl-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* ── Email Container Frame ────────────────────────────────────────── */}
      <div
        className={`mx-auto transition-all duration-300 ${isMobile ? "max-w-[375px]" : "max-w-[600px]"
          }`}
      >
        {/* Email Card Shell */}
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-[#1e2d4d] rounded-xl overflow-hidden transition-colors">
          {/* ── Brand Header (Matches Synlio Deep Navy) ── */}
          <div className="bg-[#0b1329] dark:bg-[#050b17] px-6 sm:px-8 py-5 flex items-center justify-between border-b-0">
            <div className="flex items-center gap-2.5">
              <Image
                src={Logo}
                alt="Synlio"
                width={28}
                height={28}
                className="w-7 h-7 object-contain"
              />
              <span className="font-semibold text-base tracking-wider text-slate-100 font-sans">
                Synlio
              </span>
            </div>
          </div>

          {/* ── TAB 1: Alert / Task / Project Email ─────────────────────── */}
          {tab === "alert" && (
            <div>
              {/* Hero Section */}
              <div className="p-4 sm:p-8">
                {/* Breadcrumb Hierarchy */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium mb-3">
                  <span>Synlio Project Space</span>
                  <span className="text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    SPS-P4
                  </span>
                </div>

                {/* Main Subject / Title */}
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
                  Synlio self registration & licensing
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  Self-registration flow completed. Please review the updated
                  tenant provisioning pipeline before triggering automated production rollout.
                </p>

                {/* Actor Info Row */}
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-sky-500 text-white dark:text-black font-bold text-xs flex items-center justify-center">
                    JD
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      John Doe
                    </strong>{" "}
                    updated this project
                  </p>
                </div>
              </div>

              {/* Metadata Table Rows (Matches Project/Ticket Cards) */}
              <div className="divide-y divide-slate-100 dark:divide-[#111a2e] px-6 sm:px-8 border-t border-slate-100 dark:border-[#111a2e]">
                {/* Status Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Status
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      To Do
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-700 dark:text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      In Progress
                    </span>
                  </div>
                </div>

                {/* Severity Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Severity
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Medium
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-700 dark:text-slate-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Low
                    </span>
                  </div>
                </div>

                {/* Ticket Type Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Type
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <Tag className="w-3 h-3 text-slate-400" />
                      Task
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-700 dark:text-slate-200">
                      <Tag className="w-3 h-3" />
                      Feature
                    </span>
                  </div>
                </div>

                {/* Queue Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Queue
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <FolderClosed className="w-3 h-3 text-slate-400" />
                      General
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-700 dark:text-slate-200">
                      <FolderClosed className="w-3 h-3" />
                      Product Dev
                    </span>
                  </div>
                </div>

                {/* Impact Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Impact
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <Target className="w-3 h-3 text-slate-400" />
                      Minor
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-700 dark:text-slate-200">
                      <Target className="w-3 h-3" />
                      Significant
                    </span>
                  </div>
                </div>

                {/* Date Range Badge (With Alert styling like screenshot) */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Timeline
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#091322] border border-slate-200 dark:border-[#1e2d4d] text-slate-500 opacity-60">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Sep 15 – Sep 28
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border border-destructive">
                      <Calendar className="w-3 h-3 text-destructive" />
                      Sep 28 – Oct 09
                    </span>
                  </div>
                </div>

                {/* Assignee Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Assignee
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 opacity-60">
                      <div className="w-7 h-7 rounded-full bg-slate-400 text-white dark:text-black font-bold text-xs flex items-center justify-center">
                        BD
                      </div>
                      <span className="font-medium text-slate-500 text-xs sm:text-sm">
                        Bob Dylan
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-sky-500 text-white dark:text-black font-bold text-xs flex items-center justify-center">
                        AS
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                        Alice Smith
                      </span>
                    </div>
                  </div>
                </div>

                {/* Co-Assignees / Participants Row */}
                <div
                  className={`py-3 text-xs sm:text-sm flex ${
                    isMobile
                      ? "flex-col items-start gap-1.5"
                      : "items-center justify-between"
                  }`}
                >
                  <span
                    className={`text-slate-500 dark:text-slate-400 ${
                      isMobile ? "text-xs font-semibold" : "text-sm"
                    }`}
                  >
                    Participants
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-500 opacity-60 text-xs sm:text-sm">
                      Alice Smith
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      Alice Smith, John Doe
                    </span>
                  </div>
                </div>
              </div>

              {/* Action / CTA Section */}
              <div className="p-6 sm:p-8 pt-4 text-center border-t border-slate-100 dark:border-[#111a2e]">
                <button className="inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white dark:text-black font-semibold text-sm px-6 py-2.5 rounded-md transition-all cursor-pointer">
                  <span>View in Synlio</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 2: Verification Code Email ─────────────────────────── */}
          {tab === "verification" && (
            <div>
              <div className="p-6 sm:p-8 pb-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span>Security</span>
                  <span className="text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    Email Verification
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
                  Verify your email address
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  Thanks for signing up for Synlio! Enter the verification code below to confirm your account and get started.
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic mb-3">
                  If you did not request this email, you can safely ignore it.
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  This code will expire in{" "}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    15 minutes
                  </strong>
                  .
                </p>
              </div>

              {/* Action / OTP Section */}
              <div className="p-6 sm:p-8 text-center border-t border-slate-100 dark:border-[#111a2e]">
                <div className="mx-auto w-fit bg-slate-50 dark:bg-[#070e1c] border border-slate-200 dark:border-[#111a2e] rounded-lg px-8 py-4 text-center">
                  <span className="font-mono text-3xl sm:text-4xl font-bold tracking-[10px] text-slate-900 dark:text-sky-400">
                    849201
                  </span>
                </div>
                <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400">
                  Enter this code on the verification screen to complete your registration.
                </p>
              </div>
            </div>
          )}

          {/* ── TAB 3: Password Reset Email ────────────────────────────── */}
          {tab === "password-reset" && (
            <div>
              <div className="p-6 sm:p-8 pb-5">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span>Security</span>
                  <span className="text-slate-400 dark:text-slate-600">/</span>
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    Password Reset
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
                  Reset your password
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                  We received a request to reset the password for your Synlio account. Click the button below to choose a new password.
                </p>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic mb-3">
                  If you did not request this email, you can safely ignore it.
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  This link will expire in{" "}
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    1 hour
                  </strong>
                  .
                </p>
              </div>

              {/* Action / CTA Section */}
              <div className="p-6 sm:p-8 text-center border-t border-slate-100 dark:border-[#111a2e]">
                <button className="inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-6 py-2.5 rounded-md transition-all cursor-pointer">
                  <span>Reset Password</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                {/* Fallback URL Box */}
                <div className="mt-5 bg-slate-50 dark:bg-[#070e1c] border border-slate-200 dark:border-[#111a2e] rounded-lg p-3.5 text-left">
                  <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    If the button doesn&apos;t work, copy and paste this link into your browser:
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-sky-600 dark:text-sky-400 break-all select-all font-mono">
                      https://app.synlio.com/reset-password?token=sample-reset-token-12345
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          "https://app.synlio.com/reset-password?token=sample-reset-token-12345"
                        )
                      }
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#111a2e] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                      title={copied ? "Copied!" : "Copy link"}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Pulse Verification Email ────────────────────────── */}
          {tab === "pulse-verification" && (
            <div>
              <div className="p-6 sm:p-8 pb-5">
                {/* <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">
                  <span className="text-sky-600 dark:text-sky-400 font-semibold">
                    Weekly Pulse
                  </span>
                </div> */}
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-snug mb-3">
                  Pulse Snapshot Forwarded
                </h1>

                {/* Actor Info Row */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-full bg-sky-500 text-white dark:text-black font-bold text-xs flex items-center justify-center">
                    KA
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    <strong className="text-slate-900 dark:text-white font-semibold">
                      Kasun Ariyasinghe
                    </strong>{" "}
                    requested your review
                  </p>
                </div>

                {/* Forwarded Callout Note */}
                <div className="p-4 rounded-r-lg text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  Hi, please review and approve this weekly pulse snapshot.
                </div>
              </div>

              {/* Action / CTA Section */}
              <div className="p-6 sm:p-8 text-center border-t border-slate-100 dark:border-[#111a2e]">
                <button className="inline-flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm px-6 py-2.5 rounded-md transition-all cursor-pointer">
                  <span>Review Snapshot</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Email Client Footer ────────────────────────────────────────── */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-500 space-y-1">
          <p>&copy; {new Date().getFullYear()} Synlio. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
