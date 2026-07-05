import { useEffect, useState } from "react";
import * as Location from "expo-location";

export type LocationStatus = "loading" | "granted" | "denied";

export type Coords = {
  lat: number;
  lon: number;
  /** GPS altitude in metres above sea level, or null if the fix has none. */
  altitude: number | null;
  /** Vertical accuracy in metres (iOS), else horizontal accuracy, or null. */
  accuracy: number | null;
};

/**
 * Requests foreground location once and returns a single high-accuracy fix.
 * Shared by the Sun/Moon, Barometer and Altimeter tools (all position-based).
 */
export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status: perm } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (perm !== "granted") {
          setStatus("denied");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!mounted) return;
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.altitudeAccuracy ?? pos.coords.accuracy,
        });
        setStatus("granted");
      } catch {
        if (mounted) setStatus("denied");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return { status, coords };
}
