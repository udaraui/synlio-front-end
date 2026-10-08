"use client";

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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth.context";
import { Loader2, Eye, EyeOff, Clock, Ticket } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import * as React from "react";

const loginFormSchema = z.object({
  email: z.string().toLowerCase().email({
    message: "Please enter a valid email address.",
  }),
  password: z
    .string()
    .min(1, "Please enter your password")
    .min(6, "Password must be at least 6 characters long"),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { login } = useAuth();

  // Check for logout message on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const logoutMessage = sessionStorage.getItem("logout_message");
      if (logoutMessage) {
        toast.error(logoutMessage);
        sessionStorage.removeItem("logout_message");
      }
    }
  }, []);

  async function onSubmit(values: z.infer<typeof loginFormSchema>) {
    setIsLoading(true);
    try {
      const response = await axios.post(API_URL + "/auth/login", values, {
        withCredentials: true,
      });
      if (response.status === 201) {
        const { access_token, return_user } = response.data;

        // Fetch companies for the user
        const companiesResponse = await axios.get(
          API_URL + "/authorization/getCompanyByUserId/" + return_user.id,
          {
            headers: { Authorization: `Bearer ${access_token}` },
            withCredentials: true,
          }
        );

        const userCompanies: any[] = companiesResponse.data ?? [];

        // Always store the full company list
        localStorage.setItem("companies", JSON.stringify(userCompanies));

        // Find the default company, or fallback to the first company.
        let defaultCompany = userCompanies.find((c) => c.is_default === true);
        if (!defaultCompany) {
          defaultCompany = userCompanies[0];
        }

        // Set the active company to the default company upon login
        localStorage.setItem("active_company", JSON.stringify(defaultCompany));

        login(access_token, return_user);
        const isSystemUser = userCompanies.length === 0;
        const defaultPath = isSystemUser ? "/user-management" : "/home";
        const redirectPath = searchParams?.get("redirect") || defaultPath;
        router.replace(redirectPath);
      } else {
        toast.error(response.data?.message || "An unknown error occurred");
        setIsLoading(false);
      }
    } catch (error: any) {
      let errorMessage: string;
      if (!error.response) {
        errorMessage =
          "Unable to connect to the server. Please try again later.";
      } else {
        errorMessage =
          error.response?.data?.message ||
          "Login failed. Please check your credentials.";
      }
      toast.error(errorMessage);
      setIsLoading(false);
    }
  }

  return (

    <div className="flex flex-col items-center justify-center w-full h-full p-6 lg:p-12 bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-background dark:to-background overflow-y-auto h-screen">
      <div className="w-full max-w-[480px]">

        {/* Brand header */}
        <div className="mb-5 gap-2 flex items-center justify-center">
          <Image src={Logo} width={28} height={28} alt="synlio" />
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-widest">
            Synlio
          </span>
        </div>

        <Card className="">
          <CardContent className="p-5 pt-5 sm:p-8 sm:pt-6">
            <div className="flex flex-col space-y-1.5 mb-8">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                Welcome
              </h1>
              <p className="text-sm text-slate-500 dark:text-muted-foreground">
                Enter your email and password to sign in to your account
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("grid gap-4")}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="name@example.com"
                          className={cn(form.formState.errors.email && "border-destructive")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="relative">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 dark:text-foreground">Password</FormLabel>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-primary hover:underline"
                          tabIndex={-1}
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className={cn(
                              "pr-10",
                              form.formState.errors.password && "border-destructive"
                            )}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-muted-foreground dark:hover:text-foreground transition-colors"
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

                <Button
                  className="w-full mt-2"
                  disabled={isLoading}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </Button>
              </form>
            </Form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-card px-3 text-slate-500 dark:text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => toast.info('Under construction')}
              >
                <svg className="mr-1 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  <path d="M1 1h22v22H1z" fill="none" />
                </svg>
                Google
              </Button>

              <Button
                variant="outline"
                type="button"
                className="w-full"
                onClick={() => toast.info('Under construction')}
              >
                <svg className="mr-1 h-4 w-4" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M0 0h10v10H0z" />
                  <path fill="#7fba00" d="M11 0h10v10H11z" />
                  <path fill="#00a4ef" d="M0 11h10v10H0z" />
                  <path fill="#ffb900" d="M11 11h10v10H11z" />
                </svg>
                Microsoft
              </Button>
            </div>

            <div className="text-center mt-6">
              <span className="text-sm text-slate-500 dark:text-muted-foreground">
                Don't have an account?{" "}
              </span>
              <Link
                href="/register"
                className="text-sm font-semibold hover:underline text-primary"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}