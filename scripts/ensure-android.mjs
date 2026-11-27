import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const gradleWrapperJar = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');
const ANDROID_VERSION_CODE = 3;
const ANDROID_VERSION_NAME = '2.1.0';

/**
 * Ensures the Capacitor Android platform folder and gradle-wrapper.jar exist
 * (even when exported from environments that strip binary .jar files),
 * keeps Android version metadata synced, and patches AndroidManifest.xml and
 * styles.xml for SABI JAMB CBT.
 */
function ensureAndroidPlatform() {
  if (!fs.existsSync(appBuildGradle) || !fs.existsSync(gradleWrapperJar)) {
    console.log('[SABI Android] Android platform or gradle-wrapper.jar missing. Generating via Capacitor...');
    if (fs.existsSync(androidDir)) {
      fs.rmSync(androidDir, { recursive: true, force: true });
    }
    execSync('npx cap add android', { stdio: 'inherit', cwd: rootDir });
  }

  // 0. Keep Android versionCode & versionName aligned with current SABI release
  if (fs.existsSync(appBuildGradle)) {
    let gradle = fs.readFileSync(appBuildGradle, 'utf8');
    gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${ANDROID_VERSION_CODE}`);
    gradle = gradle.replace(/versionName\s+"[^"]+"/, `versionName "${ANDROID_VERSION_NAME}"`);
    fs.writeFileSync(appBuildGradle, gradle, 'utf8');
  }

  // 1. Patch AndroidManifest.xml for cleartext traffic, network state, and sabi:// deep links
  const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');

    if (!manifest.includes('android:usesCleartextTraffic="true"')) {
      manifest = manifest.replace(
        '<application',
        '<application\n        android:usesCleartextTraffic="true"'
      );
    }

    if (!manifest.includes('android.permission.ACCESS_NETWORK_STATE')) {
      manifest = manifest.replace(
        '<uses-permission android:name="android.permission.INTERNET" />',
        '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />'
      );
    }

    if (!manifest.includes('android:host="auth"')) {
      const authDeepLinkFilter = `
            <!-- Deep Link Intent Filter for Supabase Google OAuth & Email Verification (sabi://auth/callback) -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="sabi" android:host="auth" />
            </intent-filter>
        </activity>`;
      manifest = manifest.replace('</activity>', authDeepLinkFilter);
    }

    if (!manifest.includes('android:host="q"')) {
      const questionDeepLinkFilter = `
            <!-- Deep Link Intent Filter for Shared Question Snapshots (sabi://q/<questionId>) & SABI Assistant -->
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="sabi" android:host="q" />
                <data android:scheme="sabi" android:host="assistant" />
            </intent-filter>
        </activity>`;
      manifest = manifest.replace('</activity>', questionDeepLinkFilter);
    }

    // HTTPS Android App Links so tapping a WhatsApp https://<domain>/q/<id> link opens SABI App if installed
    let publicHost = 'sabi-tan.vercel.app';
    try {
      const configuredUrl = process.env.VITE_PUBLIC_WEB_URL || process.env.SABI_APP_URL || '';
      if (configuredUrl) {
        const parsedHost = new URL(configuredUrl).hostname;
        if (parsedHost && !parsedHost.includes('localhost')) {
          publicHost = parsedHost;
        }
      }
    } catch {
      // Keep default publicHost
    }

    if (!manifest.includes('android:pathPrefix="/q"')) {
      const httpsAppLinkFilter = `
            <!-- HTTPS App Link Intent Filter for Shared Question Links (https://${publicHost}/q/<questionId>) -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${publicHost}" android:pathPrefix="/q" />
            </intent-filter>
        </activity>`;
      manifest = manifest.replace('</activity>', httpsAppLinkFilter);
    }

    fs.writeFileSync(manifestPath, manifest, 'utf8');
  }

  // 2. Patch styles.xml so Android status bar matches SABI Wonderland Yellow with dark icons
  const stylesPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  if (fs.existsSync(stylesPath)) {
    const cleanStyles = `<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">#FFE51E</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:navigationBarColor">#2A085E</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:statusBarColor">#FFE51E</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:navigationBarColor">#2A085E</item>
        <item name="android:fitsSystemWindows">true</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:statusBarColor">#FFE51E</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:navigationBarColor">#2A085E</item>
    </style>
</resources>
`;
    fs.writeFileSync(stylesPath, cleanStyles, 'utf8');
  }

  // 3. Remove any stale synced web assets so cap sync always writes a 100% fresh bundle
  const androidPublicDir = path.join(androidDir, 'app', 'src', 'main', 'assets', 'public');
  if (fs.existsSync(androidPublicDir)) {
    fs.rmSync(androidPublicDir, { recursive: true, force: true });
  }

  // 4. Ensure server.cjs / server.cjs.map are never copied into Android WebView assets
  for (const serverArtifact of ['server.cjs', 'server.cjs.map']) {
    const artifactPath = path.join(rootDir, 'dist', serverArtifact);
    if (fs.existsSync(artifactPath)) {
      fs.rmSync(artifactPath, { force: true });
    }
  }

  // 5. Ensure gradlew is executable on Unix/CI
  const gradlewPath = path.join(androidDir, 'gradlew');
  if (fs.existsSync(gradlewPath)) {
    try {
      fs.chmodSync(gradlewPath, 0o755);
    } catch {
      // Ignore chmod on Windows
    }
  }

  console.log('[SABI Android] Android platform verified, cleaned, and configured.');
}

ensureAndroidPlatform();
