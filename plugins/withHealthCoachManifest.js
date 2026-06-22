const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/**
 * Injects everything our original hand-written AndroidManifest.xml had that
 * Expo's prebuild doesn't know about by default:
 *   - Health Connect <uses-permission> entries (Android 13- and 14+)
 *   - <queries> for Health Connect app/settings visibility
 *   - PermissionActivity (app entry point + OAuth redirect target)
 *   - Health Connect provider <meta-data>
 *   - ViewPermissionUsageActivity <activity-alias>
 *
 * Without this, EAS's prebuild regenerates AndroidManifest.xml from app.json
 * alone, silently dropping all of the above — which is why PermissionActivity
 * was missing entirely in production builds (START_CLASS_NOT_FOUND).
 */
const withHealthCoachManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const pkg = 'com.example.healthcoach';

    // ── 1. <uses-permission> entries ──────────────────────────────────────
    const permissionsToAdd = [
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_HEART_RATE',
      'android.permission.health.READ_TOTAL_CALORIES_BURNED',
      'android.permission.health.READ_RESTING_HEART_RATE',
      'android.permission.health.READ_EXERCISE',
      'android.permission.health.READ_SLEEP',
      'androidx.health.permission.Steps.READ',
      'androidx.health.permission.HeartRate.READ',
      'androidx.health.permission.TotalCaloriesBurned.READ',
      'androidx.health.permission.RestingHeartRate.READ',
      'androidx.health.permission.SleepSession.READ',
      'androidx.health.permission.ExerciseSession.READ',
    ];

    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }
    const existingPerms = new Set(
      manifest.manifest['uses-permission'].map((p) => p.$['android:name'])
    );
    permissionsToAdd.forEach((permName) => {
      if (!existingPerms.has(permName)) {
        manifest.manifest['uses-permission'].push({
          $: { 'android:name': permName },
        });
      }
    });

    // ── 2. <queries> for Health Connect ──────────────────────────────────
    if (!manifest.manifest.queries) {
      manifest.manifest.queries = [{}];
    }
    const queries = manifest.manifest.queries[0];

    if (!queries.package) queries.package = [];
    const hasHcPackage = queries.package.some(
      (p) => p.$['android:name'] === 'com.google.android.apps.healthdata'
    );
    if (!hasHcPackage) {
      queries.package.push({
        $: { 'android:name': 'com.google.android.apps.healthdata' },
      });
    }

    if (!queries.intent) queries.intent = [];
    const hasHcSettingsIntent = queries.intent.some((i) =>
      i.action?.some(
        (a) => a.$['android:name'] === 'android.settings.HEALTH_CONNECT_SETTINGS'
      )
    );
    if (!hasHcSettingsIntent) {
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.settings.HEALTH_CONNECT_SETTINGS' } }],
      });
    }

    // ── 3. <application> level additions ─────────────────────────────────
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

    // Health Connect provider meta-data
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'androidx.health.connect.client.provider',
      'com.google.android.apps.healthdata'
    );

    // ── 4. PermissionActivity ────────────────────────────────────────────
    if (!mainApplication.activity) mainApplication.activity = [];

    const hasPermissionActivity = mainApplication.activity.some(
      (a) => a.$['android:name'] === `${pkg}.PermissionActivity`
    );

    if (!hasPermissionActivity) {
      mainApplication.activity.push({
        $: {
          'android:name': `${pkg}.PermissionActivity`,
          'android:exported': 'true',
          'android:theme': '@style/AppTheme',
          'android:screenOrientation': 'portrait',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            category: [
              { $: { 'android:name': 'android.intent.category.DEFAULT' } },
              { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
            ],
            data: [
              {
                $: {
                  'android:scheme': pkg,
                  'android:host': 'oauth2redirect',
                },
              },
            ],
          },
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
          {
            action: [
              { $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } },
            ],
          },
        ],
      });
    }

    // ── 5. MainActivity — add the Health Connect rationale intent-filter ──
    const mainActivity = mainApplication.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      if (!mainActivity['intent-filter']) mainActivity['intent-filter'] = [];
      const hasRationaleFilter = mainActivity['intent-filter'].some((f) =>
        f.action?.some(
          (a) => a.$['android:name'] === 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE'
        )
      );
      if (!hasRationaleFilter) {
        mainActivity['intent-filter'].push({
          action: [
            { $: { 'android:name': 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE' } },
          ],
        });
      }
      // MAIN/LAUNCHER now lives on PermissionActivity, not MainActivity —
      // remove it from MainActivity if prebuild added it by default.
      mainActivity['intent-filter'] = mainActivity['intent-filter'].filter((f) => {
        const isLauncher = f.action?.some(
          (a) => a.$['android:name'] === 'android.intent.action.MAIN'
        ) && f.category?.some(
          (c) => c.$['android:name'] === 'android.intent.category.LAUNCHER'
        );
        return !isLauncher;
      });
    }

    // ── 6. ViewPermissionUsageActivity activity-alias ────────────────────
    if (!mainApplication['activity-alias']) mainApplication['activity-alias'] = [];
    const hasAlias = mainApplication['activity-alias'].some(
      (a) => a.$['android:name'] === 'ViewPermissionUsageActivity'
    );
    if (!hasAlias) {
      mainApplication['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': `${pkg}.PermissionActivity`,
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } },
            ],
            category: [
              { $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } },
            ],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withHealthCoachManifest;
