"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/API/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import Link from "next/link";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Please enter a new password")
      .min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");

  useEffect(() => {
    if (!token) {
      setTokenError(true);
    }
  }, [token]);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
    if (!token) {
      setErrorMessage("Invalid reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await axios.post(API_URL + "/auth/reset-password", {
        token,
        newPassword: values.password,
      });
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      const status = error.response?.status;
      const serverMsg: string | undefined = error.response?.data?.message;

      let msg: string;
      if (error.code === "ERR_NETWORK" || !error.response) {
        msg = "Unable to connect to the server. Please check your internet connection and try again.";
      } else if (status === 400) {
        // Map known backend messages to friendlier copy
        if (serverMsg?.toLowerCase().includes("expired")) {
          msg = "This reset link has expired. Please request a new one.";
        } else if (serverMsg?.toLowerCase().includes("invalid")) {
          msg = "This reset link is invalid. Please request a new one.";
        } else {
          msg = serverMsg || "Failed to reset password. Please try again.";
        }
      } else {
        msg = serverMsg || "Something went wrong. Please try again.";
      }

      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // ── No token in URL ──
  if (tokenError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <div className="mb-4 gap-2 flex items-center justify-center">
            <Image src={Logo} width={35} height={35} alt={"synlio"} />
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate tracking-widest">
              Synlio
            </span>
          </div>
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-lg tracking-tight text-destructive">
                Invalid Reset Link
              </CardTitle>
              <CardDescription>
                This password reset link is invalid or has expired. Please
                request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <Button
                className="w-full"
                style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                onClick={() => router.push("/forgot-password")}
              >
                Request New Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Success state ──
  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[480px]">
          <div className="mb-4 gap-2 flex items-center justify-center">
            <Image src={Logo} width={35} height={35} alt={"synlio"} />
            <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate tracking-widest">
              Synlio
            </span>
          </div>
          <Card className="gap-4">
            <CardHeader>
              <div className="flex flex-col items-center gap-3 py-2">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full"
                  style={{
                    backgroundColor:
                      "color-mix(in oklch, oklch(71.443% 0.12133 240.504) 15%, white)",
                  }}
                >
                  <CheckCircle2
                    className="h-7 w-7"
                    style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                  />
                </div>
                <CardTitle className="text-lg tracking-tight text-center">
                  Password Reset Successful
                </CardTitle>
                <CardDescription className="text-center text-sm leading-relaxed">
                  Your password has been updated. You will be redirected to the
                  login page in a moment.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <Button
                className="w-full"
                style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                onClick={() => router.push("/login")}
              >
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Reset form ──
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <div className="mb-4 gap-2 flex items-center justify-center">
          <Image src={Logo} width={35} height={35} alt={"synlio"} />
          <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 truncate tracking-widest">
            Synlio
          </span>
        </div>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">
              Set New Password
            </CardTitle>
            <CardDescription>
              Enter and confirm your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("grid gap-3")}
              >
                {/* New Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="reset-password-new"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            id="reset-password-confirm"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            title={showConfirmPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="relative mt-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                </div>

                <Button
                  id="reset-password-submit"
                  className="mt-2"
                  style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                {errorMessage && (
                  <p className="text-sm text-destructive text-center">
                    {errorMessage}
                  </p>
                )}

                {errorMessage &&
                  (errorMessage.includes("expired") ||
                    errorMessage.includes("invalid") ||
                    errorMessage.includes("Invalid")) && (
                  <div className="text-center">
                    <Link
                      href="/forgot-password"
                      className="text-sm font-medium hover:underline"
                      style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                    >
                      Request a new reset link
                    </Link>
                  </div>
                )}

                <div className="text-center mt-1">
                  <Link
                    href="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to Login
                  </Link>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
