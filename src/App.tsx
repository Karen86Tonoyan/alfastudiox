import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "./components/layout/AppLayout";
import RenderPage from "./pages/RenderPage";
import WorkflowPage from "./pages/WorkflowPage";
import ModelsPage from "./pages/ModelsPage";
import MonitorPage from "./pages/MonitorPage";
import HistoryPage from "./pages/HistoryPage";
import GalleryPage from "./pages/GalleryPage";
import OrchestratorPage from "./pages/OrchestratorPage";
import ErrorsPage from "./pages/ErrorsPage";
import ProvidersPage from "./pages/ProvidersPage";
import TIPAuditorPage from "./pages/TIPAuditorPage";
import StudioPage from "./pages/StudioPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import BuyCreditsPage from "./pages/BuyCreditsPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ApiKeysGuidePage from "./pages/ApiKeysGuidePage";
import IdeasPage from "./pages/IdeasPage";
import LibraryPage from "./pages/LibraryPage";
import MoviePipelinePage from "./pages/MoviePipelinePage";
import PromptMemoryPage from "./pages/PromptMemoryPage";
import AutomationPage from "./pages/AutomationPage";
import SubscribePage from "./pages/SubscribePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const basename = import.meta.env.VITE_BASE_PATH || "/";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={basename}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route path="/" element={<StudioPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/render" element={<RenderPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/orchestrator" element={<OrchestratorPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/errors" element={<ErrorsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/tip-auditor" element={<TIPAuditorPage />} />
            <Route path="/buy-credits" element={<BuyCreditsPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/api-keys-guide" element={<ApiKeysGuidePage />} />
            <Route path="/ideas" element={<IdeasPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/movie-pipeline" element={<MoviePipelinePage />} />
            <Route path="/prompt-memory" element={<PromptMemoryPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
