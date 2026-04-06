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
import NotFound from "./pages/NotFound";
import DriverHomePage from "./pages/driver/DriverHomePage";
import BusinessHomePage from "./pages/business/BusinessHomePage";

import ChatPage from "./pages/ChatPage";

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
                <Route path="/" element={<Navigate to="/admin" replace />} />

                <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
                <Route path="/admin/deliveries" element={<ProtectedRoute requiredRole="admin"><DeliveriesPage /></ProtectedRoute>} />
                <Route path="/admin/chat" element={<ProtectedRoute requiredRole="admin"><ChatPage /></ProtectedRoute>} />
                <Route path="/admin/map" element={<ProtectedRoute requiredRole="admin"><MapPage /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UsersPage /></ProtectedRoute>} />
                <Route path="/admin/companies" element={<ProtectedRoute requiredRole="admin"><CompaniesPage /></ProtectedRoute>} />
                <Route path="/admin/drivers" element={<ProtectedRoute requiredRole="admin"><DriversPage /></ProtectedRoute>} />
                <Route path="/admin/regions" element={<ProtectedRoute requiredRole="admin"><RegionsPage /></ProtectedRoute>} />
                <Route path="/admin/occurrences" element={<ProtectedRoute requiredRole="admin"><OccurrencesPage /></ProtectedRoute>} />
                <Route path="/admin/reviews" element={<ProtectedRoute requiredRole="admin"><ReviewsPage /></ProtectedRoute>} />
                <Route path="/admin/reports" element={<ProtectedRoute requiredRole="admin"><ReportsPage /></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />
                <Route path="/admin/profile" element={<ProtectedRoute requiredRole="admin"><ProfilePage /></ProtectedRoute>} />

                <Route path="/driver" element={<ProtectedRoute requiredRole="driver"><DriverHomePage /></ProtectedRoute>} />
                <Route path="/business" element={<ProtectedRoute requiredRole="company"><BusinessHomePage /></ProtectedRoute>} />

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
