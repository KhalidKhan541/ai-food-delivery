"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import type { Driver, Geolocation } from "@/types";

export interface DeliveryState {
  activeOrderId: string | null;
  driver: Driver | null;
  driverLocation: Geolocation | null;
  estimatedArrival: Date | null;
  status: "idle" | "searching" | "assigned" | "arriving" | "arrived";
}

type DeliveryAction =
  | { type: "START_DELIVERY"; payload: { orderId: string } }
  | { type: "ASSIGN_DRIVER"; payload: Driver }
  | { type: "UPDATE_DRIVER_LOCATION"; payload: Geolocation }
  | { type: "SET_ETA"; payload: Date }
  | { type: "DRIVER_ARRIVED" }
  | { type: "COMPLETE_DELIVERY" }
  | { type: "CANCEL_DELIVERY" };

const deliveryReducer = (
  state: DeliveryState,
  action: DeliveryAction
): DeliveryState => {
  switch (action.type) {
    case "START_DELIVERY":
      return {
        ...state,
        activeOrderId: action.payload.orderId,
        status: "searching",
      };
    case "ASSIGN_DRIVER":
      return {
        ...state,
        driver: action.payload,
        status: "assigned",
      };
    case "UPDATE_DRIVER_LOCATION":
      return {
        ...state,
        driverLocation: action.payload,
        status: "arriving",
      };
    case "SET_ETA":
      return {
        ...state,
        estimatedArrival: action.payload,
      };
    case "DRIVER_ARRIVED":
      return {
        ...state,
        status: "arrived",
      };
    case "COMPLETE_DELIVERY":
      return {
        ...state,
        activeOrderId: null,
        driver: null,
        driverLocation: null,
        estimatedArrival: null,
        status: "idle",
      };
    case "CANCEL_DELIVERY":
      return {
        ...state,
        activeOrderId: null,
        driver: null,
        driverLocation: null,
        estimatedArrival: null,
        status: "idle",
      };
    default:
      return state;
  }
};

interface DeliveryContextValue extends DeliveryState {
  startDelivery: (orderId: string) => void;
  assignDriver: (driver: Driver) => void;
  updateDriverLocation: (location: Geolocation) => void;
  setETA: (eta: Date) => void;
  driverArrived: () => void;
  completeDelivery: () => void;
  cancelDelivery: () => void;
}

const DeliveryContext = createContext<DeliveryContextValue | null>(null);

export function DeliveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(deliveryReducer, {
    activeOrderId: null,
    driver: null,
    driverLocation: null,
    estimatedArrival: null,
    status: "idle",
  });

  const startDelivery = useCallback(
    (orderId: string) => dispatch({ type: "START_DELIVERY", payload: { orderId } }),
    []
  );

  const assignDriver = useCallback(
    (driver: Driver) => dispatch({ type: "ASSIGN_DRIVER", payload: driver }),
    []
  );

  const updateDriverLocation = useCallback(
    (location: Geolocation) =>
      dispatch({ type: "UPDATE_DRIVER_LOCATION", payload: location }),
    []
  );

  const setETA = useCallback(
    (eta: Date) => dispatch({ type: "SET_ETA", payload: eta }),
    []
  );

  const driverArrived = useCallback(
    () => dispatch({ type: "DRIVER_ARRIVED" }),
    []
  );

  const completeDelivery = useCallback(
    () => dispatch({ type: "COMPLETE_DELIVERY" }),
    []
  );

  const cancelDelivery = useCallback(
    () => dispatch({ type: "CANCEL_DELIVERY" }),
    []
  );

  const value = useMemo(
    () => ({
      ...state,
      startDelivery,
      assignDriver,
      updateDriverLocation,
      setETA,
      driverArrived,
      completeDelivery,
      cancelDelivery,
    }),
    [
      state,
      startDelivery,
      assignDriver,
      updateDriverLocation,
      setETA,
      driverArrived,
      completeDelivery,
      cancelDelivery,
    ]
  );

  return (
    <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>
  );
}

export function useDeliveryStore() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDeliveryStore must be used within a DeliveryProvider");
  }
  return context;
}
