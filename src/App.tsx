import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import LoginPage from "./pages/LoginPage";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
import DashboardPage from "./pages/DashboardPage";
import DeliveriesPage from "./pages/DeliveriesPage";
import MapPage from "./pages/MapPage";
import UsersPage from "./pages/UsersPage";
import CompaniesPage from "./pages/CompaniesPage";
import DriversPage from "./pages/DriversPage";
import RegionsPage from "./pages/RegionsPage";
import OccurrencesPage from "./pages/OccurrencesPage";
import ReviewsPage from "./pages/ReviewsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import SystemLogsPage from "./pages/SystemLogsPage";
import NotFound from "./pages/NotFound";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import DriverHomePage from "./pages/driver/DriverHomePage";
import DriverDeliveriesPage from "./pages/driver/DriverDeliveriesPage";
import DriverOccurrencesPage from "./pages/driver/DriverOccurrencesPage";
import BusinessHomePage from "./pages/business/BusinessHomePage";

// import ChatPage from "./pages/ChatPage";

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <CityProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/" element={<Navigate to="/driver" replace />} />

                <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverHomePage /></ProtectedRoute>} />
                <Route path="/driver/deliveries" element={<ProtectedRoute requiredRole="driver"><DriverDeliveriesPage /></ProtectedRoute>} />
                <Route path="/driver/occurrences" element={<ProtectedRoute requiredRole="driver"><DriverOccurrencesPage /></ProtectedRoute>} />
                <Route path="/driver/profile" element={<ProtectedRoute requiredRole="driver"><ProfilePage /></ProtectedRoute>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </CityProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
