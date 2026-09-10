"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: "🤖",
    title: "AI-Powered Picks",
    description:
      "Our AI learns your taste preferences and recommends meals you'll love, every single time.",
  },
  {
    icon: "⚡",
    title: "Lightning Fast",
    description:
      "Average delivery time of 25 minutes. Track your order in real-time from kitchen to doorstep.",
  },
  {
    icon: "🍽️",
    title: "Top Restaurants",
    description:
      "Partner with 500+ restaurants in your area. From local favorites to premium dining.",
  },
  {
    icon: "🔒",
    title: "Secure Payments",
    description:
      "Multiple payment options with bank-level encryption. Pay with confidence.",
  },
  {
    icon: "📱",
    title: "Easy Ordering",
    description:
      "Reorder your favorites with one tap. Save addresses and payment methods for checkout.",
  },
  {
    icon: "🎁",
    title: "Rewards Program",
    description:
      "Earn points with every order. Redeem for discounts and free deliveries.",
  },
];

const popularItems = [
  {
    id: 1,
    name: "Margherita Pizza",
    restaurant: "Pizza Palace",
    price: 12.99,
    rating: 4.8,
    image: "/placeholder-pizza.jpg",
    deliveryTime: "20-30 min",
  },
  {
    id: 2,
    name: "Chicken Teriyaki Bowl",
    restaurant: "Tokyo Grill",
    price: 14.5,
    rating: 4.9,
    image: "/placeholder-teriyaki.jpg",
    deliveryTime: "25-35 min",
  },
  {
    id: 3,
    name: "Classic Burger",
    restaurant: "Burger Barn",
    price: 11.99,
    rating: 4.7,
    image: "/placeholder-burger.jpg",
    deliveryTime: "15-25 min",
  },
  {
    id: 4,
    name: "Pad Thai Noodles",
    restaurant: "Thai Kitchen",
    price: 13.25,
    rating: 4.8,
    image: "/placeholder-padthai.jpg",
    deliveryTime: "30-40 min",
  },
];

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "Food Enthusiast",
    avatar: "/avatar-sarah.jpg",
    content:
      "FoodAI completely changed how I order food. The AI recommendations are spot-on — it knows my cravings better than I do!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Busy Professional",
    avatar: "/avatar-michael.jpg",
    content:
      "As someone who's always busy, having AI pick my meals saves me so much time. The food is always great and delivery is super fast.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Home Cook",
    avatar: "/avatar-emily.jpg",
    content:
      "I love discovering new restaurants through FoodAI. The personalized recommendations have introduced me to so many amazing local spots.",
    rating: 5,
  },
];

