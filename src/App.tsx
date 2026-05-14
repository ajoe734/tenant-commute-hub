import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AddressManagement from "./pages/AddressManagement";
import AdminPanel from "./pages/AdminPanel";
import ApiKeyManagement from "./pages/ApiKeyManagement";
import AuditLog from "./pages/AuditLog";
import BillingManagement from "./pages/BillingManagement";
import BookingDetail from "./pages/BookingDetail";
import BookingList from "./pages/BookingList";
import CostCenters from "./pages/CostCenters";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import NewBooking from "./pages/NewBooking";
import NotFound from "./pages/NotFound";
import NotificationSettings from "./pages/NotificationSettings";
import PassengerManagement from "./pages/PassengerManagement";
import ReportManagement from "./pages/ReportManagement";
import SlaManagement from "./pages/SlaManagement";
import WebhookManagement from "./pages/WebhookManagement";

const queryClient = new QueryClient();

function withShell(element: JSX.Element) {
  return (
    <ProtectedRoute>
      <DashboardLayout>{element}</DashboardLayout>
    </ProtectedRoute>
  );
}

function PartnerLoginRedirect() {
  const { entrySlug } = useParams();
  if (!entrySlug) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={`/partner/${entrySlug}/bookings/new`} replace />;
}

function PartnerAwareHome() {
  const { isPartnerMode, partnerHomePath } = useAuth();
  if (isPartnerMode) {
    return <Navigate to={partnerHomePath} replace />;
  }

  return <Dashboard />;
}

function PartnerShellOnly({ element }: { element: JSX.Element }) {
  const { isPartnerMode, partnerHomePath } = useAuth();
  if (isPartnerMode) {
    return <Navigate to={partnerHomePath} replace />;
  }

  return element;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={withShell(<PartnerAwareHome />)} />
            <Route path="/login" element={<Login />} />
            <Route path="/partner/:entrySlug" element={<PartnerLoginRedirect />} />
            <Route path="/partner/:entrySlug/login" element={<Login />} />
            <Route
              path="/partner/:entrySlug/bookings/new"
              element={withShell(<NewBooking />)}
            />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/bookings" element={<Navigate to="/booking-list" replace />} />
            <Route path="/admin" element={<Navigate to="/users" replace />} />
            <Route
              path="/cost-centers"
              element={withShell(<PartnerShellOnly element={<CostCenters />} />)}
            />
            <Route
              path="/booking-list"
              element={withShell(<PartnerShellOnly element={<BookingList />} />)}
            />
            <Route
              path="/booking-list/:bookingId"
              element={withShell(<PartnerShellOnly element={<BookingDetail />} />)}
            />
            <Route path="/bookings/new" element={withShell(<NewBooking />)} />
            <Route
              path="/passengers"
              element={withShell(<PartnerShellOnly element={<PassengerManagement />} />)}
            />
            <Route
              path="/addresses"
              element={withShell(<PartnerShellOnly element={<AddressManagement />} />)}
            />
            <Route
              path="/reports"
              element={withShell(<PartnerShellOnly element={<ReportManagement />} />)}
            />
            <Route
              path="/api-keys"
              element={withShell(<PartnerShellOnly element={<ApiKeyManagement />} />)}
            />
            <Route
              path="/webhooks"
              element={withShell(<PartnerShellOnly element={<WebhookManagement />} />)}
            />
            <Route
              path="/billing"
              element={withShell(<PartnerShellOnly element={<BillingManagement />} />)}
            />
            <Route
              path="/notifications"
              element={withShell(<PartnerShellOnly element={<NotificationSettings />} />)}
            />
            <Route
              path="/sla"
              element={withShell(<PartnerShellOnly element={<SlaManagement />} />)}
            />
            <Route
              path="/users"
              element={withShell(<PartnerShellOnly element={<AdminPanel />} />)}
            />
            <Route
              path="/audit"
              element={withShell(<PartnerShellOnly element={<AuditLog />} />)}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
