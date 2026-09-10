"use client";

import * as React from "react";
import {
  Star,
  Phone,
  MessageCircle,
  Navigation,
  Clock,
  Shield,
  Award,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Driver {
  id: string;
  name: string;
  photo?: string;
  rating: number;
  totalDeliveries: number;
  yearsActive: number;
  vehicleType: string;
  vehiclePlate: string;
  verified: boolean;
  specialties?: string[];
}

interface DriverCardProps {
  driver: Driver;
  estimatedArrival?: string;
  distanceKm?: number;
  onCall?: () => void;
  onMessage?: () => void;
  onNavigate?: () => void;
  compact?: boolean;
  className?: string;
}

export function DriverCard({
  driver,
  estimatedArrival,
  distanceKm,
  onCall,
  onMessage,
  onNavigate,
  compact = false,
  className,
}: DriverCardProps) {
  const {
    name,
    photo,
    rating,
    totalDeliveries,
    yearsActive,
    vehicleType,
    vehiclePlate,
    verified,
    specialties,
  } = driver;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border bg-card p-3",
          className
        )}
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {name.charAt(0)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold">{name}</h4>
            {verified && (
              <Shield className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-accent text-accent" />
              <span>{rating.toFixed(1)}</span>
            </div>
            <span>{totalDeliveries} deliveries</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onCall && (
            <button
              onClick={onCall}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-muted"
              aria-label={`Call ${name}`}
            >
              <Phone className="h-4 w-4" />
            </button>
          )}
          {onMessage && (
            <button
              onClick={onMessage}
              className="flex h-8 w-8 items-center justify-center rounded-full border transition-colors hover:bg-muted"
              aria-label={`Message ${name}`}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="h-20 w-20 rounded-2xl object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {name.charAt(0)}
            </div>
          )}

          {verified && (
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-sm">
              <Shield className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-card-foreground">{name}</h3>
            {verified && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                Verified
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-semibold">{rating.toFixed(1)}</span>
            </div>
            <span className="text-muted-foreground">
              {totalDeliveries} deliveries
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{yearsActive} year{yearsActive !== 1 ? "s" : ""} on platform</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-muted/50 p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground">Vehicle</p>
          <p className="mt-0.5 text-sm font-semibold">{vehicleType}</p>
          <p className="text-xs text-muted-foreground">{vehiclePlate}</p>
        </div>

        {estimatedArrival && (
          <div className="rounded-xl bg-primary/5 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground">
              ETA
            </p>
            <p className="mt-0.5 text-sm font-bold text-primary">
              {estimatedArrival}
            </p>
            {distanceKm !== undefined && (
              <p className="text-xs text-muted-foreground">
                {distanceKm.toFixed(1)} km away
              </p>
            )}
          </div>
        )}
      </div>

      {specialties && specialties.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialties.map((specialty) => (
            <span
              key={specialty}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
            >
              <Award className="h-2.5 w-2.5" />
              {specialty}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {onCall && (
          <button
            onClick={onCall}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <Phone className="h-4 w-4" />
            Call
          </button>
        )}

        {onMessage && (
          <button
            onClick={onMessage}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
        )}

        {onNavigate && (
          <button
            onClick={onNavigate}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Navigation className="h-4 w-4" />
            Navigate
          </button>
        )}
      </div>
    </div>
  );
}
