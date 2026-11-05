"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { jwtDecode } from "jwt-decode";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Eye,
  BriefcaseBusiness,
  Camera,
  User as UserIcon,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_URL } from "@/services/api";
import { useAuth } from "@/contexts/auth.context";
import RegistrationMarketing from "@/components/registrationMarketing";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

const EMPLOYEE_COUNT_OPTIONS = ["1-10", "11-50", "51-200", "200+"] as const;
const MANAGE_TYPE_OPTIONS = [
  "Marketing",
  "Creative & Design",
  "Finance & Accounting",
  "HR & Recruiting",
  "Software Development",
  "Support",
  "Operations",
  "IT",
  "Sales & CRM",
  "Professional Services",
  "PMO",
  "Other",
] as const;

function suggestCompanyName(email: string): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return "";

  const domain = parts[1].toLowerCase();
  if (PUBLIC_DOMAINS.includes(domain)) return "";

  const domainName = domain.split(".")[0];
  if (!domainName) return "";

  return domainName.charAt(0).toUpperCase() + domainName.slice(1);
}

const userSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required").max(100),
  last_name: z.string().trim().min(1, "Last name is required").max(100),
  mobile_number: z
    .string()
    .refine((v) => !v || /^\+\d{1,4}$/.test(v) || isValidPhoneNumber(v), {
      message: "Please enter a valid mobile number.",
    })
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  user_profile_picture: z.instanceof(File).optional(),
});

const companySchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  company_address: z.string().optional(),
  company_address_2: z.string().optional(),
  company_address_3: z.string().optional(),
  company_profile_picture: z.instanceof(File).optional(),
});

