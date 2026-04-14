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

import LoginPage from "./pages/LoginPage";
import InvitePage from "./pages/InvitePage";
import ProfilePage from "./pages/ProfilePage";
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
        <BrowserRouter>
          <ScrollToTop />
          <CityProvider>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/" element={<Navigate to="/driver" replace />} />

                {/* Driver routes */}
                <Route path="/driver" element={<DriverHomePage />} />
                <Route path="/driver/deliveries" element={<DriverDeliveriesPage />} />
                <Route path="/driver/occurrences" element={<DriverOccurrencesPage />} />
                <Route path="/driver/chat" element={<DriverChatPage />} />
                <Route path="/driver/profile" element={<ProfilePage />} />


                <Route path="/chat" element={<DriverChatPage />} />
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
