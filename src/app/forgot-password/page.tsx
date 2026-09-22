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
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/API/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import Link from "next/link";

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await axios.post(API_URL + "/auth/forgot-password", {
        email: values.email,
      });
      setIsSubmitted(true);
    } catch (error: any) {
      // Network error or unexpected server error — show inline
      const msg =
        error.code === "ERR_NETWORK" || !error.response
          ? "Unable to connect to the server. Please check your internet connection and try again."
          : error.response?.data?.message ||
            "Something went wrong. Please try again.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

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
          {isSubmitted ? (
            /* ── Success state ── */
            <>
              <CardHeader>
                <div className="flex flex-col items-center gap-3 py-2">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      backgroundColor:
                        "color-mix(in oklch, oklch(71.443% 0.12133 240.504) 15%, white)",
                    }}
                  >
                    <MailCheck
                      className="h-7 w-7"
                      style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                    />
                  </div>
                  <CardTitle className="text-lg tracking-tight text-center">
                    Check Your Email
                  </CardTitle>
                  <CardDescription className="text-center text-sm leading-relaxed">
                    If an account with that email exists, we&apos;ve sent a
                    password reset link. Please check your inbox and follow the
                    instructions.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 pb-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/login")}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitted(false);
                    form.reset();
                  }}
                  className="text-sm text-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Didn&apos;t receive an email?{" "}
                  <span
                    style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                    className="font-medium hover:underline"
                  >
                    Try again
                  </span>
                </button>
              </CardContent>
            </>
          ) : (
            /* ── Form state ── */
            <>
              <CardHeader>
                <CardTitle className="text-lg tracking-tight">
                  Forgot Password?
                </CardTitle>
                <CardDescription>
                  Enter your registered email address and we&apos;ll send you a
                  link to reset your password.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className={cn("grid gap-3")}
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input
                              id="forgot-password-email"
                              placeholder="name@example.com"
                              type="email"
                              {...field}
                            />
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
                      id="forgot-password-submit"
                      className="mt-2"
                      style={{
                        backgroundColor: "oklch(71.443% 0.12133 240.504)",
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Request Password Reset"
                      )}
                    </Button>

                    {errorMessage && (
                      <p className="text-sm text-destructive text-center">
                        {errorMessage}
                      </p>
                    )}

                    <div className="text-center mt-1">
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
