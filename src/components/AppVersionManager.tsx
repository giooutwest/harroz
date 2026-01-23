import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from "@/lib/appVersion"; // <--- Import from shared file

const AppVersionManager = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkForUpdate = () => {
      const storedVersion = localStorage.getItem("app_version");

      // Check if versions mismatch (or if it's the first run)
      if (storedVersion !== APP_VERSION) {
        console.log(`New version detected: ${APP_VERSION} (Old: ${storedVersion})`);
        
        // 1. Set the new version
        localStorage.setItem("app_version", APP_VERSION);

        // 2. Notify the user
        toast({
          title: "New Update Available! 🚀",
          description: "Refreshing to apply latest changes...",
          duration: 3000,
        });

        // 3. Force hard reload and cleanup
        setTimeout(() => {
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              for (const registration of registrations) {
                registration.unregister();
              }
              window.location.reload();
            });
          } else {
            window.location.reload();
          }
        }, 1500);
      }
    };

    checkForUpdate();
  }, [toast]);

  return null;
};

export default AppVersionManager;
