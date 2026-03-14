export type PharmacySession = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: {
    id: string;
    email?: string;
  };
  pharmacy?: {
    id: string;
    name: string;
  };
};

const PHARMACY_SESSION_KEY = "medifind_pharmacy_session";

export function getPharmacySession(): PharmacySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(PHARMACY_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PharmacySession;
  } catch {
    window.localStorage.removeItem(PHARMACY_SESSION_KEY);
    return null;
  }
}

export function setPharmacySession(session: PharmacySession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PHARMACY_SESSION_KEY, JSON.stringify(session));
}

export function clearPharmacySession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(PHARMACY_SESSION_KEY);
}