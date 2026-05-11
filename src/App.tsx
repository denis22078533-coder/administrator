
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Index from "./pages/Index";
import LumenApp from "./lumen/LumenApp";
import SystemAdminPage from "./SystemAdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Dynamically determine the basename.
// On GitHub Pages, the project is served from a subfolder (/administrator/).
// On the main domain (югазин.рф), it's served from the root (/).
const getBasename = () => {
  const isGitHubPages = window.location.hostname.endsWith('github.io');
  return isGitHubPages ? '/administrator' : '/';
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter basename={getBasename()} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<LumenApp />} />
            <Route path="/lumen" element={<LumenApp />} />
            <Route path="/admin" element={<SystemAdminPage />} />
            <Route path="/motofeed" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
