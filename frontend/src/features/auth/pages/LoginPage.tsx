import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi, type LoginRequest } from "../../../api/auth";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

type Tab = "password" | "otp";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [tab, setTab] = useState<Tab>("password");
  const [serverError, setServerError] = useState<string | null>(null);
  const [otpStep, setOtpStep] = useState<"mobile" | "code">("mobile");
  const [otpMobile, setOtpMobile] = useState("");

  const passwordForm = useForm<LoginRequest>();
  const otpMobileForm = useForm<{ mobile: string }>();
  const otpCodeForm = useForm<{ otp: string }>();

  function onAuthSuccess(auth: Awaited<ReturnType<typeof authApi.login>>) {
    login(auth);
    show(`Welcome back, ${auth.name.split(" ")[0]}`, "success");
    navigate("/", { replace: true });
  }

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: onAuthSuccess,
    onError: (err: Error) => setServerError(err.message),
  });

  const googleMutation = useMutation({
    mutationFn: authApi.googleLogin,
    onSuccess: onAuthSuccess,
    onError: (err: Error) => setServerError(err.message),
  });

  const sendOtpMutation = useMutation({
    mutationFn: authApi.sendOtp,
    onSuccess: (_, variables) => {
      setOtpMobile(variables.mobile);
      setOtpStep("code");
      show("OTP sent to your mobile", "success");
    },
    onError: (err: Error) => setServerError(err.message),
  });

  const verifyOtpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: onAuthSuccess,
    onError: (err: Error) => setServerError(err.message),
  });

  function switchTab(next: Tab) {
    setServerError(null);
    setTab(next);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[900px] flex flex-col items-center">
        {/* Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <h1 className="text-headline-lg text-primary tracking-tight">SmartBill</h1>
          <p className="text-body-md text-on-surface-variant">GST-Compliant Cloud Accounting</p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest rounded-xl w-full flex overflow-hidden min-h-[520px] border border-slate-200 shadow-sm">
          {/* Left panel — desktop only */}
          <div className="hidden md:flex w-5/12 bg-primary-container p-8 flex-col justify-between relative overflow-hidden">
            <div className="z-10">
              <h2 className="text-headline-md text-on-primary-container mb-2">Secure Portal</h2>
              <p className="text-body-md text-on-primary-container opacity-90 leading-relaxed">
                Access your GST dashboards, inventory management, and automated tax filing
                tools in one secure location.
              </p>
            </div>
            <div className="z-10 mt-auto">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="verified_user" className="text-on-primary-container opacity-80" />
                <span className="text-label-md text-on-primary-container">ISO 27001 Certified</span>
              </div>
              <div className="flex items-center gap-2">
                <Icon name="encrypted" className="text-on-primary-container opacity-80" />
                <span className="text-label-md text-on-primary-container">256-bit AES Encryption</span>
              </div>
            </div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary opacity-20 rounded-full blur-3xl" />
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-on-primary-container opacity-10 rounded-full blur-2xl" />
          </div>

          {/* Right panel — form */}
          <div className="w-full md:w-7/12 p-8 flex flex-col">
            <div className="flex border-b border-outline-variant mb-6">
              <button
                onClick={() => switchTab("password")}
                className={`flex-1 py-4 text-center text-label-md transition-colors hover:bg-surface-container-low ${
                  tab === "password"
                    ? "border-b-2 border-primary text-primary font-semibold"
                    : "border-b-2 border-transparent text-on-surface-variant"
                }`}
              >
                Password
              </button>
              <button
                onClick={() => switchTab("otp")}
                className={`flex-1 py-4 text-center text-label-md transition-colors hover:bg-surface-container-low ${
                  tab === "otp"
                    ? "border-b-2 border-primary text-primary font-semibold"
                    : "border-b-2 border-transparent text-on-surface-variant"
                }`}
              >
                Mobile OTP
              </button>
            </div>

            {serverError && (
              <p role="alert" className="mb-4 rounded-lg bg-error-container px-3 py-2 text-body-md text-on-error-container">
                {serverError}
              </p>
            )}

            {tab === "password" ? (
              <form
                className="flex-1 flex flex-col"
                onSubmit={passwordForm.handleSubmit((data) => {
                  setServerError(null);
                  loginMutation.mutate(data);
                })}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Email Address</label>
                    <input
                      type="email"
                      placeholder="name@company.com"
                      className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all text-body-md text-on-surface"
                      {...passwordForm.register("email", { required: "Email is required" })}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-label-md text-on-surface-variant">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all text-body-md text-on-surface"
                      {...passwordForm.register("password", { required: "Password is required" })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-primary text-on-primary py-3 px-8 rounded-lg text-headline-md active:scale-[0.98] transition-all shadow-sm hover:shadow-md disabled:opacity-60"
                >
                  {loginMutation.isPending ? "Logging in…" : "Log in"}
                </button>

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-outline-variant" />
                  <span className="text-label-md text-on-surface-variant">or</span>
                  <div className="flex-1 h-px bg-outline-variant" />
                </div>

                <GoogleLoginButton
                  onCredential={(idToken) => {
                    setServerError(null);
                    googleMutation.mutate({ idToken });
                  }}
                />
              </form>
            ) : (
              <div className="flex-1 flex flex-col">
                {otpStep === "mobile" ? (
                  <form
                    onSubmit={otpMobileForm.handleSubmit((data) => {
                      setServerError(null);
                      sendOtpMutation.mutate(data);
                    })}
                  >
                    <div className="mb-6">
                      <div className="flex flex-col gap-1">
                        <label className="text-label-md text-on-surface-variant">Mobile Number</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md">
                            +91
                          </span>
                          <input
                            type="tel"
                            placeholder="99999 99999"
                            className="w-full pl-[52px] pr-4 py-2 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all text-body-md text-on-surface"
                            {...otpMobileForm.register("mobile", {
                              required: "Mobile is required",
                              pattern: { value: MOBILE_PATTERN, message: "Enter a valid 10-digit Indian mobile number" },
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={sendOtpMutation.isPending}
                      className="w-full bg-primary text-on-primary py-3 px-8 rounded-lg text-headline-md active:scale-[0.98] transition-all shadow-sm mb-6 disabled:opacity-60"
                    >
                      {sendOtpMutation.isPending ? "Sending…" : "Get OTP"}
                    </button>
                    <p className="text-body-md text-center text-on-surface-variant">
                      Secure code will be sent to your registered mobile number.
                    </p>
                  </form>
                ) : (
                  <form
                    onSubmit={otpCodeForm.handleSubmit((data) => {
                      setServerError(null);
                      verifyOtpMutation.mutate({ mobile: otpMobile, otp: data.otp });
                    })}
                  >
                    <div className="mb-6 flex flex-col gap-1">
                      <label className="text-label-md text-on-surface-variant">
                        6-digit code sent to +91 {otpMobile}
                      </label>
                      <input
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        className="w-full px-4 py-2 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container focus:border-primary transition-all text-body-md text-on-surface"
                        {...otpCodeForm.register("otp", { required: "OTP is required" })}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={verifyOtpMutation.isPending}
                      className="w-full bg-primary text-on-primary py-3 px-8 rounded-lg text-headline-md active:scale-[0.98] transition-all shadow-sm mb-3 disabled:opacity-60"
                    >
                      {verifyOtpMutation.isPending ? "Verifying…" : "Verify & log in"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOtpStep("mobile")}
                      className="w-full text-body-md text-on-surface-variant hover:underline"
                    >
                      Use a different number
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="mt-auto pt-8 border-t border-outline-variant flex justify-between items-center">
              <p className="text-body-md text-on-surface-variant">New to SmartBill?</p>
              <Link
                to="/register"
                className="text-label-md text-primary border border-primary px-6 py-2 rounded-lg hover:bg-surface-container-low transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-8 opacity-60">
          <div className="flex items-center gap-2">
            <Icon name="support_agent" size={18} />
            <span className="text-label-md">Support: 1800-TAX-HELP</span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="public" size={18} />
            <span className="text-label-md">Compliance Status: Stable</span>
          </div>
        </div>
      </div>
    </div>
  );
}
