import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "@drts/api-client";
import { useNavigate } from "react-router-dom";
import {
  SESSION_STORAGE_KEY,
  createTenantPortalClient,
  createTenantPortalSession,
  toTenantPortalProfile,
  type TenantPortalProfile,
  type TenantPortalSession,
} from "@/lib/drtsApi";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: TenantPortalSession | null;
  profile: TenantPortalProfile | null;
  client: ApiClient | null;
  loading: boolean;
  signIn: (input: {
    email: string;
    fullName?: string;
    roleCode?: string;
  }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStoredSession(): TenantPortalSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return createTenantPortalSession(JSON.parse(raw) as TenantPortalSession);
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantPortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setSession(readStoredSession());
    setLoading(false);
  }, []);

  const client = useMemo(
    () => (session ? createTenantPortalClient(session) : null),
    [session],
  );

  const profile = session ? toTenantPortalProfile(session) : null;
  const user = session
    ? {
        id: session.actorId,
        email: session.email,
      }
    : null;

  const signIn = async (input: {
    email: string;
    fullName?: string;
    roleCode?: string;
  }) => {
    try {
      const nextSession = createTenantPortalSession({
        email: input.email,
        fullName: input.fullName,
        roleCode: input.roleCode,
      });
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(nextSession),
      );
      setSession(nextSession);
      navigate("/");
      return { error: null };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Unable to establish bootstrap tenant session."),
      };
    }
  };

  const signOut = async () => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, client, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
