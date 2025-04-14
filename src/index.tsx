import { useEffect, useState, useRef } from "react";

// Type of the vars prop and the onVarsChanged callback argument
export type ShaperDashboardVars = Record<string, string | string[]> | undefined;

type EmbedProps = {
  baseUrl?: string;
  dashboardId: string;
  getJwt: (args: { baseUrl?: string }) => Promise<string>;
  // Optional object of variables passed to the dashboard.
  // Values must be strings or arrays of strings.
  // Can be used in SQL via `getvariable()` function.
  // Set this if you want to control the dashboard's variables from your app.
  // This is useful if you like to store the dashboard state in the URL or local storage for example.
  // Use this in combination with the onVarsChanged callback to update the vars as needed.
  vars?: ShaperDashboardVars;
  // Optional callback that is called when the dashboard's variables change.
  // Also see vars prop.
  onVarsChanged?: (newVars: ShaperDashboardVars) => void;
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

// Props for the ShaperDashboard component
export type ShaperDashboardProps = {
  // The ID of the dashboard to embed.
  // Get this from the Shaper UI.
  id: string;
  // The base URL of the Shaper instance.
  // Must be reachable from the user's browser.
  baseUrl: string;
  // JWT token for authentication.
  // Dashboard can only load with a valid JWT.
  // Dashboard is in loading state if jwt is undefined.
  // This allows you to load the token asynchronously.
  // Make sure you generate a token that matches the permissions of the logged in user.
  jwt?: string;
  // This function is called when the JWT token needs to be refreshed.
  // It is also called initially if jwt prop is undefined.
  // Use this as trigger to load the token and then set the jwt prop accordingly.
  refreshJwt: () => void;
  // Optional callback that is called when embed JS script cannot be loaded from the Shaper instance.
  // Use this to render an error message or a fallback UI.
  // By default an empty div is rendered.
  onLoadError?: (error: string) => void;
} & Pick<EmbedProps, "vars" | "onVarsChanged">;

// Component to embed a Shaper dashboard.
// See ShaperDashboardProps for props.
// Make sure id, baseUrl, jwt and refreshJwt are set.
export function ShaperDashboard({
  id,
  baseUrl,
  jwt,
  refreshJwt,
  vars,
  onVarsChanged,
  onLoadError = () => { },
}: ShaperDashboardProps) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<DashboardInstance | null>(null);
  const resolveJwtRef = useRef<((jwt: string) => void)[]>([]);
  const refreshRef = useRef<() => void>(() => { });
  const varsRef = useRef<ShaperDashboardVars>(undefined);
  const varsJsonRef = useRef<string | undefined>(undefined);
  const onVarsChangedRef = useRef<((vars: ShaperDashboardVars) => void) | undefined>(undefined);
  const onLoadErrorRef = useRef(onLoadError);

  useEffect(() => {
    refreshRef.current = refreshJwt;
  }, [refreshJwt]);

  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);


  useEffect(() => {
    if (jwt) {
      for (const resolve of resolveJwtRef.current) {
        resolve(jwt);
      }
      resolveJwtRef.current = [];
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
        onLoadErrorRef.current(`Failed to load Shaper script from ${scriptUrl}`);
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
        onLoadErrorRef.current(`Failed to load Shaper script from ${scriptUrl}`);
      };

      document.body.appendChild(script);
    }

    // We don't remove the script as other components might be using it
  }, [baseUrl]);

  // Update props when they change
  useEffect(() => {
    const s = JSON.stringify(vars)
    if (s === varsJsonRef.current) {
      return;
    }
    varsRef.current = vars;
    varsJsonRef.current = s;
    if (dashboardRef.current) {
      dashboardRef.current.update({
        vars,
      });
    }
  }, [vars]);

  useEffect(() => {
    onVarsChangedRef.current = onVarsChanged;
  }, [onVarsChanged]);

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
          resolveJwtRef.current.push(resolve);
        });
        refreshRef.current();
        return p;
      },
      vars: varsRef.current,
      onVarsChanged: (newVars) => {
        if (onVarsChangedRef.current) {
          onVarsChangedRef.current(newVars);
        }
      }
    });

    // Cleanup function
    return () => {
      if (dashboardRef.current) {
        dashboardRef.current.destroy();
        dashboardRef.current = null;
      }
    };
  }, [scriptLoaded, baseUrl, id]);

  return <div ref={containerRef} />;
}

