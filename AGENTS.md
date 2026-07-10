# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.
Install native/Expo packages with `npx expo install <pkg>` (never plain `npm install`) so versions match the SDK.

# Naming conventions

**All code is written in English** — identifiers, file names, route/tab keys, component names,
props, comments. The **only** French in the codebase lives in i18n translation *values*
(`src/i18n/locales/fr.json`); everything else, including i18n *keys*, is English. Keep these
canonical English terms consistent across the app, i18n keys, and backend routes:

| Domain | Canonical code term (feature dir, route/tab key, i18n key) |
| --- | --- |
| Equipment | `equipment` |
| Tools | `tools` — sub-tools: `compass`, `spiritLevel`, `weather`, `altimeter` |
| Maintenance | `maintenance` |
| Settings | `settings` |

The user-facing labels (Équipements, Outils, Entretien, Paramètres, Boussole, Niveau) are
translation *values* only — never mirror them into code identifiers or keys.

# Architecture

Expo Router shell + **react-native-paper** UI. The whole app is gated behind login.

- **Auth** — `src/auth/auth-context.tsx` (`AuthProvider` / `useAuth`). JWT obtained from the
  Symfony backend (`../tool-camping-app`, see below), stored in `expo-secure-store`. `authedFetch`
  transparently refreshes the JWT on 401. Routing gate lives in `src/app/_layout.tsx`: while
  `status === 'loading'` it shows a spinner, then redirects between `/login` and `/`.
- **API** — `src/api/client.ts` (`login`, `register`, `forgotPassword`, `refresh`, `apiFetch`).
  Base URL in `src/constants/config.ts` (`API_BASE_URL`, override with `EXPO_PUBLIC_API_URL`).
  ⚠️ The backend runs under FrankenPHP/Caddy: HTTPS :443 has a local **untrusted** cert that RN
  cannot use, so point the app at **plain HTTP** (`http://localhost`, Android emulator `http://10.0.2.2`,
  device `http://<LAN-IP>`). Dev serves HTTP on :80 because `compose.override.yaml` sets
  `SERVER_NAME: "https://localhost, http://localhost"`.
- **Pre-auth screens** — `login`, `register`, `forgot-password` (Expo Router routes). The auth gate
  in `_layout.tsx` lets these through while unauthenticated; everything else redirects to `/login`.
- **Navigation** — single authed route `src/app/index.tsx` renders `src/components/main-tabs.tsx`,
  a Paper `BottomNavigation` with 4 tabs (keys `equipment`, `tools`, `maintenance`, `settings`;
  labels come from i18n). Tabs are scenes (`BottomNavigation.SceneMap`), not Expo Router routes.
  Screens live in `src/features/*`.
  - **Equipment** — full parity with the Symfony web app: create (new item on top), preset
    generation, per-item status toggle, bulk status / bulk delete, move up/down reorder,
    client-side status filter with counts, edit & delete. Data layer: `use-equipment.ts`
    (optimistic, reloads on error) + `types.ts`; API under `/api/equipment*`.
  - **Tools** — groups four in-screen tools (`useState`, no router). Two are sensor-based:
    **Level** (two-axis spirit level, `expo-sensors` `Accelerometer` + `expo-haptics`) and
    **Compass** (magnetic heading dial, `expo-sensors` `Magnetometer`, no permission). Two are
    position-based and share the `use-location.ts` hook (`expo-location`, foreground permission):
    **Weather** (`weather-screen.tsx`) and **Altimeter** (GPS altitude from the location fix). The
    **Weather** screen is a minimal camping forecast — no current conditions, no UV — combining
    surface pressure + 3 h trend and a 3-day forecast (tomorrow + 2 days: min/max temp + precipitation
    in mm) from the **Open-Meteo** API (`open-meteo.ts`, `fetchWeather`, free/no key, **requires
    network**, no offline fallback), plus offline Sun/Moon data (sunrise/sunset/solar-noon/golden-hour
    + moon phase, illumination & next full moon, computed locally with `suncalc`; astro maths in
    `sun-moon.ts` + ambient `suncalc.d.ts`). Each screen handles its own loading/permission/error states.
  - **Maintenance** — the per-user battery-recharge reminder (`/api/battery`): enable switch +
    frequency in days. Name chosen as an umbrella for future upkeep features.
- **i18n** — `src/i18n/` (i18next + react-i18next), FR/EN, fallback FR, device language by default.
  `src/i18n/language.ts` persists the user's choice in SecureStore; the Settings screen switches it.

## Backend (Symfony, ../tool-camping-app)
Stateless JSON API under `^/api` (LexikJWT; refresh tokens optional — see below), in `src/Http/Api/Controller/`:
- `POST /api/login_check` → `{ token }`, `GET /api/me`
- Public auth (`AuthApiController`): `POST /api/register` (creates user + sends verification email),
  `POST /api/forgot-password` (sends reset email, always 200). Email verification + the reset form
  are completed via the signed links emailed to the user (handled by the web app).
- Equipment: `GET /api/equipment`, `POST /api/equipment` (create), `POST /api/equipment/generate`,
  `POST /api/equipment/reorder`, `POST /api/equipment/status`, `POST /api/equipment/bulk-delete`,
  `PATCH /api/equipment/{id}`, `DELETE /api/equipment/{id}`
- Battery: `GET /api/battery`, `PUT /api/battery`

These mirror the web `/user/*` controllers but are stateless (JWT, JSON bodies, no CSRF). Preset
lists are shared via `App\Domain\Equipment\EquipmentPresets`. The web form_login firewall is untouched.

Refresh tokens are **not** enabled (the `refresh_jwt` firewall requires
`markitosgv/jwt-refresh-token-bundle`). The client already tolerates a `{ token }`-only login; on a
401 with no refresh token it signs out. To enable later: install the bundle, re-add the
`api_token_refresh` firewall (`refresh_jwt: { check_path: /api/token/refresh }`) + its
`PUBLIC_ACCESS` access_control rule, and the `/api/token/refresh` route.
