# SABI JAMB CBT — Complete Capacitor Android APK Build Guide

This document details everything that has already been wired into the **SABI JAMB CBT** codebase for Android (`ng.sabi.jambcbt`) and the exact remaining steps you need to run to generate your installable `.apk` file.

---

## 1. What Has Already Been Wired & Configured for You

1. **Capacitor 8 Core & Native Android Platform (`/android`)**:
   - Installed `@capacitor/core`, `@capacitor/cli`, and `@capacitor/android`.
   - Generated and synced the complete native Android Gradle project in `/android` (`appId: "ng.sabi.jambcbt"`, `appName: "SABI JAMB CBT"`).
   - Configured `AndroidManifest.xml` with `INTERNET` permissions, Cleartext/HTTPS traffic support, and custom `sabi://auth/callback` deep-link intent filters for Supabase OAuth.

2. **Native Android Lifecycle & Hardware Bridge (`src/utils/capacitorBridge.ts`)**:
   - **Automatic API URL Routing**: When SABI runs inside the native Android APK, all relative `/api/*` requests (`/api/auth/register`, `/api/auth/reset-password`, `/api/profile/*`, `/api/explain`) automatically route to your live backend server (`VITE_API_BASE_URL`) with CORS headers enabled in `server.ts`.
   - **Hardware Back Button Navigation (`@capacitor/app`)**: Pressing the physical Android Back button navigates backward through React Router history instead of abruptly closing the app, and only exits when the student is on a root screen (`/welcome`, `/home`, or `/auth`).
   - **Native Status Bar & Splash Screen (`@capacitor/status-bar`, `@capacitor/splash-screen`)**: Automatically synchronizes the Android system status bar color (`#080D1A` in Night Mode, `#F8FAFC` in Normal Mode) and smoothly hides the splash screen once React mounts.
   - **Native Keyboard Handling (`@capacitor/keyboard`)**: Prevents the mobile virtual keyboard from overlapping input fields during Onboarding, Auth, or AI Verification queries.

3. **NPM Build & Sync Scripts (`package.json`)**:
   - `npm run android:sync` — Builds the production Vite bundle (`dist/`) and copies all assets + plugins into `/android`.
   - `npm run android:open` — Opens the `/android` folder directly in Android Studio.
   - `npm run android:apk:debug` — Builds a directly installable `app-debug.apk` from the terminal.
   - `npm run android:apk:release` — Builds an unsigned/signed release APK for Play Store distribution.

---

## 2. Option A: Get Your `.apk` Without Installing Android Studio (1-Click GitHub Cloud Build)

We have included an automated GitHub Actions workflow at **`.github/workflows/build-android-apk.yml`**. This compiles your Android `.apk` in the cloud using GitHub's servers (Java 21 + Android SDK pre-installed) in ~3 minutes:

1. **Push this project to your GitHub repository**.
2. *(Optional)* In your GitHub repo, go to **Settings → Secrets and variables → Actions** and add:
   - `VITE_SUPABASE_URL` (Your Supabase Project URL)
   - `VITE_SUPABASE_ANON_KEY` (Your Supabase Publishable / Anon Key)
   - `VITE_API_BASE_URL` (Your deployed backend URL, e.g., your Render, Railway, or Cloud Run URL)
3. Go to the **Actions** tab in your GitHub repository.
4. Click **"Build SABI Android APK"** on the left, then click **"Run workflow"**.
5. Once the workflow turns green (~2–3 minutes), scroll down to the **Artifacts** section at the bottom of that workflow run and click **`SABI-JAMB-CBT-Android-APK`** to download your compiled `app-debug.apk`!
6. Send `app-debug.apk` to your Android phone via WhatsApp, Google Drive, or USB cable and tap to install.

---

## 3. Option B: Build the `.apk` Locally on Your Computer (Android Studio or Terminal)

### Prerequisites on Your PC
1. **Node.js 20+** installed.
2. **Java JDK 21** installed (Android Studio Ladybug / Meerkat bundles JDK 21 automatically).
3. **Android Studio** installed with **Android SDK Platform 35** and **Android SDK Build-Tools**.

### Step 1: Clone / Pull the Project & Install Packages
Open your terminal in the project folder and run:
```bash
npm install
```

### Step 2: Create Your `.env` File from `.env.example`
Because Git hides secret `.env` files for security, you will only see **`.env.example`** when you first open the folder in VS Code.

1. In your VS Code terminal, copy `.env.example` into a new file named **`.env`**:
   - **Windows (PowerShell / CMD)**:
     ```powershell
     copy .env.example .env
     ```
   - **Mac / Linux / Git Bash**:
     ```bash
     cp .env.example .env
     ```
   *(Or right-click `.env.example` in the VS Code sidebar → **Copy**, paste it in the root folder, and rename the copy to **`.env`**).*

2. Open your newly created **`.env`** file in VS Code and paste your real keys:
```env
GEMINI_API_KEY=your-gemini-api-key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-or-secret-key
VITE_API_BASE_URL=https://ais-pre-hexoysblc7dzfjy3yyprez-26118416277.europe-west1.run.app
```

### Step 3: Build Web Assets & Sync with Capacitor Android
Run:
```bash
npm run android:sync
```
*(This runs `vite build` and `npx cap sync android`, copying the latest SABI UI, KaTeX math fonts, SVG mascots, and diamond/rating stores into `android/app/src/main/assets/public`).*

### Step 4A: Build the `.apk` Visually Inside Android Studio
1. Run:
   ```bash
   npm run android:open
   ```
2. Wait 1–2 minutes for Android Studio to finish **Gradle Sync** (watch the bottom-right status bar).
3. In the top menu bar of Android Studio, click:
   **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. When the notification pops up in the bottom-right corner saying *"Build APK(s): APK(s) generated successfully"*, click **"locate"**.
5. Your installable APK is located at:
   ```text
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Step 4B: Or Build the `.apk` Directly via Command Line (No GUI Needed)
If `ANDROID_HOME` and `JAVA_HOME` (JDK 21) are set in your terminal, simply run:
```bash
npm run android:apk:debug
```
Once it finishes, grab your `.apk` at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Generating a Signed Release APK / AAB for Google Play Store

When you are ready to publish **SABI JAMB CBT** to the Google Play Store or distribute a production-signed APK to Nigerian students:

1. Generate a signing keystore (run once):
   ```bash
   keytool -genkey -v -keystore sabi-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sabi-key
   ```
2. Open the project in Android Studio (`npm run android:open`).
3. Go to **Build → Generate Signed App Bundle / APK**.
4. Choose **APK** (for direct WhatsApp/Website download) or **Android App Bundle (AAB)** (for Google Play Store).
5. Select your `sabi-release-key.jks` file, enter your keystore password, choose the **`release`** build variant, and click **Create**.
6. Your production-signed APK will be output to:
   ```text
   android/app/release/app-release.apk
   ```
