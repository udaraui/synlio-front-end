"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { MailCheck, Loader2, RefreshCw } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";

export default function CheckEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  // The email may be passed via sessionStorage from the register page
  const email =
    typeof window !== "undefined"
      ? sessionStorage.getItem("pending_verification_email") ?? ""
      : "";

  async function handleResend() {
    if (!email) {
      toast.error("Could not determine your email. Please register again.");
      return;
    }
    setIsResending(true);
    try {
      await axios.post(`${API_URL}/auth/resend-verification`, { email });
      setResent(true);
      toast.success("Verification email resent! Please check your inbox.");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ?? "Failed to resend. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Brand header */}
        <div className="mb-4 gap-2 flex items-center justify-center">
          <Image src={Logo} width={35} height={35} alt="synlio" />
          <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate tracking-widest">
            Synlio
          </span>
        </div>

        <Card className="gap-4">
          <CardHeader className="items-center text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950 mb-2">
              <MailCheck className="h-7 w-7 text-blue-500" />
            </div>
            <CardTitle className="text-lg tracking-tight">
              Check your email
            </CardTitle>
            <CardDescription className="text-center">
              We&apos;ve sent a verification link to
              {email ? (
                <span className="block font-medium text-foreground mt-1">
                  {email}
                </span>
              ) : (
                " your email address"
              )}
              . Click the link in the email to activate your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Didn&apos;t receive it? Check your spam folder, or resend below.
            </p>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={isResending || resent}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resending…
                </>
              ) : resent ? (
                <>
                  <MailCheck className="mr-2 h-4 w-4 text-green-500" />
                  Email resent!
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Resend verification email
                </>
              )}
            </Button>

            <div className="text-center mt-1">
              <Link
                href="/login"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to{" "}
                <span
                  style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                  className="font-medium hover:underline"
                >
                  Log in
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
