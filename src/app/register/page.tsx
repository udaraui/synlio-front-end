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
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import RegistrationMarketing from "@/components/registrationMarketing";
import axiosInstance from "@/lib/interceptors/axiosInstance";

const registerSchema = z.object({
  email: z
    .string()
    .toLowerCase()
    .email({ message: "Please enter a valid email address." }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

type EmailStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const checkEmail = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim().toLowerCase();

    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailStatus("idle");
      return;
    }

    setEmailStatus("checking");

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/auth/check-email?email=${encodeURIComponent(trimmed)}`
        );
        setEmailStatus(res.data.exists ? "taken" : "available");
      } catch {
        setEmailStatus("idle");
      }
    }, 600);
  }, []);

  async function onSubmit(values: RegisterFormValues) {
    if (emailStatus === "taken") {
      form.setError("email", {
        message: "This email is already registered.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await axiosInstance.post(`${API_URL}/auth/send-otp`, { email: values.email });
      sessionStorage.setItem("pending_email", values.email);
      router.push("/verify-email");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Failed to send verification code. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const EmailStatusIcon = () => {
    if (emailStatus === "checking")
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    // if (emailStatus === "available")
    //   return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (emailStatus === "taken")
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row font-sans">
      {/* Form Column (Left) */}
      <div className="flex flex-col items-center justify-center w-full h-full lg:w-1/2 p-6 lg:p-12 bg-white overflow-y-auto">
        <div className="w-full max-w-[380px]">
          
          {/* Brand header */}
          {/* <div className="mb-8 gap-3 flex items-center justify-center">
            <Image src={Logo} width={38} height={38} alt="synlio" />
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-widest">
              Synlio
            </span>
          </div> */}

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Create an account
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Enter your email below to get started
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
                    <FormLabel className="sr-only">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="name@example.com"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            checkEmail(e.target.value);
                          }}
                          className={cn(
                            "pr-9",
                            emailStatus === "taken" &&
                            "border-destructive"
                          )}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <EmailStatusIcon />
                        </div>
                      </div>
                    </FormControl>
                    {emailStatus === "taken" ? (
                      <p className="text-sm text-destructive px-1 pt-1.5">
                        This email is already registered.{" "}
                        <Link
                          href="/login"
                          className="underline-offset-2"
                        >
                          <span className="underline">Sign in</span> instead?
                        </Link>
                      </p>
                    ) : (
                      <FormMessage />
                    )}
                  </FormItem>
                )}
              />

              <Button
                className="w-full"
                disabled={isLoading || emailStatus === "taken"}
                type="submit"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait…
                  </>
                ) : (
                  "Continue with Email"
                )}
              </Button>
            </form>
          </Form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-500 font-medium">
                OR
              </span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              type="button" 
              className="w-full"
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
            >
              <svg className="mr-1 h-4 w-4" viewBox="0 0 21 21">
                <path fill="#f25022" d="M0 0h10v10H0z"/>
                <path fill="#7fba00" d="M11 0h10v10H11z"/>
                <path fill="#00a4ef" d="M0 11h10v10H0z"/>
                <path fill="#ffb900" d="M11 11h10v10H11z"/>
              </svg>
              Microsoft
            </Button>
          </div>

          <div className="text-center mt-8">
            <span className="text-sm text-slate-500">
              Already have an account?{" "}
            </span>
            <Link
              href="/login"
              className="text-sm font-semibold hover:underline text-primary"
            >
              Sign in
            </Link>
          </div>
          
        </div>
      </div>
      
      {/* Marketing Column (Right) */}
      <RegistrationMarketing />
    </div>
  );
}