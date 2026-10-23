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
import { Loader2, ArrowRight, ArrowLeft, EyeOff, Eye, BriefcaseBusiness, Camera, User as UserIcon, UserCircle, Building2, Info, CheckCircle2 } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
];

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
  accountType: z.enum(["personal", "company"]).default("company"),
});

const companySchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  company_address: z.string().optional(),
  company_address_2: z.string().optional(),
  company_address_3: z.string().optional(),
  company_profile_picture: z.instanceof(File).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;

export default function CompleteProfilePage() {
  const router = useRouter();
  const { login } = useAuth();
  // Steps: 1 = user details (email signup), 2 = workspace type (Google signup),
  // 3 = company details, 4 = loading spinner
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [workspaceType, setWorkspaceType] = useState<"personal" | "organization" | null>(null);
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

      const targetStep = event.state?.step;

      if (targetStep === 2) {
        setStep(2);
      } else if (targetStep === 1) {
        setStep(1);
      } else {
        if (showExitConfirmRef.current) {
          window.history.pushState({ step: 1 }, "", window.location.href);
          return;
        }

        window.history.pushState({ step: 1 }, "", window.location.href);
        setShowExitConfirm(true);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [token]);

  const handleConfirmExit = () => {
    showExitConfirmRef.current = false;
    sessionStorage.removeItem("registration_token");
    setShowExitConfirm(false);
    router.replace("/login");
  };

  const handleOpenChange = (open: boolean) => {
    setShowExitConfirm(open);
  };

  const handleStep2Back = () => {
    if (window.history.state?.step === 2) {
      window.history.back();
    } else {
      setStep(1);
    }
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
    const words = n.split(" ").filter(w => w.length > 0);
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
      accountType: "company",
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

  const userValues = userForm.watch();
  const isUserFormValid = userSchema.safeParse(userValues).success;

  const companyValues = companyForm.watch();
  const isCompanyFormValid = companySchema.safeParse(companyValues).success;

  useEffect(() => {
    const storedToken = sessionStorage.getItem("registration_token");
    if (!storedToken) {
      router.replace("/register");
      return;
    }

    try {
      const decoded: any = jwtDecode(storedToken);
      if (!decoded.email) throw new Error("Invalid token payload");

      setEmail(decoded.email);
      setToken(storedToken);

      const suggestion = suggestCompanyName(decoded.email);
      if (suggestion) {
        companyForm.setValue("company_name", suggestion);
      }

      // Google signups: skip the personal details form and auto-fill what we know
      const googleData = sessionStorage.getItem("google_user_data");
      if (googleData) {
        setIsGoogleSignup(true);
        setStep(2);
        try {
          const parsed = JSON.parse(googleData);
          if (parsed.first_name) userForm.setValue("first_name", parsed.first_name);
          if (parsed.last_name) userForm.setValue("last_name", parsed.last_name);
          if (parsed.profile_picture) setUserPreviewUrl(parsed.profile_picture);
        } catch {
          // Ignore malformed data
        }
      }
    } catch (err) {
      router.replace("/register");
    }
  }, [router, companyForm, userForm]);

  const readGoogleFirstName = (): string => {
    try {
      const raw = sessionStorage.getItem("google_user_data");
      const name = raw ? JSON.parse(raw)?.first_name : "";
      return typeof name === "string" ? name.trim() : "";
    } catch {
      return "";
    }
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
    },
    logo?: File | null
  ) => {
    const authHeaders = { Authorization: `Bearer ${token}` };

    const formData = new FormData();
    formData.append("company_name", fields.company_name);
    if (fields.company_address) formData.append("company_address", fields.company_address);
    if (fields.company_type) formData.append("company_type", fields.company_type);
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

    // Fresh tokens that include the new Admin privileges
    const { access_token, return_user } = roleRes.data;

    const companiesResponse = await axiosInstance.get(
      `/authorization/getCompanyByUserId/${return_user.id}`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const userCompanies: any[] = companiesResponse.data ?? [];
    localStorage.setItem("companies", JSON.stringify(userCompanies));
    const defaultCompany =
      userCompanies.find((c: any) => c.is_default === true) || userCompanies[0];
    if (defaultCompany) {
      localStorage.setItem("active_company", JSON.stringify(defaultCompany));
    }

    login(access_token, return_user);
    sessionStorage.removeItem("registration_token");
    sessionStorage.removeItem("google_user_data");
    router.replace("/home");
  };

  const onWorkspaceTypeContinue = async () => {
    if (workspaceType === "organization") {
      setStep(3);
      return;
    }
    if (workspaceType !== "personal") return;

    const firstName = readGoogleFirstName();
    setIsSubmitting(true);
    try {
      await completeGoogleOnboarding({
        company_name: "My Workspace",
        company_type: "PERSONAL",
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete registration");
      setIsSubmitting(false);
    }
  };

  const onUserSubmit = async (values: UserFormValues) => {
    if (values.accountType === "company") {
      window.history.pushState({ step: 2 }, "", window.location.href);
      setStep(3);
      return;
    }

    // Personal account: auto-generate company details and register immediately
    setIsSubmitting(true);
    setStep(4);

    const formData = new FormData();
    formData.append("first_name", values.first_name);
    formData.append("last_name", values.last_name);
    formData.append("email", email);
    if (values.mobile_number) formData.append("mobile_number", values.mobile_number);
    formData.append("password", values.password);

    formData.append("company_name", `Workspace`);
    formData.append("company_type", "PERSONAL");
    formData.append("registration_token", token);

    if (userProfilePicture) formData.append("userProfilePicture", userProfilePicture);

    try {
      const response = await axiosInstance.post(`${API_URL}/auth/complete`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const { access_token, return_user } = response.data;
      if (access_token && return_user) {
        login(access_token, return_user);

        // Fetch and setup companies in localStorage
        const effectiveUserId = return_user.id;
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
      }

      setTimeout(() => {
        router.replace("/home?welcome=true");
      }, 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete registration");
      setIsSubmitting(false);
      setStep(1); // Go back to form
    }
  };

  const onCompanySubmit = async (values: CompanyFormValues) => {
    setIsSubmitting(true);

    if (isGoogleSignup) {
      const googleAddress = [values.company_address, values.company_address_2, values.company_address_3]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ");

      try {
        await completeGoogleOnboarding(
          {
            company_name: values.company_name,
            company_address: googleAddress || undefined,
          },
          companyProfilePicture
        );
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to complete registration");
        setIsSubmitting(false);
      }
      return;
    }

    const userValues = userForm.getValues();

    const formData = new FormData();
    formData.append("first_name", userValues.first_name);
    formData.append("last_name", userValues.last_name);
    formData.append("email", email);
    if (userValues.mobile_number) formData.append("mobile_number", userValues.mobile_number);
    formData.append("password", userValues.password);

    formData.append("company_name", values.company_name);
    const addressParts = [];
    if (values.company_address) addressParts.push(values.company_address.trim());
    if (values.company_address_2) addressParts.push(values.company_address_2.trim());
    if (values.company_address_3) addressParts.push(values.company_address_3.trim());

    if (addressParts.length > 0) {
      formData.append("company_address", addressParts.join(', '));
    }
    formData.append("registration_token", token);

    if (userProfilePicture) formData.append("userProfilePicture", userProfilePicture);
    if (companyProfilePicture) formData.append("companyProfilePicture", companyProfilePicture);

    try {
      const response = await axiosInstance.post(`${API_URL}/auth/complete`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const { access_token, return_user } = response.data;
      if (access_token && return_user) {
        login(access_token, return_user);

        // Fetch and setup companies in localStorage
        const effectiveUserId = return_user.id;
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
      }

      setTimeout(() => {
        router.replace("/home?welcome=true");
      }, 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to complete registration");
      setIsSubmitting(false); // Go back to form
    }
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
          <div className="flex flex-col items-center text-center mb-8">
            {/* <Image src={Logo} width={48} height={48} alt="synlio" className="mb-6" /> */}
            {/* <h1 className="text-[32px] font-light text-gray-900 tracking-tight leading-tight">
                Complete your profile
              </h1> */}
            {/* <p className="text-sm text-gray-500 mt-2">
                Almost there! Let's get to know you and your company.
              </p> */}

            {/* <div className="flex items-center gap-3 mt-8">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === 1 ? 'bg-[#0073ea]/10 text-[#0073ea]' : 'bg-gray-100 text-gray-400'}`}>
                  <UserCircle className="w-4 h-4" />
                  Your Details
                </div>
                <div className="w-8 h-[2px] bg-gray-200">
                  <div className={`h-full bg-[#0073ea] transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${step === 2 ? 'bg-[#0073ea]/10 text-[#0073ea]' : 'bg-gray-100 text-gray-400'}`}>
                  <Building2 className="w-4 h-4" />
                  Company Details
                </div>
              </div> */}
          </div>

          <div className="relative grid w-full">
            <div className={`col-start-1 row-start-1 transition-opacity duration-300 ${step === 1 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-5 flex flex-col h-full">
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
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          {/* <FormLabel className="mb-2">Profile Picture</FormLabel> */}
                          <div className="relative">
                            <Avatar className="h-24 w-24 rounded-full">
                              <AvatarImage src={userPreviewUrl || undefined} className="object-cover rounded-full" />
                              <AvatarFallback className="text-2xl font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white rounded-full">
                                {getInitials(userForm.watch("first_name"), userForm.watch("last_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              title="Upload image"
                              onClick={() => document.getElementById("user-pic-upload")?.click()}
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
                              autoComplete="off"
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
                              autoComplete="off"
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
                            Mobile <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <PhoneInput
                              defaultCountry="LK"
                              placeholder="77 123 4567"
                              {...field}
                              onChange={(val) => {
                                field.onChange(val);
                                if (!val || /^\+\d{1,4}$/.test(val) || isValidPhoneNumber(val)) {
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
                                    message: "Password must be at least 6 characters long",
                                  });
                                } else {
                                  userForm.clearErrors("password");
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem className="space-y-1 py-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <FormLabel className="text-sm font-medium">What will you use Synlio for?</FormLabel>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  aria-label="Account type information"
                                >
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="start" className="max-w-[290px] p-3 text-left space-y-2.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="p-1 rounded-md text-primary shrink-0">
                                    <UserIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <p className="font-semibold text-foreground">Personal</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      Sets up a default workspace instantly. Edit details anytime later.
                                    </p>
                                  </div>
                                </div>
                                <div className="border-t border-border/50 pt-2 flex items-start gap-2.5">
                                  <div className="p-1 rounded-md text-primary shrink-0">
                                    <BriefcaseBusiness className="w-3.5 h-3.5" strokeWidth={2.5} />
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <p className="font-semibold text-foreground">Company</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                      Configure your own company profile and address in the next step.
                                    </p>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <FormControl>
                            <div className="flex h-9 w-fit items-center gap-1 rounded-md border border-input bg-transparent shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                className="h-full text-sm px-3 gap-2.5 cursor-pointer"
                                variant={field.value === "personal" ? "default" : "ghost"}
                                onClick={() => field.onChange("personal")}
                              >
                                <UserIcon className="w-4 h-4 shrink-0" />
                                Personal
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-full text-sm px-3 gap-2.5 cursor-pointer"
                                variant={field.value === "company" ? "default" : "ghost"}
                                onClick={() => field.onChange("company")}
                              >
                                <BriefcaseBusiness className="w-4 h-4 shrink-0" />
                                Company
                              </Button>
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex">
                    <Button
                      type="submit"
                      className="w-full group"
                      disabled={isSubmitting || !isUserFormValid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Setting up your profile...
                        </>
                      ) : userValues.accountType === "personal" ? (
                        "Complete Profile"
                      ) : (
                        <>
                          Company Details
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>

            {/* Step 2: Workspace type (Google signups) */}
            <div className={`col-start-1 row-start-1 transition-opacity duration-300 ${step === 2 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
              <div className="flex flex-col space-y-1.5 mb-8">
                <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-foreground">
                  How will you use Synlio?
                </h1>
                <p className="text-sm text-slate-500 dark:text-muted-foreground">
                  Choose a workspace type to get started. You can change this later.
                </p>
              </div>

              <div role="radiogroup" aria-label="Workspace type" className="grid grid-cols-1 gap-3 mb-6">
                {[
                  {
                    value: "personal" as const,
                    title: "Personal Workspace",
                    Icon: UserIcon,
                    iconClass: "text-foreground",
                  },
                  {
                    value: "organization" as const,
                    title: "Company",
                    Icon: Building2,
                    iconClass: "text-foreground",
                  },
                ].map(({ value, title, Icon, iconClass }) => {
                  const selected = workspaceType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isSubmitting}
                      onClick={() => setWorkspaceType(value)}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors text-left w-full ${selected
                          ? "border-primary bg-muted/50"
                          : "border-input"
                        }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex flex-col justify-center">
                        <span className="text-sm font-medium text-slate-900 dark:text-foreground">{title}</span>
                      </span>
                      {selected && <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={!workspaceType || isSubmitting}
                onClick={onWorkspaceTypeContinue}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Step 3: Company details */}
            <div className={`col-start-1 row-start-1 transition-opacity duration-300 ${step === 3 ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'}`}>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-5 flex flex-col h-full">
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
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          {/* <FormLabel className="text-sm font-medium text-gray-700">Company Logo</FormLabel> */}
                          <div className="relative">
                            <Avatar className="h-24 w-24 rounded-full">
                              <AvatarImage src={companyPreviewUrl || undefined} className="object-cover rounded-full" />
                              <AvatarFallback className="text-2xl font-semibold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white rounded-full">
                                {getCompanyInitials(companyForm.watch("company_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              title="Upload image"
                              onClick={() => document.getElementById("company-pic-upload")?.click()}
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
                    control={companyForm.control}
                    name="company_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corp"
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
                            Company Address <span className="text-muted-foreground font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Address Line 1" {...field} />
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
                            <Input placeholder="Address Line 2 (Suite, Floor, etc.)" {...field} />
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
                            <Input placeholder="City, State, ZIP Code" {...field} />
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
                      onClick={handleStep2Back}
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isSubmitting || !isCompanyFormValid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        "Complete Profile"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
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
