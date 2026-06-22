const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Injects manifestPlaceholders.appAuthRedirectScheme into android/app/build.gradle
 * during every `expo prebuild` / EAS build, so the value survives even though
 * EAS regenerates the android/ folder from scratch on each build.
 *
 * Without this, AppAuth's AndroidManifest.xml placeholder
 * (data@scheme="${appAuthRedirectScheme}") has nothing to substitute,
 * and :app:processReleaseMainManifest fails.
 */
const withAuthRedirectScheme = (config) => {
  return withAppBuildGradle(config, (config) => {
    const scheme = 'com.example.healthcoach';
    const placeholderBlock = `manifestPlaceholders = [\n            appAuthRedirectScheme: "${scheme}"\n        ]`;

    // Only inject if not already present (avoids duplicate injection on repeated prebuilds)
    if (!config.modResults.contents.includes('appAuthRedirectScheme')) {
      config.modResults.contents = config.modResults.contents.replace(
        /defaultConfig\s*{/,
        (match) => `${match}\n        ${placeholderBlock}`
      );
    }

    return config;
  });
};

module.exports = withAuthRedirectScheme;
