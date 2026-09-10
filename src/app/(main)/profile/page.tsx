"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  Mail,
  Phone,
  Edit3,
  Camera,
  Shield,
  Bell,
  ChevronRight,
  LogOut,
  CreditCard,
  MapPin,
  Star,
  Package,
  Settings,
  HelpCircle,
  Moon,
  Globe,
  Vibrate,
} from "lucide-react";

type NotificationSetting = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Sarah Johnson",
    email: "sarah.johnson@email.com",
    phone: "+1 (555) 123-4567",
    avatar: "/images/avatars/default.jpg",
  });
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    { id: "order_updates", label: "Order updates", description: "Get notified about order status", enabled: true },
    { id: "promotions", label: "Promotions", description: "Receive deals and offers", enabled: true },
    { id: "new_restaurants", label: "New restaurants", description: "When new restaurants open nearby", enabled: false },
    { id: "loyalty", label: "Loyalty rewards", description: "Points and tier updates", enabled: true },
  ]);

  const toggleNotification = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const stats = [
    { label: "Orders", value: "127", icon: Package },
    { label: "Favorites", value: "12", icon: Star },
    { label: "Reviews", value: "43", icon: Edit3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-primary to-secondary relative">
            <div className="absolute inset-0 bg-black/20" />
          </div>
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4 flex items-end justify-between">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl border-4 border-white bg-gray-100 overflow-hidden shadow-lg">
                  <Image
                    src={profile.avatar}
                    alt={profile.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                {isEditing ? "Save" : "Edit profile"}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{profile.name}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{profile.email}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 border-t border-gray-100">
            {stats.map((stat) => (
              <div key={stat.label} className="py-4 text-center border-r last:border-r-0 border-gray-100">
                <stat.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <h3 className="px-6 pt-5 pb-2 text-sm font-semibold text-gray-900">Account</h3>
          {[
            { href: "/addresses", icon: MapPin, label: "Delivery addresses", badge: "3" },
            { href: "/payments", icon: CreditCard, label: "Payment methods", badge: "2" },
            { href: "/loyalty", icon: Star, label: "Loyalty & rewards", badge: "Gold" },
            { href: "/favorites", icon: Star, label: "Favorites", badge: "12" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <item.icon className="w-4.5 h-4.5 text-primary" />
                </div>
                <span className="text-sm text-gray-900">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 pt-5 pb-2">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
          </div>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between px-6 py-3.5 border-t border-gray-50 first:border-0"
            >
              <div>
                <p className="text-sm text-gray-900">{notification.label}</p>
                <p className="text-xs text-gray-500">{notification.description}</p>
              </div>
              <button
                onClick={() => toggleNotification(notification.id)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  notification.enabled ? "bg-primary" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    notification.enabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <h3 className="px-6 pt-5 pb-2 text-sm font-semibold text-gray-900">Settings</h3>
          {[
            { icon: Bell, label: "Notifications" },
            { icon: Moon, label: "Dark mode" },
            { icon: Globe, label: "Language" },
            { icon: Shield, label: "Privacy & security" },
            { icon: Vibrate, label: "Haptic feedback" },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors border-t border-gray-50 first:border-0"
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4.5 h-4.5 text-gray-500" />
                <span className="text-sm text-gray-900">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>

        {/* Help & Support */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
          <Link
            href="/help"
            className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-900">Help & support</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        </div>

        {/* Sign Out */}
        <button className="w-full flex items-center justify-center gap-2 py-3 text-destructive hover:bg-destructive/5 rounded-xl text-sm font-medium transition-colors mb-8">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}
