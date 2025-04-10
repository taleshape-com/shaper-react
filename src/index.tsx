import React, { useEffect, useState } from 'react';

// Type definitions
type VarsParamSchema = Record<string, string | string[]> | undefined;

export type DashboardProps = {
  baseUrl: string;
  dashboardId: string;
  getJwt: (args: { baseUrl?: string }) => Promise<string>;
} & (
    | {
      vars: VarsParamSchema;
      onVarsChanged: (newVars: VarsParamSchema) => void;
      defaultVars?: undefined;
    }
    | {
      vars?: undefined;
      onVarsChanged?: (newVars: VarsParamSchema) => void;
      defaultVars?: VarsParamSchema;
    }
  );

// Define a type for the global window object with our custom properties
declare global {
  interface Window {
    shaper?: {
      Dashboard?: React.ComponentType<DashboardProps>;
    };
  }
}

export const ShaperDashboard: React.FC<DashboardProps> = (props) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.shaper?.Dashboard) {
      setScriptLoaded(true);
      return;
    }

    // Construct the script URL
    const scriptUrl = `${props.baseUrl}/react/shaper.js`;

    // Check if the script is already being loaded
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

    if (existingScript) {
      // Script is already in the DOM, wait for it to load
      existingScript.addEventListener('load', () => {
        setScriptLoaded(true);
      });
      existingScript.addEventListener('error', () => {
        setScriptError(`Failed to load Shaper script from ${scriptUrl}`);
      });
    } else {
      // Create and append the script
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;

      script.onload = () => {
        setScriptLoaded(true);
      };

      script.onerror = () => {
        setScriptError(`Failed to load Shaper script from ${scriptUrl}`);
      };

      document.body.appendChild(script);
    }

    // Cleanup function
    return () => {
      // We don't remove the script as other components might be using it
    };
  }, [props.baseUrl]);

  if (scriptError) {
    return <div className="shaper-dashboard-error">Error: {scriptError}</div>;
  }

  if (!scriptLoaded || !window.shaper?.Dashboard) {
    return <div className="shaper-dashboard-loading">Loading Shaper Dashboard...</div>;
  }

  // Once loaded, use the global Dashboard component
  const ShaperDashboardComponent = window.shaper.Dashboard;
  return <ShaperDashboardComponent {...props} />;
};
