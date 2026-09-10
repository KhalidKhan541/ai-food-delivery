import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { ROUTES } from "@/lib/constants";

export interface AppFooterProps {
  className?: string;
}

function AppFooter({ className }: AppFooterProps) {
  return (
    <footer className={cn("border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900", className)}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <Link href={ROUTES.home} className="flex items-center gap-2">
              <UtensilsCrossed className="h-6 w-6 text-orange-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                AI Food Delivery
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              AI-powered food delivery at your fingertips. Order from your favorite restaurants.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Menu</h3>
            <ul className="mt-3 space-y-2">
              {[
                { href: ROUTES.restaurants, label: "Restaurants" },
                { href: ROUTES.orders, label: "My Orders" },
                { href: "/favorites", label: "Favorites" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-orange-500 dark:text-gray-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Company</h3>
            <ul className="mt-3 space-y-2">
              {["About Us", "Careers", "Blog", "Press"].map((label) => (
                <li key={label}>
                  <span className="text-sm text-gray-500 hover:text-orange-500 dark:text-gray-400 cursor-pointer">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Support</h3>
            <ul className="mt-3 space-y-2">
              {["Help Center", "Safety", "Terms", "Privacy"].map((label) => (
                <li key={label}>
                  <span className="text-sm text-gray-500 hover:text-orange-500 dark:text-gray-400 cursor-pointer">
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} AI Food Delivery. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export { AppFooter };
