"use client";

import { useEffect, useState } from "react";
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
import { Loader2, ArrowRight, ArrowLeft, EyeOff, Eye, Building2, UserCircle, Replace, Camera, User as UserIcon, ShieldCheck, Key, Network, Settings2, Folder, Clock, Ticket } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import Logo from "../../../../public/logo.png";
import { toast } from "sonner";
import axiosInstance from "@/lib/interceptors/axiosInstance";
import { API_URL } from "@/services/api";
import { generatePrefix } from "@/lib/prefix-generator";
import { useAuth } from "@/contexts/auth.context";
import RegistrationMarketing from "@/components/registrationMarketing";

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
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  mobile_number: z
    .string()
    .refine((v) => !v || isValidPhoneNumber(v), {
      message: "Please enter a valid mobile number.",
    })
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  user_profile_picture: z.instanceof(File).optional(),
});

const companySchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  company_code: z.string().min(1, "Company code is required"),
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
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 3 is loading spinner
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [prefixManuallyEdited, setPrefixManuallyEdited] = useState(false);

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
    if (!n) return <Building2 className="w-12 h-12" />;
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
    mode: "onTouched",
  });

  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: "",
      company_code: "",
      company_address: "",
      company_address_2: "",
      company_address_3: "",
    },
    mode: "onTouched",
  });

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
        companyForm.setValue("company_code", generatePrefix(suggestion));
      }
    } catch (err) {
      router.replace("/register");
    }
  }, [router, companyForm]);

  const onUserSubmit = () => {
    setStep(2);
  };

  const onCompanySubmit = async (values: CompanyFormValues) => {
    setStep(3); // Show spinner

    const userValues = userForm.getValues();

    const formData = new FormData();
    formData.append("first_name", userValues.first_name);
    formData.append("last_name", userValues.last_name);
    formData.append("email", email);
    if (userValues.mobile_number) formData.append("mobile_number", userValues.mobile_number);
    formData.append("password", userValues.password);

    formData.append("company_name", values.company_name);
    formData.append("company_code", values.company_code);
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
      setStep(2); // Go back to form
    }
  };

  if (!email) return null;

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row font-sans">
      {/* Form Column (Left) */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-6 lg:p-12 bg-white overflow-y-auto">

        {step === 3 ? (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#0073ea] mb-4" />
            <h2 className="text-2xl font-light text-gray-900 tracking-tight">Setting up your workspace...</h2>
          </div>
        ) : (
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

            <div className={`transition-opacity duration-300 ${step === 1 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <Form {...userForm}>
                <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-5">
                  <div className="flex justify-center mb-8">
                    <FormField
                      control={userForm.control}
                      name="user_profile_picture"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <FormLabel className="text-sm font-medium text-gray-700 mb-2">Profile Picture</FormLabel>
                          <div className="relative">
                            <Avatar className="h-24 w-24 border-2 border-white ring-1 ring-gray-200 shadow-sm rounded-full">
                              <AvatarImage src={userPreviewUrl || undefined} className="object-cover rounded-full" />
                              <AvatarFallback className="text-2xl font-semibold bg-gray-100 text-gray-600 rounded-full">
                                {getInitials(userForm.watch("first_name"), userForm.watch("last_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => document.getElementById("user-pic-upload")?.click()}
                              className="absolute cursor-pointer bottom-0 right-0 p-1.5 ring-2 ring-white bg-[#0073ea] text-white rounded-full shadow-sm hover:bg-[#0060c2] transition-transform active:scale-95"
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={userForm.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 text-sm font-medium">First name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane" className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900" {...field} />
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
                          <FormLabel className="text-gray-700 text-sm font-medium">Last name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900" {...field} />
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
                        <FormLabel className="text-gray-700 text-sm font-medium">
                          Mobile number <span className="text-gray-400 font-normal">(optional)</span>
                        </FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="LK"
                            placeholder="77 123 4567"
                            className="h-11 [&_input]:h-11 [&_input]:rounded-lg [&_input]:border-gray-300 [&_input]:focus-visible:ring-2 [&_input]:focus-visible:ring-[#0073ea]/50 [&_input]:transition-all text-gray-900"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a strong password"
                              className="h-11 pr-10 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900"
                              {...field}
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

                  <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/80 text-white rounded-lg mt-8 group font-medium">
                    Continue to Company
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </form>
              </Form>
            </div>

            <div className={`transition-opacity duration-300 ${step === 2 ? 'block opacity-100' : 'hidden opacity-0'}`}>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-5">
                  <div className="flex justify-center mb-6">
                    <FormField
                      control={companyForm.control}
                      name="company_profile_picture"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                          <FormLabel className="text-sm font-medium text-gray-700">Company Logo</FormLabel>
                          <div className="relative">
                            <Avatar className="h-24 w-24 border-2 border-white ring-1 ring-gray-200 shadow-sm rounded-full">
                              <AvatarImage src={companyPreviewUrl || undefined} className="object-cover rounded-xl" />
                              <AvatarFallback className="text-2xl font-semibold bg-gray-100 text-gray-600 rounded-xl">
                                {getCompanyInitials(companyForm.watch("company_name"))}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              type="button"
                              onClick={() => document.getElementById("company-pic-upload")?.click()}
                              className="absolute cursor-pointer bottom-0 right-0 p-1.5 ring-2 ring-white bg-[#0073ea] text-white rounded-full shadow-sm hover:bg-[#0060c2] transition-transform active:scale-95"
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
                        <FormLabel className="text-gray-700 text-sm font-medium">Company Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Corp"
                            className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (!prefixManuallyEdited) {
                                companyForm.setValue("company_code", generatePrefix(e.target.value), {
                                  shouldValidate: true,
                                });
                              }
                            }}
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
                          <FormLabel className="text-gray-700 text-sm font-medium">
                            Company Address <span className="text-gray-400 font-normal">(optional)</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Address Line 1" className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900" {...field} />
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
                            <Input placeholder="Address Line 2 (Suite, Floor, etc.)" className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900" {...field} />
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
                            <Input placeholder="City, State, ZIP Code" className="h-11 rounded-lg border-gray-300 focus-visible:ring-2 focus-visible:ring-[#0073ea]/50 transition-all text-gray-900" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-11  rounded-lg px-4 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium"
                    >
                      Complete Registration
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        )}
      </div>

      {/* Marketing Column (Right) */}
      <RegistrationMarketing />
    </div>
  );
}
