import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<RenderPage />} />
            <Route path="/workflow" element={<WorkflowPage />} />
            <Route path="/orchestrator" element={<OrchestratorPage />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/monitor" element={<MonitorPage />} />
            <Route path="/errors" element={<ErrorsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/providers" element={<ProvidersPage />} />
            <Route path="/tip-auditor" element={<TIPAuditorPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
