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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/auth.context";
import { Loader2, Eye, EyeOff } from "lucide-react";
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

        // if (userCompanies.length === 0) {
        //   toast.error("No company is associated with your account");
        //   setIsLoading(false);
        //   return;
        // }

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
            <CardTitle className="text-lg tracking-tight">Login</CardTitle>
            <CardDescription>
              Enter your email and password below to <br />
              log into your account
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pr-10"
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
                <div className="relative mt-2">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                </div>
                <Button
                  className="mt-2"
                  style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Please wait
                    </>
                  ) : (
                    "Login"
                  )}
                </Button>
              </form>
            </Form>

            {/* Forgot Password link — outside <form> to avoid submit on click */}
            <div className="text-center mt-3">
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot Password?{" "}
                <span
                  style={{ color: "oklch(71.443% 0.12133 240.504)" }}
                  className="font-medium hover:underline"
                >
                  Reset
                </span>
              </Link>
            </div>
          </CardContent>
          {/*<CardFooter>*/}
          {/*  <p className="text-muted-foreground px-8 text-center text-sm">*/}
          {/*    By clicking login, you agree to our{" "}*/}
          {/*    <a*/}
          {/*      href="/terms"*/}
          {/*      className="hover:text-primary underline underline-offset-4"*/}
          {/*    >*/}
          {/*      Terms of Service*/}
          {/*    </a>{" "}*/}
          {/*    and{" "}*/}
          {/*    <a*/}
          {/*      href="/privacy"*/}
          {/*      className="hover:text-primary underline underline-offset-4"*/}
          {/*    >*/}
          {/*      Privacy Policy*/}
          {/*    </a>*/}
          {/*    .*/}
          {/*  </p>*/}
          {/*</CardFooter>*/}
        </Card>
      </div>
    </div>
  );
}

