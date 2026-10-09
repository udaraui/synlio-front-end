"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Loader2, Building2, ShieldCheck, CheckCircle2, ArrowRight, Camera, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { useAuth } from "@/contexts/auth.context";
import Image from "next/image";
import Logo from "../../../../public/logo.png";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const companySchema = z.object({
  company_name: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(200, "Company name is too long"),
  company_code: z
    .string()
    .min(1, "Company code is required")
    .max(50, "Company code is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, dashes, and underscores"),
  user_profile_picture: z.instanceof(File).optional(),
  company_profile_picture: z.instanceof(File).optional(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

type Step = "create-company" | "setup-role";

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 mb-6 justify-center">
      {/* Step 1 */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            step === "create-company"
              ? "bg-primary text-primary-foreground"
              : "bg-green-500 text-white"
          )}
        >
          {step === "setup-role" ? <CheckCircle2 className="h-4 w-4" /> : "1"}
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            step === "create-company" ? "text-foreground" : "text-green-600"
          )}
        >
          Company
        </span>
      </div>

      {/* Divider */}
      <div
        className={cn(
          "h-px w-10 transition-colors",
          step === "setup-role" ? "bg-green-500" : "bg-border"
        )}
      />

      {/* Step 2 */}
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
            step === "setup-role"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          2
        </div>
        <span
          className={cn(
            "text-sm font-medium",
            step === "setup-role" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Admin Setup
        </span>
      </div>
    </div>
  );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [step, setStep] = useState<Step>("create-company");
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [companyProfilePicture, setCompanyProfilePicture] = useState<File | null>(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);
  const [companyPreviewUrl, setCompanyPreviewUrl] = useState<string | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_code: "",
    },
    mode: "onTouched",
  });

  // ─── Step 1: Create Company ─────────────────────────────────────────────

  async function onCreateCompany(values: CompanyFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("company_name", values.company_name);
      formData.append("company_code", values.company_code);
      if (companyProfilePicture) formData.append("companyProfilePicture", companyProfilePicture);

      const res = await axiosInstance.post(
        `/auth/onboarding/create-company`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setCompanyId(res.data.companyId);
      setStep("setup-role");
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? "Failed to create company. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const getInitials = (first?: string, last?: string) => {
    const f = (first || "").trim();
    const l = (last || "").trim();
    if (!f && !l) return <UserIcon className="w-12 h-12" />;
    return `${f.charAt(0) || ""}${l.charAt(0) || ""}`.toUpperCase();
  };

  const getCompanyInitials = (name?: string) => {
    const n = (name || "").trim();
    if (!n) return <Building2 className="w-12 h-12" />;
    return n.substring(0, 2).toUpperCase();
  };

  // ─── Step 2: Setup Admin Role ───────────────────────────────────────────

  async function onSetupAdminRole() {
    if (!companyId) return;
    setIsSubmitting(true);
    try {
      const response = await axiosInstance.post(
        `/auth/onboarding/setup-admin-role`,
        { companyId }
      );
      
      const { access_token, return_user } = response.data;
      if (access_token && return_user) {
        login(access_token, return_user);
      }
      
      // Fetch and setup companies in localStorage so the user has the right privileges to access /home
      const effectiveUserId = return_user?.id || user?.id;
      if (effectiveUserId) {
        const companiesResponse = await axiosInstance.get(
          `/authorization/getCompanyByUserId/${effectiveUserId}`
        );
        const userCompanies: any[] = companiesResponse.data ?? [];
        localStorage.setItem("companies", JSON.stringify(userCompanies));

        let defaultCompany = userCompanies.find((c: any) => c.is_default === true);
        if (!defaultCompany) {
          defaultCompany = userCompanies[0];
        }
        if (defaultCompany) {
          localStorage.setItem("active_company", JSON.stringify(defaultCompany));
        }
      }

      setShowSpinner(true);
      setTimeout(() => {
        router.replace("/home?welcome=true");
      }, 3000);
    } catch (err: any) {
      toast.error(
        err.response?.data?.message ?? "Failed to set up admin role. Please try again."
      );
      setIsSubmitting(false);
    } 
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background relative">
      <div className="absolute bottom-6 right-6 lg:bottom-8 lg:right-8 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[460px]">
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Image src={Logo} width={35} height={35} alt="Synlio" />
          <span className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-widest">
            Synlio
          </span>
        </div>

        <Card className="gap-0 overflow-hidden">
          <CardHeader className="pb-4 pt-6 px-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-lg bg-primary/10">
                {step === "create-company" ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg tracking-tight">
                  {step === "create-company"
                    ? "Set up your workspace"
                    : "Set up your Admin profile"}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {step === "create-company"
                    ? "Give your company a name and a short code to get started."
                    : "We'll create an Admin role with full access for your account."}
                </CardDescription>
              </div>
            </div>

            <StepIndicator step={step} />
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {/* ── Step 1: Company form ── */}
            {step === "create-company" && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onCreateCompany)}
                  className="grid gap-4"
                >
                  <div className="flex justify-center gap-8 mb-4">

                    {/* Company Profile Picture */}
                    <FormField
                      control={form.control}
                      name="company_profile_picture"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <FormLabel className="text-xs text-muted-foreground">Company Logo</FormLabel>
                          <div className="relative">
                            <Avatar className="h-24 w-24 border-2 border-background ring-1 ring-border rounded-xl">
                              <AvatarImage src={companyPreviewUrl || undefined} className="object-cover rounded-xl" />
                              <AvatarFallback className="text-2xl font-semibold bg-primary text-white rounded-xl">
                                {getCompanyInitials(form.watch("company_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => document.getElementById("company-pic-upload")?.click()}
                              className="absolute cursor-pointer bottom-0.5 right-0.5 p-1.5 ring-1 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-transform active:scale-95"
                            >
                              <Camera className="w-4 h-4" />
                            </button>
                          </div>
                          <Input
                            type="file"
                            id="company-pic-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                onChange(file);
                                setCompanyProfilePicture(file);
                                setCompanyPreviewUrl(URL.createObjectURL(file));
                              }
                            }}
                            {...rest}
                          />
                        </div>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corporation"
                            autoFocus
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="company_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Company code{" "}
                          <span className="text-muted-foreground font-normal text-xs">
                            (short identifier, e.g. ACME)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ACME"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.value.toUpperCase())
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="mt-1 w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating company…
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* ── Step 2: Admin role setup ── */}
            {step === "setup-role" && (
              <div className="flex flex-col items-center text-center gap-5">
                {showSpinner ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium">Setting up your workspace...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShieldCheck className="h-8 w-8 text-primary" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        We will automatically create an{" "}
                        <strong className="text-foreground">Admin role</strong> for
                        your company with full access to all features, and assign it
                        to your account.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You can manage roles and permissions later from the settings.
                      </p>
                    </div>

                    <Button
                      onClick={onSetupAdminRole}
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Setting up…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete Setup
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          You can invite team members and configure more settings after setup.
        </p>
      </div>
    </div>
  );
}
