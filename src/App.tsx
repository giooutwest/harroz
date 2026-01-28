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
import SplashScreen from "@/components/SplashScreen";
import InstallGate from "@/components/InstallGate"; // <--- 1. IMPORT THIS

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

const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isMobileBrowser, setIsMobileBrowser] = useState(false); // <--- 2. NEW STATE

  useEffect(() => {
    // --- 3. DETECTION LOGIC ---
    // Check if user is on Mobile (iPhone/Android) AND using a Browser (Safari/Chrome)
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobile = /iPad|iPhone|iPod|Android/.test(userAgent) && !(window as any).MSStream;
    
    // Check if the app is already installed (Standalone mode)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;

    // If on Mobile Web, show the Install Gate
    if (isMobile && !isStandalone) {
      setIsMobileBrowser(true);
      // Optional: Don't show splash if we are showing the gate
      setShowSplash(false); 
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('moodmemos-theme');
      if (saved) {
        document.documentElement.classList.remove('theme-pixel', 'theme-fruit', 'theme-calligraphy');
        if (saved === 'pixel') document.documentElement.classList.add('theme-pixel');
        if (saved === 'fruit') document.documentElement.classList.add('theme-fruit');
        if (saved === 'calligraphy') document.documentElement.classList.add('theme-calligraphy');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // --- 4. FIRST RETURN: THE INSTALL GATE ---
  // This takes priority. If they are on mobile web, STOP here.
  if (isMobileBrowser) {
    return <InstallGate />;
  }

  // --- 5. SECOND RETURN: THE SPLASH SCREEN ---
  // If they are in the app (or desktop), show the boot sequence.
  if (showSplash) {
    return <SplashScreen />;
  }

  // --- 6. THIRD RETURN: THE MAIN APP ---
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