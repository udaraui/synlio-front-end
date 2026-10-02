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
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Camera, User as UserIcon } from "lucide-react";
import axios from "axios";
import { API_URL } from "@/services/api";
import Image from "next/image";
import Logo from "../../../public/logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required").max(100),
    last_name: z.string().min(1, "Last name is required").max(100),
    mobile_number: z
      .string()
      .max(20, "Mobile number is too long")
      .optional()
      .or(z.literal("")),
    email: z
      .string()
      .toLowerCase()
      .email({ message: "Please enter a valid email address." }),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters long")
      .max(128),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    user_profile_picture: z.instanceof(File).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Email availability status type ──────────────────────────────────────────

type EmailStatus = "idle" | "checking" | "available" | "taken";

// ─── Page Component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("idle");
  const [userProfilePicture, setUserProfilePicture] = useState<File | null>(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile_number: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const getInitials = (first?: string, last?: string) => {
    const f = (first || "").trim();
    const l = (last || "").trim();
    if (!f && !l) return <UserIcon className="w-12 h-12" />;
    return `${f.charAt(0) || ""}${l.charAt(0) || ""}`.toUpperCase();
  };

  // ─── Debounced email check ──────────────────────────────────────────────

  const checkEmail = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim().toLowerCase();

    // Reset if empty or invalid format
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

  // ─── Submit ─────────────────────────────────────────────────────────────

  async function onSubmit(values: RegisterFormValues) {
    if (emailStatus === "taken") {
      form.setError("email", {
        message: "This email is already registered.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("first_name", values.first_name);
      formData.append("last_name", values.last_name);
      formData.append("email", values.email);
      formData.append("password", values.password);
      if (values.mobile_number) {
        formData.append("mobile_number", values.mobile_number);
      }
      if (userProfilePicture) {
        formData.append("userProfilePicture", userProfilePicture);
      }

      await axios.post(`${API_URL}/auth/register`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Account created! Please check your email to verify.");
      sessionStorage.setItem("pending_verification_email", values.email);
      router.push("/check-email");
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Email status indicator ─────────────────────────────────────────────

  const EmailStatusIcon = () => {
    if (emailStatus === "checking")
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    if (emailStatus === "available")
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (emailStatus === "taken")
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    return null;
  };

  // ─── Render ─────────────────────────────────────────────────────────────

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
          <CardHeader>
            <CardTitle className="text-md tracking-tight">
              Create an account
            </CardTitle>
            {/* <CardDescription>
              Fill in your details below to get started
            </CardDescription> */}
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className={cn("grid gap-3")}
              >
                  {/* Profile Picture */}
                  <div className="flex justify-center items-center">
                    <FormField
                      control={form.control}
                      name="user_profile_picture"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          {/* <FormLabel className="text-xs text-muted-foreground">Profile Picture (optional)</FormLabel> */}
                          <div className="relative">
                            <Avatar className="h-18 w-18 border-2 border-background ring-1 ring-border">
                              <AvatarImage src={userPreviewUrl || undefined} className="object-cover text-md" />
                              <AvatarFallback className="text-md font-semibold bg-primary text-white">
                                {getInitials(form.watch("first_name"), form.watch("last_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => document.getElementById("user-pic-upload")?.click()}
                              className="absolute cursor-pointer bottom-0.5 right-0.5 p-1.5 ring-1 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <Input
                            type="file"
                            id="user-pic-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                                setUserProfilePicture(file);
                                setUserPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                            {...rest}
                          />
                        </div>
                      )}
                    />
                  </div>

                {/* <div className="grid grid-cols-[25%_75%] gap-2"> */}

                  {/* Name row */}
                  <div className="grid grid-cols-1 gap-3">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                {/* </div> */}


                {/* Mobile number */}
                <FormField
                  control={form.control}
                  name="mobile_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Mobile number{" "}
                        <span className="text-muted-foreground font-normal text-xs">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+94771234567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                              "border-destructive focus-visible:ring-destructive"
                            )}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <EmailStatusIcon />
                          </div>
                        </div>
                      </FormControl>
                      {/* Email-specific status messages */}
                      {emailStatus === "taken" ? (
                        <p className="text-[0.8rem] font-medium text-destructive">
                          This email is already registered.{" "}
                          <Link
                            href="/login"
                            className="underline underline-offset-2"
                          >
                            Log in instead?
                          </Link>
                        </p>
                      ) : emailStatus === "available" ? (
                        <p className="text-[0.8rem] font-medium text-green-600">
                          Email is available.
                        </p>
                      ) : (
                        <FormMessage />
                      )}
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Min. 6 characters"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              title={
                                showPassword ? "Hide password" : "Show password"
                              }
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

                  {/* Confirm password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirm ? "text" : "password"}
                              placeholder="Repeat your password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirm(!showConfirm)}
                              title={
                                showConfirm ? "Hide password" : "Show password"
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showConfirm ? (
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
                </div>


                {/* Submit */}
                <Button
                  className="mt-2"
                  style={{ backgroundColor: "oklch(71.443% 0.12133 240.504)" }}
                  disabled={isLoading || emailStatus === "taken"}
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </Form>

            {/* Login link */}
            <div className="text-center mt-3">
              <span className="text-sm text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link
                href="/login"
                className="text-sm font-medium hover:underline"
                style={{ color: "oklch(71.443% 0.12133 240.504)" }}
              >
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
