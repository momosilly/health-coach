# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# Health Coach custom native modules — keep everything in our own package
# so React Native's reflection-based bridge can still find AuthModule,
# AuthPackage, HealthServer, etc. in release/minified builds.
-keep class com.example.healthcoach.** { *; }

# AppAuth (Microsoft Entra ID login flow)
-keep class net.openid.appauth.** { *; }

# Health Connect
-keep class androidx.health.connect.client.** { *; }

# Gson (used in NetworkClient for JSON serialization)
-keep class com.google.gson.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# @generated begin expo-build-properties - expo prebuild (DO NOT MODIFY)
...
# @generated end expo-build-properties