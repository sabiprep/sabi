import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const gradleWrapperJar = path.join(androidDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');
const appBuildGradle = path.join(androidDir, 'app', 'build.gradle');

/**
 * Ensures the Capacitor Android platform folder and gradle-wrapper.jar exist
 * (even when exported from environments that strip binary .jar files),
 * and patches AndroidManifest.xml and styles.xml for SABI JAMB CBT.
 */
function ensureAndroidPlatform() {
  if (!fs.existsSync(appBuildGradle) || !fs.existsSync(gradleWrapperJar)) {
    console.log('[SABI Android] Android platform or gradle-wrapper.jar missing. Generating via Capacitor...');
    if (fs.existsSync(androidDir)) {
      fs.rmSync(androidDir, { recursive: true, force: true });
    }
    execSync('npx cap add android', { stdio: 'inherit', cwd: rootDir });
  }

  // 1. Patch AndroidManifest.xml for cleartext traffic, network state, and sabi://auth deep links
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

    if (!manifest.includes('android:scheme="sabi"')) {
      const deepLinkFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="sabi" android:host="auth" />
            </intent-filter>
        </activity>`;
      manifest = manifest.replace('</activity>', deepLinkFilter);
    }

    fs.writeFileSync(manifestPath, manifest, 'utf8');
  }

  // 2. Patch styles.xml so Android status bar (battery %, network bar) never overlaps the WebView
  const stylesPath = path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  if (fs.existsSync(stylesPath)) {
    const cleanStyles = `<?xml version="1.0" encoding="utf-8"?>
<resources>

    <!-- Base application theme. -->
    <style name="AppTheme" parent="Theme.AppCompat.Light.DarkActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorPrimaryDark">@color/colorPrimaryDark</item>
        <item name="colorAccent">@color/colorAccent</item>
        <item name="android:statusBarColor">#080D1A</item>
        <item name="android:navigationBarColor">#080D1A</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:statusBarColor">#080D1A</item>
        <item name="android:navigationBarColor">#080D1A</item>
        <item name="android:fitsSystemWindows">true</item>
        <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="android:statusBarColor">#080D1A</item>
        <item name="android:navigationBarColor">#080D1A</item>
    </style>
</resources>
`;
    fs.writeFileSync(stylesPath, cleanStyles, 'utf8');
  }

  // 3. Ensure gradlew is executable on Unix/CI
  const gradlewPath = path.join(androidDir, 'gradlew');
  if (fs.existsSync(gradlewPath)) {
    try {
      fs.chmodSync(gradlewPath, 0o755);
    } catch {
      // Ignore chmod on Windows
    }
  }

  console.log('[SABI Android] Android platform verified and configured.');
}

ensureAndroidPlatform();