const crmSchema = z.object({
  employee_count: z.string().optional(),
  manage_type: z.string().optional(),
  custom_manage_type: z.string().optional(),
  optional_data_1: z.string().optional(),
  optional_data_2: z.string().optional(),
  optional_data_3: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;
type CrmFormValues = z.infer<typeof crmSchema>;
type AccountType = "personal" | "organization";
type StepId = 1 | 2 | 3 | "crm-1" | "crm-2" | "crm-3";

interface CrmPayload {
  employee_count: string | null;
  manage_type: string | null;
  optional_data: string | null;
}

interface DecodedRegistrationToken {
  email?: string;
}

interface GoogleStoredUserData {
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
}

interface UserCompanyRecord {
  id: number;
  is_default?: boolean;
  [key: string]: unknown;
}

const VALID_STEPS: readonly StepId[] = [1, 2, 3, "crm-1", "crm-2", "crm-3"];

function isValidStep(val: unknown): val is StepId {
  return VALID_STEPS.includes(val as StepId);
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { login } = useAuth();
  // Steps:
  // 1       = User details (Email signup)
  // 2       = Account/Workspace type ('personal' | 'organization')
  // 3       = Company details (only if accountType === 'organization')
  // 'crm-1' = CRM Step 1: Employee Count pills
  // 'crm-2' = CRM Step 2: Manage Type pills (final active CRM step while 'crm-3' is commented out)
  // 'crm-3' = CRM Step 3: Placeholder step (currently commented out)
  const [step, setStep] = useState<StepId>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const showExitConfirmRef = useRef(showExitConfirm);
  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
  }, [showExitConfirm]);

  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    if (!token) return;

    if (!window.history.state || window.history.state.step === undefined) {
      window.history.replaceState({ step: 0 }, "", window.location.href);
      window.history.pushState({ step: 1 }, "", window.location.href);
    }

    const handlePopState = (event: PopStateEvent) => {
      if (isSubmittingRef.current) return;

      const targetStep: unknown = event.state?.step;

      if (isValidStep(targetStep) && !(targetStep === 1 && isGoogleSignup)) {
        setStep(targetStep);
      } else {
        const fallbackStep: StepId = isGoogleSignup ? 2 : 1;
        if (showExitConfirmRef.current) {
          window.history.pushState({ step: fallbackStep }, "", window.location.href);
          return;
        }

        window.history.pushState({ step: fallbackStep }, "", window.location.href);
        setShowExitConfirm(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [token, isGoogleSignup]);

  const handleConfirmExit = () => {
    showExitConfirmRef.current = false;
    sessionStorage.removeItem("registration_token");
    setShowExitConfirm(false);
    router.replace("/login");
  };

  const handleOpenChange = (open: boolean) => {
    setShowExitConfirm(open);
  };

  const navigateToStep = (nextStep: StepId) => {
    window.history.pushState({ step: nextStep }, "", window.location.href);
    setStep(nextStep);
  };

  const [userProfilePicture, setUserProfilePicture] = useState<File | null>(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState<string | null>(null);
  const [companyProfilePicture, setCompanyProfilePicture] = useState<File | null>(null);
  const [companyPreviewUrl, setCompanyPreviewUrl] = useState<string | null>(null);

  const getInitials = (first?: string, last?: string) => {
    const f = (first || "").trim();
    const l = (last || "").trim();
    if (!f && !l) return <UserIcon className="w-12 h-12" />;
    return `${f.charAt(0) || ""}${l.charAt(0) || ""}`.toUpperCase();
  };

  const getCompanyInitials = (name?: string) => {
    const n = (name || "").trim();
    if (!n) return <BriefcaseBusiness className="w-10 h-10" />;
    const words = n.split(" ").filter((w) => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase();
  };

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile_number: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_address: "",
      company_address_2: "",
      company_address_3: "",
    },
    mode: "onSubmit",
  });

  const crmForm = useForm<CrmFormValues>({
    resolver: zodResolver(crmSchema),
    defaultValues: {
      employee_count: "",
      manage_type: "",
      custom_manage_type: "",
      optional_data_1: "",
      optional_data_2: "",
      optional_data_3: "",
    },
    mode: "onSubmit",
  });

  const userValues = userForm.watch();
  const isUserFormValid = userSchema.safeParse(userValues).success;

  const companyValues = companyForm.watch();
  const isCompanyFormValid = companySchema.safeParse(companyValues).success;

  const crmValues = crmForm.watch();

  useEffect(() => {
    const storedToken = sessionStorage.getItem("registration_token");
    if (!storedToken) {
      router.replace("/register");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedRegistrationToken>(storedToken);
      if (!decoded.email) throw new Error("Invalid token payload");

      setEmail(decoded.email);
      setToken(storedToken);

      const suggestion = suggestCompanyName(decoded.email);
      if (suggestion) {
        companyForm.setValue("company_name", suggestion);
      }

      // Google signups: skip the personal details form and start at Step 2
      const googleData = sessionStorage.getItem("google_user_data");
      if (googleData) {
        setIsGoogleSignup(true);
        setStep(2);
        try {
          const parsed = JSON.parse(googleData) as GoogleStoredUserData;
          if (parsed.first_name) userForm.setValue("first_name", parsed.first_name);
          if (parsed.last_name) userForm.setValue("last_name", parsed.last_name);
          if (parsed.profile_picture) setUserPreviewUrl(parsed.profile_picture);
        } catch {
          // Ignore malformed data
        }
      }
    } catch {
      router.replace("/register");
    }
  }, [router, companyForm, userForm]);

  const extractErrorMessage = (err: unknown): string => {
    if (
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      typeof (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message === "string"
    ) {
      return (err as { response: { data: { message: string } } }).response.data.message;
    }
    return "Failed to complete registration";
  };

  /**
   * Google signups are already authenticated (the stored token is a normal access
   * token), so the company + Admin role are created through the onboarding endpoints.
   */
  const completeGoogleOnboarding = async (
    fields: {
      company_name: string;
      company_address?: string;
      company_type?: string;
      crm?: CrmPayload;
    },
    logo?: File | null
  ) => {
    const authHeaders = { Authorization: `Bearer ${token}` };

    const formData = new FormData();
    formData.append("company_name", fields.company_name);
    if (fields.company_address) formData.append("company_address", fields.company_address);
    if (fields.company_type) formData.append("company_type", fields.company_type);
    if (fields.crm) formData.append("crm", JSON.stringify(fields.crm));
    if (logo) formData.append("companyProfilePicture", logo);

    const createRes = await axiosInstance.post(
      `${API_URL}/auth/onboarding/create-company`,
      formData,
      { headers: { ...authHeaders, "Content-Type": "multipart/form-data" } }
    );

    const roleRes = await axiosInstance.post(
      `${API_URL}/auth/onboarding/setup-admin-role`,
      { companyId: createRes.data.companyId },
      { headers: authHeaders }
    );

    const { access_token, return_user } = roleRes.data;

    const companiesResponse = await axiosInstance.get<UserCompanyRecord[]>(
      `/authorization/getCompanyByUserId/${return_user.id}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const userCompanies: UserCompanyRecord[] = companiesResponse.data ?? [];
    localStorage.setItem("companies", JSON.stringify(userCompanies));
    const defaultCompany =
      userCompanies.find((c) => c.is_default === true) || userCompanies[0];
    if (defaultCompany) {
      localStorage.setItem("active_company", JSON.stringify(defaultCompany));
    }

    login(access_token, return_user);
    sessionStorage.removeItem("registration_token");
    sessionStorage.removeItem("google_user_data");
    router.replace("/home");
  };

  /**
   * Final backend API submission (`onFinalSubmit`) used by:
   * - Step 2 when `accountType === 'personal'` (bypasses Step 3 and CRM steps)
   * - The final active CRM step (currently `'crm-2'`, or `'crm-3'` when enabled)
   */
  const onFinalSubmit = async (options: {
    isPersonal: boolean;
    crm?: CrmPayload;
  }) => {
    setIsSubmitting(true);

    const currentUserValues = userForm.getValues();
    const currentCompanyValues = companyForm.getValues();

    const formattedAddress = [
      currentCompanyValues.company_address,
      currentCompanyValues.company_address_2,
      currentCompanyValues.company_address_3,
    ]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(", ");

    if (isGoogleSignup) {
      try {
        await completeGoogleOnboarding(
          {
            company_name: options.isPersonal
              ? "My Workspace"
              : currentCompanyValues.company_name,
            company_address: options.isPersonal
              ? undefined
              : formattedAddress || undefined,
            company_type: options.isPersonal ? "PERSONAL" : undefined,
            crm: options.crm,
          },
          options.isPersonal ? undefined : companyProfilePicture
        );
      } catch (err: unknown) {
        toast.error(extractErrorMessage(err));
        setIsSubmitting(false);
      }
      return;
    }

    const formData = new FormData();
    formData.append("first_name", currentUserValues.first_name);
    formData.append("last_name", currentUserValues.last_name);
    formData.append("email", email);
    if (currentUserValues.mobile_number) {
      formData.append("mobile_number", currentUserValues.mobile_number);
    }
    formData.append("password", currentUserValues.password);

    if (options.isPersonal) {
      formData.append("company_name", "Workspace");
      formData.append("company_type", "PERSONAL");
    } else {
      formData.append("company_name", currentCompanyValues.company_name);
      if (formattedAddress) {
        formData.append("company_address", formattedAddress);
      }
      if (options.crm) {
        formData.append("crm", JSON.stringify(options.crm));
      }
    }

    formData.append("registration_token", token);

    if (userProfilePicture) {
      formData.append("userProfilePicture", userProfilePicture);
    }
    if (!options.isPersonal && companyProfilePicture) {
      formData.append("companyProfilePicture", companyProfilePicture);
    }

    try {
      const response = await axiosInstance.post(
        `${API_URL}/auth/complete`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      const { access_token, return_user } = response.data;
      if (access_token && return_user) {
        login(access_token, return_user);

        const effectiveUserId = return_user.id;
        if (effectiveUserId) {
          const companiesResponse = await axiosInstance.get<UserCompanyRecord[]>(
            `/authorization/getCompanyByUserId/${effectiveUserId}`
          );
          const userCompanies: UserCompanyRecord[] = companiesResponse.data ?? [];
          localStorage.setItem("companies", JSON.stringify(userCompanies));

          const defaultCompany =
            userCompanies.find((c) => c.is_default === true) || userCompanies[0];
          if (defaultCompany) {
            localStorage.setItem("active_company", JSON.stringify(defaultCompany));
          }
        }
      }

      sessionStorage.removeItem("registration_token");
      setTimeout(() => {
        router.replace("/home?welcome=true");
      }, 3000);
    } catch (err: unknown) {
      toast.error(extractErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  // Step 1 -> Step 2
  const onUserSubmit = () => {
    navigateToStep(2);
  };

  // Step 2 -> If 'personal', bypass Step 3 & CRM steps and auto-submit; if 'organization', go to Step 3
  const onAccountTypeContinue = async () => {
    if (!accountType) return;

    if (accountType === "personal") {
      await onFinalSubmit({ isPersonal: true });
      return;
    }

    navigateToStep(3);
  };

  // Step 3 -> CRM Step 1 ('crm-1')
  const onCompanySubmit = () => {
    if (accountType !== "organization") return;
    navigateToStep("crm-1");
  };

  // Helper to build the CRM payload from current CRM form values (with optional overrides for skipped steps)
  const buildCrmPayload = (overrides?: Partial<CrmFormValues>): CrmPayload => {
    const values = { ...crmForm.getValues(), ...overrides };

    const employeeCount = values.employee_count?.trim() || null;

    let manageType: string | null = null;
    if (values.manage_type === "Other") {
      manageType = values.custom_manage_type?.trim() || "Other";
    } else if (values.manage_type?.trim()) {
      manageType = values.manage_type.trim();
    }

    const optionalDataJoined = [
      values.optional_data_1?.trim(),
      values.optional_data_2?.trim(),
      values.optional_data_3?.trim(),
    ]
      .filter(Boolean)
      .join(",");

    return {
      employee_count: employeeCount,
      manage_type: manageType,
      optional_data: optionalDataJoined || null,
    };
  };

  // ─── CRM Step 1 Handlers (Employee Count) ─────────────────────────────── //
  const handleCrm1Skip = () => {
    crmForm.setValue("employee_count", "");
    crmForm.clearErrors("employee_count");
    navigateToStep("crm-2");
  };

  const handleCrm1Next = () => {
    if (!crmForm.getValues("employee_count")) {
      crmForm.setError("employee_count", {
        type: "manual",
        message: "Please select a company size or click Skip and Continue",
      });
      return;
    }
    crmForm.clearErrors("employee_count");
    navigateToStep("crm-2");
  };

  // ─── CRM Step 2 Handlers (Manage Type — Currently Final Active CRM Step) ─ //
  const handleCrm2Skip = async () => {
    crmForm.setValue("manage_type", "");
    crmForm.setValue("custom_manage_type", "");
    crmForm.clearErrors(["manage_type", "custom_manage_type"]);

    // Since CRM Step 3 ('crm-3') is currently commented out, 'crm-2' is the final active step:
    const crmPayload = buildCrmPayload({
      manage_type: "",
      custom_manage_type: "",
    });
    await onFinalSubmit({ isPersonal: false, crm: crmPayload });
  };

  const handleCrm2Next = async () => {
    const currentManageType = crmForm.getValues("manage_type");
    const currentCustomManageType = crmForm.getValues("custom_manage_type");

    if (!currentManageType) {
      crmForm.setError("manage_type", {
        type: "manual",
        message: "Please select an option or click Skip and Continue",
      });
      return;
    }

    if (currentManageType === "Other" && !currentCustomManageType?.trim()) {
      crmForm.setError("custom_manage_type", {
        type: "manual",
        message: "Please specify what you would like to manage",
      });
      return;
    }

    crmForm.clearErrors(["manage_type", "custom_manage_type"]);

    // Since CRM Step 3 ('crm-3') is currently commented out, 'crm-2' triggers final submission:
    const crmPayload = buildCrmPayload();
    await onFinalSubmit({ isPersonal: false, crm: crmPayload });
  };

  // ─── CRM Step 3 Handlers (Placeholder Step — Ready When Uncommented) ──── //
  const _handleCrm3Skip = async () => {
    crmForm.setValue("optional_data_1", "");
    crmForm.setValue("optional_data_2", "");
    crmForm.setValue("optional_data_3", "");

    const crmPayload = buildCrmPayload({
      optional_data_1: "",
      optional_data_2: "",
      optional_data_3: "",
    });
    await onFinalSubmit({ isPersonal: false, crm: crmPayload });
  };

  const _handleCrm3Next = async () => {
    const crmPayload = buildCrmPayload();
    await onFinalSubmit({ isPersonal: false, crm: crmPayload });
  };

  if (!email) return null;

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row font-sans relative">
      <div className="absolute bottom-4 right-6 lg:bottom-4 lg:right-8 z-50">
        <ThemeToggle />
      </div>

      {/* Form Column (Left) */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 bg-white dark:bg-background overflow-y-auto">
        <div className="w-full max-w-[480px]">
          <div className="relative grid w-full">
            {/* Step 1: Personal Profile Details (Email Signups) */}
            <div
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                step === 1
                  ? "opacity-100 z-10"
                  : "opacity-0 pointer-events-none z-0"
              }`}
            >
              <Form {...userForm}>
                <form
                  onSubmit={userForm.handleSubmit(onUserSubmit)}
                  className="space-y-5 flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col space-y-1.5">
                      <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                        Profile details
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Set up your personal profile
                      </p>
                    </div>
                    <FormField
                      control={userForm.control}
                      name="user_profile_picture"
                      render={({ field: { onChange, value: _value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            <Avatar className="h-24 w-24 rounded-full">
                              <AvatarImage
                                src={userPreviewUrl || undefined}
                                className="object-cover rounded-full"
                              />
                              <AvatarFallback className="text-2xl font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white rounded-full">
                                {getInitials(
                                  userForm.watch("first_name"),
                                  userForm.watch("last_name")
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              title="Upload image"
                              onClick={() =>
                                document.getElementById("user-pic-upload")?.click()
                              }
                              className="absolute cursor-pointer bottom-0 right-0 p-1.5 ring-2 ring-background bg-primary text-white dark:text-black rounded-full shadow-sm hover:bg-primary/90 transition-transform active:scale-95"
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

                  <div className="grid grid-cols-2 gap-4 items-start">
                    <FormField
                      control={userForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jane"
                              autoComplete="given-name"
                              className="border-input"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                userForm.clearErrors("first_name");
                              }}
                              onBlur={() => {
                                field.onBlur();
                                const val = userForm.getValues("first_name")?.trim();
                                if (!val) {
                                  userForm.clearErrors("first_name");
                                } else if (val.length > 100) {
                                  userForm.setError("first_name", {
                                    type: "manual",
                                    message: "First name is too long",
                                  });
                                } else {
                                  userForm.clearErrors("first_name");
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Doe"
                              autoComplete="family-name"
                              className="border-input"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                userForm.clearErrors("last_name");
                              }}
                              onBlur={() => {
                                field.onBlur();
                                const val = userForm.getValues("last_name")?.trim();
                                if (!val) {
                                  userForm.clearErrors("last_name");
                                } else if (val.length > 100) {
                                  userForm.setError("last_name", {
                                    type: "manual",
                                    message: "Last name is too long",
                                  });
                                } else {
                                  userForm.clearErrors("last_name");
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={userForm.control}
                    name="mobile_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Mobile{" "}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="LK"
                            placeholder="77 123 4567"
                            {...field}
                            onChange={(val) => {
                              field.onChange(val);
                              if (
                                !val ||
                                /^\+\d{1,4}$/.test(val) ||
                                isValidPhoneNumber(val)
                              ) {
                                userForm.clearErrors("mobile_number");
                              }
                            }}
                            onBlur={() => {
                              field.onBlur();
                              const val = userForm.getValues("mobile_number");
                              if (!val || /^\+\d{1,4}$/.test(val)) {
                                userForm.clearErrors("mobile_number");
                              } else if (!isValidPhoneNumber(val)) {
                                userForm.setError("mobile_number", {
                                  type: "manual",
                                  message: "Please enter a valid mobile number.",
                                });
                              } else {
                                userForm.clearErrors("mobile_number");
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              autoComplete="new-password"
                              className="pr-10"
                              aria-invalid={!!fieldState.error}
                              {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                const val = e.target.value;
                                if (!val || val.length >= 6) {
                                  userForm.clearErrors("password");
                                }
                              }}
                              onBlur={() => {
                                field.onBlur();
                                const val = userForm.getValues("password");
                                if (!val) {
                                  userForm.clearErrors("password");
                                } else if (val.length < 6) {
                                  userForm.setError("password", {
                                    type: "manual",
                                    message:
                                      "Password must be at least 6 characters long",
                                  });
                                } else {
                                  userForm.clearErrors("password");
                                }
                              }}
                            />
                            <button
                              type="button"
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                              aria-pressed={showPassword}
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

                  <div className="flex pt-2">
                    <Button
                      type="submit"
                      className="w-full group"
                      disabled={isSubmitting || !isUserFormValid}
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Step 2: Account / Workspace Type */}
            <div
              className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                step === 2
                  ? "opacity-100 z-10"
                  : "opacity-0 pointer-events-none z-0"
              }`}
            >
              <div className="flex flex-col space-y-1.5 mb-8">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                  How will you use Synlio?
                </h1>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Choose a workspace type to get started
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Account type"
                className="grid grid-cols-1 gap-3 mb-6"
              >
                {[
                  {
                    value: "personal" as const,
                    title: "Personal Workspace",
                    description:
                      "Sets up a default workspace instantly.",
                    Icon: UserIcon,
                  },
                  {
                    value: "organization" as const,
                    title: "Company / Organization",
                    description:
                      "Configure your company profile and address.",
                    Icon: Building2,
                  },
                ].map(({ value, title, description, Icon }) => {
                  const selected = accountType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isSubmitting}
                      onClick={() => setAccountType(value)}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors text-left w-full ${
                        selected ? "border-primary bg-muted/50" : "border-input"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex flex-col justify-center">
                        <span className="text-sm font-medium text-slate-900 dark:text-foreground">
                          {title}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                          {description}
                        </span>
                      </span>
                      {selected && (
                        <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                {!isGoogleSignup && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                )}
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!accountType || isSubmitting}
                  onClick={onAccountTypeContinue}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : accountType === "personal" ? (
                    "Complete Profile"
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step 3: Company Details (Only if accountType === 'organization') */}
            {accountType === "organization" && (
              <div
                className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                  step === 3
                    ? "opacity-100 z-10"
                    : "opacity-0 pointer-events-none z-0"
                }`}
              >
                <Form {...companyForm}>
                  <form
                    onSubmit={companyForm.handleSubmit(onCompanySubmit)}
                    className="space-y-5 flex flex-col h-full"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex flex-col space-y-1.5">
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                          Company details
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-muted-foreground">
                          Set up your company profile
                        </p>
                      </div>
                      <FormField
                        control={companyForm.control}
                        name="company_profile_picture"
                        render={({ field: { onChange, value: _value, ...rest } }) => (
                          <div className="flex flex-col items-center gap-2 flex-shrink-0">
                            <div className="relative">
                              <Avatar className="h-24 w-24 rounded-full">
                                <AvatarImage
                                  src={companyPreviewUrl || undefined}
                                  className="object-cover rounded-full"
                                />
                                <AvatarFallback className="text-2xl font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white rounded-full">
                                  {getCompanyInitials(
                                    companyForm.watch("company_name")
                                  )}
                                </AvatarFallback>
                              </Avatar>
                              <button
                                type="button"
                                title="Upload image"
                                onClick={() =>
                                  document
                                    .getElementById("company-pic-upload")
                                    ?.click()
                                }
                                className="absolute cursor-pointer bottom-0 right-0 p-1.5 ring-2 ring-background bg-primary text-white dark:text-black rounded-full shadow-sm hover:bg-primary/90 transition-transform active:scale-95"
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
                                  setCompanyPreviewUrl(
                                    URL.createObjectURL(file)
                                  );
                                }
                              }}
                              {...rest}
                            />
                          </div>
                        )}
                      />
                    </div>

                    <FormField
                      control={companyForm.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Acme Corp"
                              autoComplete="organization"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <FormField
                        control={companyForm.control}
                        name="company_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Company Address{" "}
                              <span className="text-muted-foreground font-normal">
                                (optional)
                              </span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Address Line 1"
                                autoComplete="address-line1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="company_address_2"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="Address Line 2 (Suite, Floor, etc.)"
                                autoComplete="address-line2"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={companyForm.control}
                        name="company_address_3"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                placeholder="City, State, ZIP Code"
                                autoComplete="address-level2"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-3 mt-auto pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => setStep(2)}
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting || !isCompanyFormValid}
                      >
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* CRM Step 1 ('crm-1'): Employee Count Selectable Pills */}
            {accountType === "organization" && (
              <div
                className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                  step === "crm-1"
                    ? "opacity-100 z-10"
                    : "opacity-0 pointer-events-none z-0"
                }`}
              >
                <Form {...crmForm}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCrm1Next();
                    }}
                    className="space-y-6 flex flex-col h-full"
                  >
                    <div className="flex flex-col space-y-1.5">
                      <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                        How large is your company?
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Select the number of employees in your organization
                      </p>
                    </div>

                    <FormField
                      control={crmForm.control}
                      name="employee_count"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Company Size</FormLabel>
                          <FormControl>
                            <div
                              role="radiogroup"
                              aria-label="Company Size"
                              className="grid grid-cols-2 gap-3"
                            >
                              {EMPLOYEE_COUNT_OPTIONS.map((size) => {
                                const isSelected = field.value === size;
                                return (
                                  <Button
                                    key={size}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    variant={isSelected ? "default" : "outline"}
                                    className="h-11 rounded-full px-4 text-sm font-medium cursor-pointer transition-all"
                                    onClick={() => {
                                      field.onChange(size);
                                      crmForm.clearErrors("employee_count");
                                    }}
                                  >
                                    {size} employees
                                  </Button>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-3 mt-auto pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={handleCrm1Skip}
                      >
                        Skip and Continue
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        Next
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* CRM Step 2 ('crm-2'): Manage Type Selectable Pills + Conditional Input */}
            {accountType === "organization" && (
              <div
                className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                  step === "crm-2"
                    ? "opacity-100 z-10"
                    : "opacity-0 pointer-events-none z-0"
                }`}
              >
                <Form {...crmForm}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void handleCrm2Next();
                    }}
                    className="space-y-6 flex flex-col h-full"
                  >
                    <div className="flex flex-col space-y-1.5">
                      <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                        What would you like to manage?
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Choose the primary area your team will focus on first
                      </p>
                    </div>

                    <FormField
                      control={crmForm.control}
                      name="manage_type"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Focus Area</FormLabel>
                          <FormControl>
                            <div
                              role="radiogroup"
                              aria-label="What would you like to manage?"
                              className="flex flex-wrap gap-2.5"
                            >
                              {MANAGE_TYPE_OPTIONS.map((option) => {
                                const isSelected = field.value === option;
                                return (
                                  <Button
                                    key={option}
                                    type="button"
                                    role="radio"
                                    aria-checked={isSelected}
                                    aria-expanded={
                                      option === "Other" ? isSelected : undefined
                                    }
                                    aria-controls={
                                      option === "Other"
                                        ? "custom-manage-type-input"
                                        : undefined
                                    }
                                    variant={isSelected ? "default" : "outline"}
                                    className="h-10 rounded-full px-5 text-sm font-medium cursor-pointer transition-all"
                                    onClick={() => {
                                      field.onChange(option);
                                      crmForm.clearErrors("manage_type");
                                      if (option !== "Other") {
                                        crmForm.setValue("custom_manage_type", "");
                                        crmForm.clearErrors("custom_manage_type");
                                      }
                                    }}
                                  >
                                    {option}
                                  </Button>
                                );
                              })}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {crmValues.manage_type === "Other" && (
                      <FormField
                        control={crmForm.control}
                        name="custom_manage_type"
                        render={({ field }) => (
                          <FormItem id="custom-manage-type-input">
                            <FormLabel>Please specify</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Operations, Marketing, Legal"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  crmForm.clearErrors("custom_manage_type");
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex gap-3 mt-auto pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => void handleCrm2Skip()}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          "Skip and Continue"
                        )}
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* CRM Step 3 ('crm-3'): Placeholder Step (Commented out until new CRM field is finalized) */}
            {/*
            {accountType === "organization" && (
              <div
                className={`col-start-1 row-start-1 transition-opacity duration-300 ${
                  step === "crm-3"
                    ? "opacity-100 z-10"
                    : "opacity-0 pointer-events-none z-0"
                }`}
              >
                <Form {...crmForm}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void _handleCrm3Next();
                    }}
                    className="space-y-5 flex flex-col h-full"
                  >
                    <div className="flex flex-col space-y-1.5">
                      <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                        Additional workspace details
                      </h1>
                      <p className="text-sm text-slate-500 dark:text-muted-foreground">
                        Share any additional context to customize your setup
                      </p>
                    </div>

                    <div className="space-y-3">
                      <FormField
                        control={crmForm.control}
                        name="optional_data_1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Detail 1</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional field 1" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={crmForm.control}
                        name="optional_data_2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Detail 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional field 2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={crmForm.control}
                        name="optional_data_3"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Detail 3</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional field 3" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-3 mt-auto pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        disabled={isSubmitting}
                        onClick={() => void _handleCrm3Skip()}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          "Skip and Continue"
                        )}
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Setting up...
                          </>
                        ) : (
                          <>
                            Next
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}
            */}
          </div>
        </div>
      </div>

      {/* Marketing Column (Right) */}
      <RegistrationMarketing />

      {/* Confirmation Dialog on Back Navigation */}
      <AlertDialog open={showExitConfirm} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave profile setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave? Your profile setup progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleOpenChange(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExit}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
