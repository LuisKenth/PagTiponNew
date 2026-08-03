"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import { useStaffAttendanceDashboard } from "../hooks/useStaffAttendanceDashboard";

type StaffAttendanceDashboardValue =
  ReturnType<typeof useStaffAttendanceDashboard>;

const StaffAttendanceContext =
  createContext<StaffAttendanceDashboardValue | null>(
    null
  );

type StaffAttendanceProviderProps = {
  children: ReactNode;
};

export function StaffAttendanceProvider({
  children,
}: StaffAttendanceProviderProps) {
  const dashboard =
    useStaffAttendanceDashboard();

  return (
    <StaffAttendanceContext.Provider
      value={dashboard}
    >
      {children}
    </StaffAttendanceContext.Provider>
  );
}

export function useStaffAttendanceContext() {
  const context = useContext(
    StaffAttendanceContext
  );

  if (!context) {
    throw new Error(
      "useStaffAttendanceContext must be used inside StaffAttendanceProvider."
    );
  }

  return context;
}