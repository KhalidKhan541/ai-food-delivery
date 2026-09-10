"use client";

import { useState } from "react";
import Link from "next/link";

const dietaryOptions = [
  { id: "none", label: "No restrictions", icon: "🍽️" },
  { id: "vegetarian", label: "Vegetarian", icon: "🥬" },
  { id: "vegan", label: "Vegan", icon: "🌱" },
  { id: "gluten-free", label: "Gluten-free", icon: "🌾" },
  { id: "halal", label: "Halal", icon: "🍖" },
  { id: "kosher", label: "Kosher", icon: "✡️" },
  { id: "keto", label: "Keto", icon: "🥑" },
  { id: "dairy-free", label: "Dairy-free", icon: "🥛" },
];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const toggleDietary = (id: string) => {
    setSelectedDietary((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      window.location.href = "/(main)";
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = (provider: string) => {
    setIsLoading(true);
    setTimeout(() => {
      window.location.href = "/(main)";
    }, 1000);
  };

  const getPasswordStrength = (pwd: string): { label: string; color: string; width: string } => {
    if (pwd.length === 0) return { label: "", color: "bg-muted", width: "w-0" };
    if (pwd.length < 6) return { label: "Weak", color: "bg-destructive", width: "w-1/4" };
    if (pwd.length < 10) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd))
      return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
    return { label: "Good", color: "bg-primary", width: "w-3/4" };
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {step === 1 ? "Create your account" : "Personalize your experience"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === 1
            ? "Join FoodAI and start ordering smarter today"
            : "Tell us about your food preferences so our AI can recommend the best meals for you"}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8 flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            step >= 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          1
        </div>
        <div
          className={`h-0.5 flex-1 transition-colors ${
            step >= 2 ? "bg-primary" : "bg-muted"
          }`}
        ></div>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
            step >= 2 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
          }`}
        >
          2
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive animate-fade-in">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {error}
          </div>
        </div>
      )}

      {step === 1 ? (
        <>
          {/* Social Register */}
          <div className="mb-6 space-y-3">
            <button
              onClick={() => handleSocialRegister("google")}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">
                or continue with email
              </span>
            </div>
          </div>

          {/* Form Step 1 */}
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field mt-1.5"
                required
                autoComplete="name"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field mt-1.5"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  required
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Password strength</span>
                    <span
                      className={`font-medium ${
                        passwordStrength.label === "Strong"
                          ? "text-emerald-500"
                          : passwordStrength.label === "Good"
                          ? "text-primary"
                          : passwordStrength.label === "Fair"
                          ? "text-amber-500"
                          : "text-destructive"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full transition-all ${passwordStrength.color} ${passwordStrength.width}`}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary w-full py-3">
              Continue
            </button>
          </form>
        </>
      ) : (
        /* Step 2 - Dietary Preferences */
        <form onSubmit={handleStep2} className="space-y-6">
          <div>
            <label htmlFor="phone" className="label">
              Phone number{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field mt-1.5"
              autoComplete="tel"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="label mb-3 block">
              Dietary preferences{" "}
              <span className="text-muted-foreground">(select all that apply)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {dietaryOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleDietary(option.id)}
                  className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                    selectedDietary.includes(option.id)
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-xl">{option.icon}</span>
                  <span className="text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Our AI uses these preferences to personalize your food recommendations.
              You can change these anytime.
            </p>
          </div>

          <div>
            <label className="label mb-3 block">
              Favorite cuisines{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                "Italian",
                "Japanese",
                "Mexican",
                "Indian",
                "Chinese",
                "Thai",
                "Mediterranean",
                "American",
                "Korean",
                "Vietnamese",
              ].map((cuisine) => (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => {
                    setSelectedDietary((prev) =>
                      prev.includes(cuisine)
                        ? prev.filter((c) => c !== cuisine)
                        : [...prev, cuisine]
                    );
                  }}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                    selectedDietary.includes(cuisine)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground">
              I agree to the{" "}
              <Link href="#" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || !agreedToTerms}
              className="btn-primary flex-1 py-3"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
