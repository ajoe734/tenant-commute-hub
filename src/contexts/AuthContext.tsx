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
  DEFAULT_TENANT_ID,
  SESSION_STORAGE_KEY,
  createPublicClient,
  createTenantPortalClient,
  normalizeTenantPortalSession,
  toTenantPortalSession,
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
  }) => Promise<{ error: Error | null; session: TenantPortalSession | null }>;
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
    return normalizeTenantPortalSession(
      JSON.parse(raw) as TenantPortalSession,
    );
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
    let active = true;

    const restoreSession = async () => {
      const storedSession = readStoredSession();
      if (!storedSession) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      try {
        const identity = await createTenantPortalClient(
          storedSession,
        ).getIdentityContext();
        if (!active) {
          return;
        }
        setSession({
          ...storedSession,
          identity,
        });
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        if (active) {
          setSession(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const client = useMemo(
    () => (session ? createTenantPortalClient(session) : null),
    [session],
  );

  const profile = session?.profile ?? null;
  const user = session
    ? {
        id: session.profile.id,
        email: session.profile.email,
      }
    : null;

  const signIn = async (input: {
    email: string;
    fullName?: string;
    roleCode?: string;
  }) => {
    try {
      const issuedSession = await createPublicClient().createTenantBootstrapSession({
        email: input.email,
        fullName: input.fullName,
        roleCode: input.roleCode,
        tenantId: DEFAULT_TENANT_ID,
      });
      const nextSession = toTenantPortalSession(issuedSession);
      window.localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(nextSession),
      );
      setSession(nextSession);
      navigate("/");
      return { error: null, session: nextSession };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Unable to establish tenant portal session."),
        session: null,
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
