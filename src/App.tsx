import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CityProvider } from "@/contexts/CityContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import ScrollToTop from "@/components/shared/ScrollToTop";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SoundEnabler } from "@/components/shared/SoundEnabler";

import LoginPage from "./pages/LoginPage";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";
import DriverChatPage from "./pages/driver/DriverChatPage";
import DriverHomePage from "./pages/driver/DriverHomePage";
import DriverDeliveriesPage from "./pages/driver/DriverDeliveriesPage";
import DriverOccurrencesPage from "./pages/driver/DriverOccurrencesPage";

const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SoundEnabler />
        <BrowserRouter>
          <ScrollToTop />
          <CityProvider>
            <AuthProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/invite/:token" element={<InvitePage />} />
                  <Route path="/terms" element={<LegalPage />} />
                  <Route path="/privacy" element={<LegalPage />} />
                  <Route path="/" element={<Navigate to="/driver" replace />} />

                  {/* Driver routes */}
                  <Route path="/driver" element={
                    <ProtectedRoute requiredRole="driver">
                      <DriverHomePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/driver/deliveries" element={
                    <ProtectedRoute requiredRole="driver">
                      <DriverDeliveriesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/driver/occurrences" element={
                    <ProtectedRoute requiredRole="driver">
                      <DriverOccurrencesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/driver/profile" element={
                    <ProtectedRoute requiredRole="driver">
                      <ProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/driver/chat" element={
                    <ProtectedRoute requiredRole="driver">
                      <DriverChatPage />
                    </ProtectedRoute>
                  } />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </AuthProvider>
          </CityProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
