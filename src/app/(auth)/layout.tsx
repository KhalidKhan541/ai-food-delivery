import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Sign in or create your FoodAI account",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary to-orange-500 lg:block">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <span className="text-xl font-bold">F</span>
            </div>
            <span className="text-2xl font-bold">
              Food<span className="text-white/80">AI</span>
            </span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight">
              Smarter food delivery, powered by AI
            </h1>
            <p className="mt-4 text-lg text-white/80">
              Join 500,000+ food lovers who trust FoodAI to deliver the perfect
              meal. Our AI learns your preferences and recommends dishes
              you&apos;ll love.
            </p>

            <div className="mt-8 space-y-4">
              {[
                "AI-powered meal recommendations",
                "Real-time order tracking",
                "500+ restaurant partners",
                "Free delivery on first 3 orders",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-white/90">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-white/60">
            © 2026 FoodAI. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full flex-col lg:w-1/2">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">F</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              Food<span className="text-primary">AI</span>
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
