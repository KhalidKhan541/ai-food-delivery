import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FoodAI - Smart Food Delivery",
    template: "%s | FoodAI",
    description:
      "AI-powered food delivery platform that learns your taste preferences and recommends the perfect meals from local restaurants.",
  },
  keywords: [
    "food delivery",
    "AI recommendations",
    "restaurant ordering",
    "smart delivery",
    "food ordering app",
  ],
  authors: [{ name: "FoodAI Team" }],
  creator: "FoodAI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://foodai.com",
    siteName: "FoodAI",
    title: "FoodAI - Smart Food Delivery",
    description:
      "AI-powered food delivery platform that learns your taste preferences and recommends the perfect meals.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FoodAI Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FoodAI - Smart Food Delivery",
    description:
      "AI-powered food delivery platform that learns your taste preferences.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
