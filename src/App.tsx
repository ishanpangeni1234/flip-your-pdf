import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PastPapers from "./pages/PastPapers";
import ChatPage from "./pages/ChatPage";
import NotesPage from "./pages/NotesPage";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./lib/auth-context";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />

              {/* Updated Past Paper Routes */}
              <Route path="/past-papers" element={<PastPapers />} />
              <Route path="/past-papers/:subject/:session" element={<PastPapers />} />
              <Route path="/past-papers/:subject/:session/:year" element={<PastPapers />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/notes" element={<NotesPage />} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;