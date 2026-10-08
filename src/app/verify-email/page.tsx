"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { API_URL } from "@/services/api";
import { toast } from "sonner";
import { 
  Loader2, 
  MailOpen, 
  ArrowLeft,
  RefreshCw
} from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import RegistrationMarketing from "@/components/registrationMarketing";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Retrieve the email saved from the first step
    const pendingEmail = sessionStorage.getItem("pending_email");
    if (!pendingEmail) {
      router.replace("/register");
    } else {
      setEmail(pendingEmail);
    }
  }, [router]);

  const handleVerify = async (otpValue: string) => {
    if (otpValue.length !== 6 || !email) return;
    
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email,
        code: otpValue,
      });

      // Save the registration token to proceed to the final step
      if (response.data.registration_token) {
        sessionStorage.setItem("registration_token", response.data.registration_token);
        toast.success("Email verified successfully!");
        router.push("/register/complete-profile");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid or expired verification code.");
      setCode(""); // Clear the input on failure
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      await axios.post(`${API_URL}/auth/send-otp`, { email });
      toast.success("A new verification code has been sent to your email.");
    } catch (error: any) {
      toast.error("Failed to resend code. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null; // Prevent flash of content before redirect

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row font-sans">
      
      {/* Form Column (Left) */}
      <div className="flex flex-col items-center justify-center w-full h-full lg:w-1/2 p-6 lg:p-12 bg-white dark:bg-background overflow-y-auto">
        
        <div className="w-full max-w-[380px] flex flex-col items-center">
          
          {/* Brand header */}
          {/* <div className="mb-8 gap-3 flex items-center justify-center">
            <Image src={Logo} width={38} height={38} alt="synlio" />
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-widest">
              Synlio
            </span>
          </div> */}

          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-foreground">
              Check your email
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground mt-2 leading-relaxed">
              We've sent a 6-digit verification code to <br/>
              <span className="font-semibold text-slate-900 dark:text-foreground">{email}</span>
            </p>
          </div>

          <div className="flex flex-col items-center w-full">
            <div className="mb-8">
              <InputOTP 
                maxLength={6} 
                value={code} 
                onChange={(value) => {
                  setCode(value);
                  if (value.length === 6) handleVerify(value);
                }}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex flex-row w-full gap-3 mb-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/register')}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={isLoading || code.length !== 6}
                onClick={() => handleVerify(code)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </div>

            <div className="text-center space-y-4">
              <p className="text-sm text-slate-500 dark:text-muted-foreground">
                Didn't receive a code?{" "}
                <button
                  onClick={handleResend}
                  disabled={isResending}
                  className="font-semibold text-primary hover:underline inline-flex items-center"
                >
                  {isResending ? (
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  ) : null}
                  Resend code
                </button>
              </p>
            </div>
          </div>
          
        </div>
      </div>

      {/* 
      {/* Marketing Column (Right) - Subtle Inbox Visual *\/}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 p-8 xl:p-12 bg-gradient-to-br from-slate-50 to-indigo-50/30 relative overflow-hidden select-none">
        
        {/* Scaling Wrapper *\/}
        <div className="relative w-full max-w-[600px] aspect-square flex items-center justify-center animate-[float_8s_ease-in-out_infinite] scale-90 xl:scale-100">
          
          {/* Faint background elements for depth *\/}
          <div className="absolute w-64 h-64 bg-indigo-300/20 rounded-full blur-3xl -top-10 -right-10"></div>
          <div className="absolute w-64 h-64 bg-blue-300/20 rounded-full blur-3xl bottom-10 -left-10"></div>

          {/* Email Notification Card *\/}
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_25px_50px_rgb(0,0,0,0.08)] p-8 rounded-3xl w-[360px] relative z-20">
            <div className="w-14 h-14 rounded-2xl bg-white text-indigo-200 flex items-center justify-center mb-8 shadow-sm border border-indigo-100">
              <MailOpen className="w-7 h-7" />
            </div>
            
            <div className="space-y-4 mb-10">
              <div className="h-3 w-3/4 bg-slate-200/70 rounded-full"></div>
              <div className="h-3 w-1/2 bg-slate-200/70 rounded-full"></div>
            </div>
            
            {/* Visual OTP representation *\/}
            <div className="flex gap-2.5 justify-center">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  className="w-10 h-12 bg-white/80 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 font-mono text-xl shadow-sm"
                >
                  *
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      */}
      
      {/* Marketing Column (Right) */}
      <RegistrationMarketing />
    </div>
  );
}