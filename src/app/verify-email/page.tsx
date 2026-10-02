"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/api";
import { useAuth } from "@/contexts/auth.context";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import Link from "next/link";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const verifyPromise = useRef<Promise<any> | null>(null);

  useEffect(() => {
    const token = searchParams?.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Verification token is missing from the link.");
      return;
    }

    if (!verifyPromise.current) {
      verifyPromise.current = axios.get(
        `${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
        { withCredentials: true }
      );
    }

    verifyPromise.current
      .then((res) => {
        const { access_token, return_user } = res.data;
        sessionStorage.removeItem("pending_verification_email");
        login(access_token, return_user);
        setStatus("success");
        setTimeout(() => {
          router.replace("/onboarding/create-company");
        }, 1800);
      })
      .catch((err: any) => {
        setStatus("error");
        setErrorMsg(
          err.response?.data?.message ??
            "The verification link is invalid or has expired."
        );
      });
  }, [searchParams, login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="mb-4 gap-2 flex items-center justify-center">
          <Image src={Logo} width={35} height={35} alt="synlio" />
          <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate tracking-widest">
            Synlio
          </span>
        </div>

        <Card className="gap-4">
          <CardHeader className="items-center text-center">
            {status === "verifying" && (
              <>
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950 mb-2">
                  <Loader2 className="h-7 w-7 text-blue-500 animate-spin" />
                </div>
                <CardTitle className="text-lg tracking-tight">
                  Verifying your email…
                </CardTitle>
                <CardDescription>Please wait a moment.</CardDescription>
              </>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center justify-center text-center w-full py-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-50 dark:bg-green-950 mb-4">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <CardTitle className="text-xl tracking-tight mb-2">
                  Email verified!
                </CardTitle>
                <CardDescription>
                  Your account is active. Redirecting you to set up your
                  company…
                </CardDescription>
              </div>
            )}

            {status === "error" && (
              <>
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-50 dark:bg-red-950 mb-2">
                  <XCircle className="h-7 w-7 text-red-500" />
                </div>
                <CardTitle className="text-lg tracking-tight">
                  Verification failed
                </CardTitle>
                <CardDescription>{errorMsg}</CardDescription>
              </>
            )}
          </CardHeader>

          {status === "error" && (
            <CardContent className="flex flex-col gap-3">
              <Button
                className="w-full"
                style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                asChild
              >
                <Link href="/register">Register again</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/login">Back to login</Link>
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
