"use client";

import { useState, useEffect, useCallback } from "react";
import type { Geolocation as GeoType } from "@/types";

interface UseGeolocationReturn {
  position: GeoType | null;
  error: string | null;
  loading: boolean;
  getCurrentPosition: () => void;
}

export function useGeolocation(options?: PositionOptions): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
        ...options,
      }
    );
  }, [options]);

  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  return { position, error, loading, getCurrentPosition };
}

export function useDistanceCalculator(
  userPosition: GeoType | null,
  targetLat: number,
  targetLng: number
): number | null {
  if (!userPosition) return null;

  const R = 6371;
  const dLat = ((targetLat - userPosition.latitude) * Math.PI) / 180;
  const dLng = ((targetLng - userPosition.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userPosition.latitude * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
