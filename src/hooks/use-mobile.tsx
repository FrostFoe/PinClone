
import * as React from "react";

const MOBILE_BREAKPOINT = 768; // Standard Tailwind md breakpoint

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined, // Start with undefined to avoid SSR mismatch
  );

  React.useEffect(() => {
    // Ensure this runs only on the client
    if (typeof window === "undefined") {
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      setIsMobile(mql.matches);
    };

    // Initial check
    onChange();
    
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile; // Coerce to boolean, returning false during SSR or initial client render before effect
}

    