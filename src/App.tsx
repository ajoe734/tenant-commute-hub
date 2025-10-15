import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BookingList from "./pages/BookingList";
import NewBooking from "./pages/NewBooking";
import PassengerManagement from "./pages/PassengerManagement";
import CostCenterManagement from "./pages/CostCenterManagement";
import ReportManagement from "./pages/ReportManagement";
import ApiKeyManagement from "./pages/ApiKeyManagement";
import BillingManagement from "./pages/BillingManagement";
import NotificationSettings from "./pages/NotificationSettings";
import AdminPanel from "./pages/AdminPanel";
import AuditLog from "./pages/AuditLog";
import AddressManagement from "./pages/AddressManagement";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BookingList />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/new"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NewBooking />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/passengers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <PassengerManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/cost-centers"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <CostCenterManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ReportManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/api-keys"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ApiKeyManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <BillingManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <NotificationSettings />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AdminPanel />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AuditLog />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/addresses"
              element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <AddressManagement />
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
