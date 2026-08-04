import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi, type RegisterRequest } from "../../../api/auth";
import { useAuth } from "../../../context/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/ui/Toast";
import { GoogleLoginButton } from "../components/GoogleLoginButton";

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { show } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const mobileValue = watch("mobile") ?? "";

  function onAuthSuccess(auth: Awaited<ReturnType<typeof authApi.register>>) {
    login(auth);
    show("Account created — welcome to SmartBill", "success");
    navigate("/", { replace: true });
  }

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: onAuthSuccess,
    onError: (err: Error) => setServerError(err.message),
  });

  const googleMutation = useMutation({
    mutationFn: authApi.googleLogin,
    onSuccess: onAuthSuccess,
    onError: (err: Error) => setServerError(err.message),
  });

  return (
    <div className="bg-background min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center gap-2">
        <Icon name="business_center" className="text-primary" size={32} />
        <h1 className="text-headline-lg text-on-surface tracking-tight">SmartBill</h1>
      </div>

      <main className="w-full max-w-md bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-6 md:p-8">
        <header className="mb-6">
          <h2 className="text-headline-md text-on-surface">Create an account</h2>
          <p className="text-body-md text-on-surface-variant mt-1">
            Start managing your GST invoices today.
          </p>
        </header>

        <form onSubmit={handleSubmit((data) => { setServerError(null); mutation.mutate(data); })} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Full Name</label>
            <input
              type="text"
              placeholder="Enter your legal name"
              className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              {...register("name", { required: "Name is required" })}
            />
            {errors.name && <span className="text-[10px] text-error">{errors.name.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && <span className="text-[10px] text-error">{errors.email.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-numeric-table text-on-surface-variant">
                +91
              </span>
              <input
                type="tel"
                placeholder="00000 00000"
                className={`w-full h-12 pl-[52px] pr-4 tabular-nums bg-surface border rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${
                  mobileValue.length === 10 ? "border-secondary" : "border-outline-variant"
                }`}
                {...register("mobile", {
                  required: "Mobile is required",
                  pattern: { value: /^[6-9]\d{9}$/, message: "Enter a valid 10-digit Indian mobile number" },
                })}
              />
            </div>
            <span className={`text-[10px] ${mobileValue.length === 10 ? "text-secondary" : "text-on-surface-variant"}`}>
              {mobileValue.length === 10 ? "Perfect! 10 digits entered." : "10-digit Indian mobile number"}
            </span>
            {errors.mobile && <span className="text-[10px] text-error">{errors.mobile.message}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                {...register("password", {
                  required: "Password is required",
                  minLength: { value: 8, message: "At least 8 characters" },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant">
              {errors.password?.message ?? "At least 8 characters"}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant leading-tight">
              Company name (optional — we'll create one for you if you skip this)
            </label>
            <input
              type="text"
              placeholder="Enter business name"
              className="w-full h-12 px-4 bg-surface border border-outline-variant rounded-lg text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              {...register("companyName")}
            />
          </div>

          {serverError && (
            <p role="alert" className="rounded-lg bg-error-container px-3 py-2 text-body-md text-on-error-container">
              {serverError}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full h-12 bg-primary-container text-on-primary font-semibold text-headline-md rounded-lg shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 mt-2 disabled:opacity-60"
          >
            {mutation.isPending ? "Creating…" : "Create Account"}
          </button>

          <div className="flex items-center gap-4 my-4">
            <div className="h-px bg-outline-variant flex-1" />
            <span className="text-label-md text-on-surface-variant">or</span>
            <div className="h-px bg-outline-variant flex-1" />
          </div>

          <GoogleLoginButton
            onCredential={(idToken) => {
              setServerError(null);
              googleMutation.mutate({ idToken });
            }}
          />
        </form>

        <p className="mt-6 text-label-md text-on-surface-variant text-center">
          By clicking "Create Account", you agree to our{" "}
          <a className="text-primary hover:underline" href="#">Terms of Service</a> and{" "}
          <a className="text-primary hover:underline" href="#">Privacy Policy</a>.
        </p>
      </main>

      <footer className="mt-6">
        <p className="text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </footer>
    </div>
  );
}
