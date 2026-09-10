"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  UtensilsCrossed,
  ShoppingCart,
  ClipboardList,
  User,
  Settings,
  Star,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ROUTES } from "@/lib/constants";

export interface AppSidebarProps {
  className?: string;
}

const sidebarLinks = [
  { href: ROUTES.home, label: "Home", icon: Home },
  { href: ROUTES.restaurants, label: "Restaurants", icon: UtensilsCrossed },
  { href: ROUTES.cart, label: "Cart", icon: ShoppingCart },
  { href: ROUTES.orders, label: "Orders", icon: ClipboardList },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: ROUTES.profile, label: "Profile", icon: User },
  { href: ROUTES.settings, label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
];

function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden w-64 border-r border-gray-200 bg-white lg:block dark:border-gray-700 dark:bg-gray-900",
        className
      )}
    >
      <div className="flex h-full flex-col py-6">
        <nav className="flex-1 space-y-1 px-3">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-orange-500")} />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export { AppSidebar };
