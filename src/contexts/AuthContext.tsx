import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "@drts/api-client";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_TENANT_ID,
  createPublicClient,
  createTenantPortalClient,
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
  }) => Promise<{ error: Error | null; session: TenantPortalSession | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantPortalSession | null>(null);
  const navigate = useNavigate();

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

  const signIn = async (input: { email: string }) => {
    try {
      const issuedSession =
        await createPublicClient().createTenantBootstrapSession({
          email: input.email,
          tenantId: DEFAULT_TENANT_ID,
        });
      const nextSession = toTenantPortalSession(issuedSession);
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
    setSession(null);
    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        client,
        loading: false,
        signIn,
        signOut,
      }}
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
