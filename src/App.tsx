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
import { AuthProvider } from "./contexts/AuthContext";
import AddressManagement from "./pages/AddressManagement";
import AdminPanel from "./pages/AdminPanel";
import ApiKeyManagement from "./pages/ApiKeyManagement";
import AuditLog from "./pages/AuditLog";
import BillingManagement from "./pages/BillingManagement";
import BookingDetail from "./pages/BookingDetail";
import BookingList from "./pages/BookingList";
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

  return <Navigate to={`/partner/${entrySlug}/login`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={withShell(<Dashboard />)} />
            <Route path="/login" element={<Login />} />
            <Route path="/partner/:entrySlug" element={<PartnerLoginRedirect />} />
            <Route path="/partner/:entrySlug/login" element={<Login />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/bookings" element={<Navigate to="/booking-list" replace />} />
            <Route path="/admin" element={<Navigate to="/users" replace />} />
            <Route path="/cost-centers" element={<Navigate to="/" replace />} />
            <Route path="/booking-list" element={withShell(<BookingList />)} />
            <Route
              path="/booking-list/:bookingId"
              element={withShell(<BookingDetail />)}
            />
            <Route path="/bookings/new" element={withShell(<NewBooking />)} />
            <Route path="/passengers" element={withShell(<PassengerManagement />)} />
            <Route path="/addresses" element={withShell(<AddressManagement />)} />
            <Route path="/reports" element={withShell(<ReportManagement />)} />
            <Route path="/api-keys" element={withShell(<ApiKeyManagement />)} />
            <Route path="/webhooks" element={withShell(<WebhookManagement />)} />
            <Route path="/billing" element={withShell(<BillingManagement />)} />
            <Route
              path="/notifications"
              element={withShell(<NotificationSettings />)}
            />
            <Route path="/sla" element={withShell(<SlaManagement />)} />
            <Route path="/users" element={withShell(<AdminPanel />)} />
            <Route path="/audit" element={withShell(<AuditLog />)} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
