"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import { generateId } from "@/lib/utils";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  duration?: number;
  read: boolean;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
}

type NotificationAction =
  | { type: "ADD_NOTIFICATION"; payload: Omit<Notification, "id" | "read" | "createdAt"> }
  | { type: "REMOVE_NOTIFICATION"; payload: { id: string } }
  | { type: "MARK_AS_READ"; payload: { id: string } }
  | { type: "MARK_ALL_AS_READ" }
  | { type: "CLEAR_ALL" };

const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case "ADD_NOTIFICATION": {
      const newNotification: Notification = {
        ...action.payload,
        id: generateId(),
        read: false,
        createdAt: new Date(),
      };
      return {
        notifications: [newNotification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }
    case "REMOVE_NOTIFICATION":
      return {
        notifications: state.notifications.filter(
          (n) => n.id !== action.payload.id
        ),
        unreadCount: state.notifications.find((n) => n.id === action.payload.id && !n.read)
          ? state.unreadCount - 1
          : state.unreadCount,
      };
    case "MARK_AS_READ":
      return {
        notifications: state.notifications.map((n) =>
          n.id === action.payload.id ? { ...n, read: true } : n
        ),
        unreadCount: state.notifications.find(
          (n) => n.id === action.payload.id && !n.read
        )
          ? state.unreadCount - 1
          : state.unreadCount,
      };
    case "MARK_ALL_AS_READ":
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    case "CLEAR_ALL":
      return { notifications: [], unreadCount: 0 };
    default:
      return state;
  }
};

interface NotificationContextValue extends NotificationState {
  addNotification: (
    notification: Omit<Notification, "id" | "read" | "createdAt">
  ) => void;
  removeNotification: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    unreadCount: 0,
  });

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "read" | "createdAt">) =>
      dispatch({ type: "ADD_NOTIFICATION", payload: notification }),
    []
  );

  const removeNotification = useCallback(
    (id: string) => dispatch({ type: "REMOVE_NOTIFICATION", payload: { id } }),
    []
  );

  const markAsRead = useCallback(
    (id: string) => dispatch({ type: "MARK_AS_READ", payload: { id } }),
    []
  );

  const markAllAsRead = useCallback(
    () => dispatch({ type: "MARK_ALL_AS_READ" }),
    []
  );

  const clearAll = useCallback(() => dispatch({ type: "CLEAR_ALL" }), []);

  const value = useMemo(
    () => ({
      ...state,
      addNotification,
      removeNotification,
      markAsRead,
      markAllAsRead,
      clearAll,
    }),
    [state, addNotification, removeNotification, markAsRead, markAllAsRead, clearAll]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationStore() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationStore must be used within a NotificationProvider");
  }
  return context;
}
