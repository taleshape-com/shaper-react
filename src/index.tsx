import { useEffect, useState, useRef } from "react";

type VarsParamSchema = Record<string, string | string[]> | undefined;

type EmbedProps = {
  baseUrl?: string;
  dashboardId: string;
  getJwt: (args: { baseUrl?: string }) => Promise<string>;
  vars?: VarsParamSchema;
  onVarsChanged?: (newVars: VarsParamSchema) => void;
};

type EmbedArgs = EmbedProps & {
  container: HTMLElement;
};

type DashboardInstance = {
  update: (newProps: Partial<EmbedProps>) => void;
  destroy: () => void;
};

// Define a type for the global window object with our custom properties
declare global {
  interface Window {
    shaper?: {
      dashboard?: (args: EmbedArgs) => DashboardInstance;
    };
  }
}

type ShaperDashboardProps = {
  id: string;
  baseUrl: string;
  jwt?: string;
  refreshJwt: () => void;
} & Pick<EmbedProps, "vars" | "onVarsChanged">;

function ShaperDashboard({
  id,
  baseUrl,
  jwt,
  refreshJwt,
  vars,
  onVarsChanged,
}: ShaperDashboardProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<DashboardInstance | null>(null);
  const getJwtResolveRef = useRef<((jwt: string) => void)[]>([]);
  const refreshRef = useRef<() => void>(() => { });

  useEffect(() => {
    refreshRef.current = refreshJwt;
  }, [refreshJwt]);

  useEffect(() => {
    if (jwt) {
      for (const resolve of getJwtResolveRef.current) {
        resolve(jwt);
      }
      getJwtResolveRef.current = [];
    }
  }, [jwt]);


  useEffect(() => {
    // Check if the script is already loaded
    if (window.shaper?.dashboard) {
      setScriptLoaded(true);
      return;
    }

    // Construct the script URL
    const scriptUrl = `${baseUrl}/embed/shaper.js`;

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

    // We don't remove the script as other components might be using it
  }, [baseUrl]);

  // Initialize the dashboard
  useEffect(() => {
    if (
      !scriptLoaded ||
      !window.shaper?.dashboard ||
      !containerRef.current ||
      dashboardRef.current
    ) {
      return;
    }

    dashboardRef.current = window.shaper.dashboard({
      baseUrl,
      container: containerRef.current,
      dashboardId: id,
      getJwt: async () => {
        const p = new Promise<string>((resolve) => {
          getJwtResolveRef.current.push(resolve);
        });
        refreshRef.current();
        return p;
      },
    });

    // Cleanup function
    return () => {
      if (dashboardRef.current) {
        dashboardRef.current.destroy();
        dashboardRef.current = null;
      }
    };
  }, [scriptLoaded, baseUrl, id]);

  // Update props when they change
  useEffect(() => {
    if (!dashboardRef.current) {
      return;
    }
    dashboardRef.current.update({
      vars,
      onVarsChanged,
    });
  }, [vars, onVarsChanged]);

  if (scriptError) {
    return <div className="shaper-dashboard-error">Error: {scriptError}</div>;
  }

  return <div ref={containerRef} />;
}

export { ShaperDashboard, type ShaperDashboardProps };
