import { useEffect, useState, useRef } from "react";

type VarsParamSchema = Record<string, string | string[]> | undefined;

type EmbedProps = {
  baseUrl?: string;
  dashboardId: string;
  getJwt: (args: { baseUrl?: string }) => Promise<string>;
  vars?: VarsParamSchema;
  onVarsChanged?: (newVars: VarsParamSchema) => void;
}

type EmbedArgs = EmbedProps & {
  container: HTMLElement;
};

type DashboardInstance = {
  update: (newProps: Partial<EmbedProps>) => void;
  destroy: () => void;
}

// Define a type for the global window object with our custom properties
declare global {
  interface Window {
    shaper?: {
      dashboard?: (args: EmbedArgs) => DashboardInstance;
    };
  }
}

type ShaperDashboardProps = EmbedProps & Required<Pick<EmbedProps, 'baseUrl'>>;

const ShaperDashboard = (props: ShaperDashboardProps) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<DashboardInstance | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if the script is already loaded
    if (window.shaper?.dashboard) {
      setScriptLoaded(true);
      return;
    }

    // Construct the script URL
    const scriptUrl = `${props.baseUrl}/embed/shaper.js`;

    // Check if the script is already being loaded
    const existingScript = document.querySelector(`script[src="${scriptUrl}"]`);

    if (existingScript) {
      // Script is already in the DOM, wait for it to load
      existingScript.addEventListener("load", () => {
        setScriptLoaded(true);
      });
      existingScript.addEventListener("error", () => {
        setScriptError(`Failed to load Shaper script from ${scriptUrl}`);
      });
    } else {
      // Create and append the script
      const script = document.createElement("script");
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

  // Initialize the dashboard
  useEffect(() => {
    if (!(window.shaper?.dashboard) || !containerRef.current || dashboardRef.current) {
      return;
    }

    dashboardRef.current = window.shaper.dashboard({
      container: containerRef.current,
      ...props,
    });

    setIsReady(true);

    // Cleanup function
    return () => {
      if (dashboardRef.current) {
        dashboardRef.current.destroy();
        dashboardRef.current = null;
      }
    };
  }, [props]);

  // Update props when they change
  useEffect(() => {
    if (!isReady || !dashboardRef.current) {
      return;
    }
    dashboardRef.current.update(props);
  }, [props, isReady]);

  if (scriptError) {
    return <div className="shaper-dashboard-error">Error: {scriptError}</div>;
  }

  if (!scriptLoaded || !window.shaper?.dashboard) {
    return (
      <div className="shaper-dashboard-loading">
        Loading Shaper Dashboard...
      </div>
    );
  }

  return <div ref={containerRef} />;
};

export { ShaperDashboard, type ShaperDashboardProps };
