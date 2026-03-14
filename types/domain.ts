export type UserRole = "patient" | "pharmacy_owner" | "admin";

export interface AppUser {
  id: string;
  fullName: string;
  phone?: string;
  role: UserRole;
}

export interface Pharmacy {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  isOpenNow: boolean;
}