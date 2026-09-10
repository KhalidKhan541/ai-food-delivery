"use client";

import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode } from "react";
import type { User } from "@/types";

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

type UserAction =
  | { type: "SET_USER"; payload: User }
  | { type: "CLEAR_USER" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "UPDATE_USER"; payload: Partial<User> };

const userReducer = (state: UserState, action: UserAction): UserState => {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload, isLoading: false, error: null };
    case "CLEAR_USER":
      return { user: null, isLoading: false, error: null };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };
    case "UPDATE_USER":
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

interface UserContextValue extends UserState {
  setUser: (user: User) => void;
  clearUser: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, {
    user: null,
    isLoading: true,
    error: null,
  });

  const setUser = useCallback(
    (user: User) => dispatch({ type: "SET_USER", payload: user }),
    []
  );

  const clearUser = useCallback(() => dispatch({ type: "CLEAR_USER" }), []);

  const updateUser = useCallback(
    (updates: Partial<User>) => dispatch({ type: "UPDATE_USER", payload: updates }),
    []
  );

  const setLoading = useCallback(
    (loading: boolean) => dispatch({ type: "SET_LOADING", payload: loading }),
    []
  );

  const setError = useCallback(
    (error: string | null) => dispatch({ type: "SET_ERROR", payload: error }),
    []
  );

  const value = useMemo(
    () => ({ ...state, setUser, clearUser, updateUser, setLoading, setError }),
    [state, setUser, clearUser, updateUser, setLoading, setError]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUserStore() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserStore must be used within a UserProvider");
  }
  return context;
}
