import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { resolveDeepLinkRoute } from './capacitorBridge';

describe('Stage 3 — Capacitor Android Deep Links & Release Sync', () => {
  it('resolves sabi://q/<questionId> deep links with safe query parameters', () => {
    expect(resolveDeepLinkRoute('sabi://q/SABI-CHM-PT-1?mode=blitz&src=share')).toBe(
      '/q/SABI-CHM-PT-1?mode=blitz&src=share'
    );
    expect(resolveDeepLinkRoute('sabi://q/SABI-CHM-PT-1?mode=smart&evil=<script>')).toBe(
      '/q/SABI-CHM-PT-1?mode=smart'
    );
  });

  it('resolves universal https share links and assistant/auth custom schemes', () => {
    expect(resolveDeepLinkRoute('https://sabi-tan.vercel.app/q/SABI-PHY-1?src=share')).toBe(
      '/q/SABI-PHY-1?src=share'
    );
    expect(resolveDeepLinkRoute('sabi://assistant')).toBe('/assistant');
    expect(resolveDeepLinkRoute('sabi://auth/callback')).toBe('/auth/verify?verified=true');
  });

  it('rejects malformed, traversal, and non-whitelisted deep-link URLs', () => {
    expect(resolveDeepLinkRoute('javascript:alert(1)')).toBeNull();
    expect(resolveDeepLinkRoute('sabi://q/../../etc/passwd')).toBeNull();
    expect(resolveDeepLinkRoute('https://evil.example.com/admin')).toBeNull();
    expect(resolveDeepLinkRoute('')).toBeNull();
  });

  it('keeps package.json, android/app/build.gradle, and AndroidManifest.xml aligned to v2.1.0 (code 3)', () => {
    const rootDir = process.cwd();
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    const gradle = fs.readFileSync(path.join(rootDir, 'android/app/build.gradle'), 'utf8');
    const manifest = fs.readFileSync(
      path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'),
      'utf8'
    );
    const capSettings = fs.readFileSync(
      path.join(rootDir, 'android/capacitor.settings.gradle'),
      'utf8'
    );

    expect(pkg.version).toBe('2.1.0');
    expect(gradle).toContain('versionCode 3');
    expect(gradle).toContain('versionName "2.1.0"');
    expect(manifest).toContain('android:scheme="sabi" android:host="auth"');
    expect(manifest).toContain('android:scheme="sabi" android:host="q"');
    expect(manifest).toContain('android:scheme="sabi" android:host="assistant"');
    expect(manifest).toContain('android:pathPrefix="/q"');
    expect(capSettings).toContain(':capacitor-share');
    expect(capSettings).toContain(':capacitor-filesystem');
    expect(
      fs.existsSync(path.join(rootDir, 'android/app/src/main/assets/public/server.cjs'))
    ).toBe(false);
  });
});