const stats = [
  { value: "500K+", label: "Happy Customers" },
  { value: "500+", label: "Restaurant Partners" },
  { value: "2M+", label: "Orders Delivered" },
  { value: "4.9", label: "App Store Rating" },
];

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [email, setEmail] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${
          isScrolled ? "glass border-b border-border shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="page-container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-white">F</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              Food<span className="text-primary">AI</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#popular"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Popular
            </Link>
            <Link
              href="#testimonials"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Reviews
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">
              Sign In
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="page-container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-slide-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                AI-Powered Food Delivery
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Food you&apos;ll love,{" "}
                <span className="gradient-text">delivered smart</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                Our AI learns your taste preferences and recommends the perfect
                meals from local restaurants. Faster, smarter, tastier.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/register"
                  className="btn-primary px-8 py-4 text-base"
                >
                  Start Ordering
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                <Link href="/login" className="btn-secondary px-8 py-4 text-base">
                  View Demo
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto w-full max-w-lg">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-orange-200/20 blur-3xl"></div>
                <div className="relative rounded-3xl border border-border bg-card p-6 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-xl">🍕</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          AI Recommendation
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Based on your taste
                        </p>
                      </div>
                    </div>
                    <span className="badge-success">98% match</span>
                  </div>
                  <div className="space-y-3">
                    {popularItems.slice(0, 3).map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl border border-border p-3 transition-all hover:border-primary/50 hover:bg-primary/5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg">
                          {i === 0 ? "🍕" : i === 1 ? "🍜" : "🍔"}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.restaurant}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-foreground">
                            ${item.price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="text-amber-500">★</span>
                            {item.rating}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="btn-primary mt-4 w-full">
                    Add All to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="page-container">
          <div className="text-center">
            <h2 className="section-title">
              Why choose <span className="gradient-text">FoodAI</span>?
            </h2>
            <p className="section-subtitle mx-auto mt-4 max-w-2xl">
              We use artificial intelligence to make food ordering smarter, faster,
              and more personalized than ever before.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="card group transition-all hover:shadow-md hover:ring-1 hover:ring-primary/20"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl transition-transform group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Items */}
      <section id="popular" className="py-20">
        <div className="page-container">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="section-title">Popular right now</h2>
              <p className="section-subtitle mt-1">
                Top picks from our AI, loved by thousands
              </p>
            </div>
            <Link
              href="/restaurants"
              className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popularItems.map((item) => (
              <div key={item.id} className="food-card group">
                <div className="food-card-image relative mb-4">
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-orange-100 text-4xl">
                    {item.name.includes("Pizza")
                      ? "🍕"
                      : item.name.includes("Teriyaki")
                      ? "🍜"
                      : item.name.includes("Burger")
                      ? "🍔"
                      : "🥘"}
                  </div>
                  <button className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition-all hover:bg-white hover:text-red-500">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                      />
                    </svg>
                  </button>
                  <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
                    {item.deliveryTime}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {item.restaurant}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">
                      ${item.price.toFixed(2)}
                    </span>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-amber-500">★</span>
                      <span className="font-medium text-foreground">
                        {item.rating}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="btn-primary mt-4 w-full py-2 text-sm">
                  Add to Cart
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/restaurants"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all restaurants →
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="page-container">
          <div className="text-center">
            <h2 className="section-title">Loved by food lovers</h2>
            <p className="section-subtitle mx-auto mt-4 max-w-2xl">
              See what our customers have to say about their FoodAI experience
            </p>
          </div>

          <div className="mt-16 max-w-3xl mx-auto">
            <div className="relative">
              <div className="card text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {testimonials[currentTestimonial].name[0]}
                </div>
                <div className="mb-4 flex justify-center gap-1">
                  {[...Array(testimonials[currentTestimonial].rating)].map(
                    (_, i) => (
                      <span key={i} className="text-xl text-amber-500">
                        ★
                      </span>
                    )
                  )}
                </div>
                <blockquote className="text-lg italic text-foreground">
                  &ldquo;{testimonials[currentTestimonial].content}&rdquo;
                </blockquote>
                <div className="mt-6">
                  <p className="font-semibold text-foreground">
                    {testimonials[currentTestimonial].name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonials[currentTestimonial].role}
                  </p>
                </div>
              </div>

              {/* Dots */}
              <div className="mt-6 flex justify-center gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentTestimonial(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentTestimonial
                        ? "w-6 bg-primary"
                        : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="page-container">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-orange-500 p-12 text-center text-white relative">
            <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
            <div className="relative">
              <h2 className="text-3xl font-bold sm:text-4xl">
                Ready for smarter food delivery?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Join 500,000+ food lovers who trust FoodAI to deliver the perfect
                meal. Get started in seconds.
              </p>

              <form
                onSubmit={handleEmailSubmit}
                className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field flex-1 border-white/20 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/30"
                  required
                />
                <button
                  type="submit"
                  className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-white/90"
                >
                  Get Early Access
                </button>
              </form>

              <p className="mt-4 text-sm text-white/60">
                Free delivery on your first 3 orders. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="page-container">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="text-sm font-bold text-white">F</span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  Food<span className="text-primary">AI</span>
                </span>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                Smart food delivery powered by artificial intelligence.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="mt-3 space-y-2">
                {["About Us", "Careers", "Blog", "Press"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Support</h4>
              <ul className="mt-3 space-y-2">
                {["Help Center", "Safety", "Terms", "Privacy"].map((item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground">Download</h4>
              <div className="mt-3 flex flex-col gap-2">
                <button className="btn-secondary justify-start text-sm">
                  <span className="mr-2">🍎</span>
                  App Store
                </button>
                <button className="btn-secondary justify-start text-sm">
                  <span className="mr-2">▶️</span>
                  Google Play
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © 2026 FoodAI. All rights reserved.
            </p>
            <div className="flex gap-4">
              {["Twitter", "Instagram", "LinkedIn"].map((social) => (
                <Link
                  key={social}
                  href="#"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {social}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
