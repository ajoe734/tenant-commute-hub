import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BookingList from "./pages/BookingList";
import NewBooking from "./pages/NewBooking";
import DashboardLayout from "./components/DashboardLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/bookings" element={<DashboardLayout><BookingList /></DashboardLayout>} />
          <Route path="/bookings/new" element={<DashboardLayout><NewBooking /></DashboardLayout>} />
          <Route path="/passengers" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/reports" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/api-keys" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/billing" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/notifications" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/admin" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          <Route path="/audit" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
