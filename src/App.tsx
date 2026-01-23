import { useState, useEffect, Suspense, lazy } from "react"; 
import AppVersionManager from "@/components/AppVersionManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationNavigationProvider } from "@/hooks/useNotificationNavigation";
import { Loader2 } from "lucide-react"; 
import SplashScreen from "@/components/SplashScreen"; // Import your new Splash Screen

// --- LAZY IMPORTS ---
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      retry: 1,
    },
  },
});

const NotificationInitializer = () => {
  usePushNotifications();
  return null;
};

// Simple Loading Screen for route transitions (different from Splash)
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Show splash for exactly 2 seconds to let the brand sink in
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Apply saved theme early so SplashScreen reflects it
    try {
      const saved = localStorage.getItem('moodmemos-theme');
      if (saved) {
        document.documentElement.classList.remove('theme-pixel', 'theme-fruit', 'theme-calligraphy');
        if (saved === 'pixel') document.documentElement.classList.add('theme-pixel');
        if (saved === 'fruit') document.documentElement.classList.add('theme-fruit');
        if (saved === 'calligraphy') document.documentElement.classList.add('theme-calligraphy');
      }
    } catch (e) {
      // ignore (e.g., SSR or strict CSP)
    }
  }, []);

  // 1. Show Splash Screen first (High Z-Index Overlay logic)
  if (showSplash) {
    return <SplashScreen />;
  }

  // 2. Then load the actual App and Providers
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NotificationNavigationProvider>
          <Toaster />
          <Sonner />
          
          <NotificationInitializer />
          <AppVersionManager /> 

          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationNavigationProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;