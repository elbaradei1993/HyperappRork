# CodeMagic Build Fix Instructions

## Issues Identified

1. **React version conflicts**: The project uses React 19.0.0 which is incompatible with many packages
2. **Missing eas.json**: Required for EAS builds
3. **Dependency resolution errors**: Multiple packages have peer dependency conflicts

## Solution

### Step 1: Use the Fixed Package Configuration

Before building with CodeMagic, replace your `package.json` with `package-codemagic.json`:

```bash
cp package-codemagic.json package.json
```

### Step 2: Use the EAS Configuration

Copy the EAS configuration:

```bash
cp eas-codemagic.json eas.json
```

### Step 3: Update CodeMagic Build Script

In your CodeMagic workflow configuration, update the build script:

```yaml
scripts:
  - name: Setup project
    script: |
      # Copy the fixed configurations
      cp package-codemagic.json package.json
      cp eas-codemagic.json eas.json
      
  - name: Install dependencies
    script: |
      npm install --legacy-peer-deps
      
  - name: Install EAS CLI
    script: |
      npm install -g eas-cli
      
  - name: Configure EAS
    script: |
      # Set up EAS without interactive mode
      eas whoami || npx eas-cli@latest login --non-interactive
      
  - name: Build Android APK
    script: |
      npx expo prebuild --platform android --clean
      cd android
      ./gradlew assembleRelease
```

## Key Changes Made

1. **Downgraded React**: From 19.0.0 to 18.2.0 for compatibility
2. **Updated React Native**: To 0.76.3 for better stability
3. **Fixed react-leaflet**: Downgraded to 4.2.1 for React 18 compatibility
4. **Added overrides**: To handle lucide-react-native peer dependency issues
5. **Created eas.json**: With proper configuration for APK builds

## Alternative: Direct Gradle Build

If EAS continues to have issues, you can build directly with Gradle:

```yaml
scripts:
  - name: Setup project
    script: |
      cp package-codemagic.json package.json
      
  - name: Install dependencies
    script: |
      npm install --legacy-peer-deps
      
  - name: Prebuild
    script: |
      npx expo prebuild --platform android --clean
      
  - name: Build APK
    script: |
      cd android
      ./gradlew assembleRelease
      
  - name: Copy APK
    script: |
      cp android/app/build/outputs/apk/release/app-release.apk $CM_BUILD_OUTPUT_DIR/
```

## Environment Variables

Make sure these are set in CodeMagic:

- `EXPO_TOKEN`: Your Expo access token (if using EAS)
- `NODE_ENV`: Set to `production`

## Notes

- The `--legacy-peer-deps` flag is crucial for resolving dependency conflicts
- The fixed package.json uses React 18.2.0 which is compatible with all current dependencies
- If you need React 19 features, you'll need to wait for ecosystem packages to update their peer dependencies
