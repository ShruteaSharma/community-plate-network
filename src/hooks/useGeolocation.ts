import { useCallback, useEffect, useState } from "react";

export type Coords = { lat: number; lng: number };

type State = {
  coords: Coords | null;
  status: "idle" | "locating" | "granted" | "denied" | "unsupported";
};

/** Browser geolocation, requested once on mount and retryable on demand. */
export function useGeolocation() {
  const [state, setState] = useState<State>({ coords: null, status: "idle" });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ coords: null, status: "unsupported" });
      return;
    }
    setState((s) => ({ ...s, status: "locating" }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          status: "granted",
        });
      },
      () => setState({ coords: null, status: "denied" }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { ...state, request };
}
