import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Capacitor } from '@capacitor/core';

const IS_NATIVE = Capacitor.isNativePlatform();

export interface BrandingConfig {
  organizationId: number;
  organizationName: string;
  organizationNameAr: string;
  edition: "learning_tree" | "nashaa";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl: string | null;
  logoLightUrl: string | null;
  appIcon: string | null;
  splashScreenUrl: string | null;
  fontFamily: string;
  borderRadius: string;
  sidebarStyle: "dark" | "light" | "gradient";
}

const defaultBranding: BrandingConfig = {
  organizationId: 1,
  organizationName: "نشأة",
  organizationNameAr: "نشأة",
  edition: "nashaa",
  primaryColor: "#10b981",
  secondaryColor: "#059669",
  accentColor: "#34d399",
  backgroundColor: "#0f172a",
  textColor: "#f8fafc",
  logoUrl: null,
  logoLightUrl: null,
  appIcon: null,
  splashScreenUrl: null,
  fontFamily: "Noto Sans Arabic",
  borderRadius: "0.5rem",
  sidebarStyle: "dark",
};

interface BrandingContextType {
  branding: BrandingConfig;
  isLoading: boolean;
  refreshBranding: () => void;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  isLoading: false,
  refreshBranding: () => {},
});

/**
 * On native iOS, skip the branding query if the user hasn't logged in yet.
 * This prevents a network request on app launch that can trigger the
 * iOS "Load failed" native banner when the server is cold.
 */
function shouldEnableBrandingQuery(): boolean {
  if (!IS_NATIVE) return true; // Always enable on web
  const hasSession = localStorage.getItem('naashah-has-session');
  return hasSession === 'true';
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [isLoading, setIsLoading] = useState(true);

  const enabled = shouldEnableBrandingQuery();

  const { data: brandingData, refetch } = trpc.branding.getMyBranding.useQuery(undefined, {
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled, // Skip on native if no session
  });

  useEffect(() => {
    if (!enabled) {
      // On native without session, use defaults immediately
      setIsLoading(false);
      return;
    }
    if (brandingData) {
      setBranding(brandingData);
      setIsLoading(false);
      // Apply CSS variables
      applyBrandingCssVars(brandingData);
    } else {
      setIsLoading(false);
    }
  }, [brandingData, enabled]);

  const refreshBranding = () => {
    refetch();
  };

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

// Apply branding colors as CSS custom properties
function applyBrandingCssVars(config: BrandingConfig) {
  const root = document.documentElement;
  root.style.setProperty("--brand-primary", config.primaryColor);
  root.style.setProperty("--brand-secondary", config.secondaryColor);
  root.style.setProperty("--brand-accent", config.accentColor);
  root.style.setProperty("--brand-bg", config.backgroundColor);
  root.style.setProperty("--brand-text", config.textColor);
  root.style.setProperty("--brand-radius", config.borderRadius);
  
  if (config.fontFamily) {
    root.style.setProperty("--brand-font", config.fontFamily);
  }
}
