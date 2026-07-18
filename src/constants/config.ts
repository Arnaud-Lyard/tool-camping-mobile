import { Platform } from "react-native";

/**
 * Base URL of the Symfony backend (../tool-camping-app).
 *
 * The backend runs under FrankenPHP/Caddy: HTTPS on :443 (local, untrusted cert)
 * and — in dev (compose.override.yaml sets SERVER_NAME to include http://localhost)
 * — plain HTTP on :80. React Native cannot use the untrusted HTTPS cert, so point
 * the app at the HTTP endpoint:
 *   - Web / iOS simulator: http://localhost
 *   - Android emulator:    http://10.0.2.2  (maps to the host's localhost)
 *   - Physical device:     http://<your-LAN-IP>  (set EXPO_PUBLIC_API_URL)
 *
 * Override anytime with EXPO_PUBLIC_API_URL in a .env file (no rebuild of config).
 */
const fallback =
  Platform.OS === "android" ? "http://10.0.2.2" : "http://localhost";

// Trim a trailing slash so `${API_BASE_URL}/api/...` never doubles up.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || fallback;

export const MOBILE_API_KEY = process.env.EXPO_PUBLIC_MOBILE_API_KEY ?? '';
