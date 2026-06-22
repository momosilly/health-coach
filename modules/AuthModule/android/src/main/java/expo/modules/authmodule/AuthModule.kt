package expo.modules.authmodule

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions
import net.openid.appauth.AuthorizationRequest
import net.openid.appauth.AuthorizationService
import net.openid.appauth.AuthorizationServiceConfiguration
import net.openid.appauth.ResponseTypeValues

class AuthModule : Module() {

    companion object {
        private const val TAG = "AuthModule"
        const val CLIENT_ID = "3b38fc18-fb0a-4285-ad33-258cd547e59a"
        const val REDIRECT_URI = "com.example.healthcoach://oauth2redirect"
        const val AUTH_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
        const val TOKEN_ENDPOINT = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

        const val PREFS_NAME = "auth_prefs"
        const val KEY_PENDING_TOKEN = "auth_token_pending"

        // Write token to EncryptedSharedPreferences — called by PermissionActivity
        fun storePendingToken(context: Context, token: String) {
            try {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                val prefs = EncryptedSharedPreferences.create(
                    context,
                    PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
                prefs.edit().putString(KEY_PENDING_TOKEN, token).apply()
                Log.d(TAG, "Pending token stored")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to store pending token", e)
            }
        }

        // Read and delete token — called by retrievePendingToken()
        fun consumePendingToken(context: Context): String? {
            return try {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()
                val prefs = EncryptedSharedPreferences.create(
                    context,
                    PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                )
                val token = prefs.getString(KEY_PENDING_TOKEN, null)
                prefs.edit().remove(KEY_PENDING_TOKEN).apply()
                Log.d(TAG, "Pending token consumed: ${if (token != null) "found" else "not found"}")
                token
            } catch (e: Exception) {
                Log.e(TAG, "Failed to consume pending token", e)
                null
            }
        }
    }

    override fun definition() = ModuleDefinition {
        Name("AuthModule")

        // Starts the Microsoft auth flow — fire and forget, no promise to resolve here
        AsyncFunction("authorize") { scopesArray: List<String>? ->
            val activity = appContext.activityProvider?.currentActivity
                ?: throw Exceptions.MissingActivity()

            val scopes = scopesArray ?: listOf("openid", "profile")

            val serviceConfig = AuthorizationServiceConfiguration(
                Uri.parse(AUTH_ENDPOINT),
                Uri.parse(TOKEN_ENDPOINT)
            )

            val authRequest = AuthorizationRequest.Builder(
                serviceConfig,
                CLIENT_ID,
                ResponseTypeValues.CODE,
                Uri.parse(REDIRECT_URI)
            )
                .setScopes(scopes)
                .build()

            // PermissionActivity lives in the main app module (com.example.healthcoach),
            // not this Expo module. Using setClassName() instead of Class.forName()
            // avoids classloading the class directly here — Android resolves it from
            // the manifest at dispatch time instead, which is more resilient to R8/
            // ProGuard stripping and avoids cross-module classloader issues.
            val redirectIntent = Intent().apply {
                setClassName(activity.packageName, "com.example.healthcoach.PermissionActivity")
            }
            val pendingIntent = PendingIntent.getActivity(
                activity,
                0,
                redirectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )

            val authService = AuthorizationService(activity)
            authService.performAuthorizationRequest(authRequest, pendingIntent)

            // Resolve immediately — RN will poll for the token via retrievePendingToken()
            null
        }

        // Called by RN after app resumes — reads and deletes the token from EncryptedSharedPreferences
        AsyncFunction("retrievePendingToken") {
            val context = appContext.reactContext
                ?: throw Exceptions.ReactContextLost()

            val token = consumePendingToken(context)
            if (token != null) {
                token
            } else {
                throw Exception("NO_TOKEN: No pending token found")
            }
        }
    }
}