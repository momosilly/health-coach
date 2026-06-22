package com.example.healthcoach

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.lifecycle.lifecycleScope
import expo.modules.authmodule.AuthModule
import net.openid.appauth.AuthorizationException
import net.openid.appauth.AuthorizationResponse
import net.openid.appauth.AuthorizationService
import net.openid.appauth.TokenRequest
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class PermissionActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "PermissionActivity"
        const val AUTH_ACTION = "com.example.healthcoach.HANDLE_AUTH_RESPONSE"
        const val REDIRECT_SCHEME = "com.example.healthcoach"
        const val REDIRECT_HOST = "oauth2redirect"
    }

    lateinit var repo: HealthRepository
    var permissionLauncher: ActivityResultLauncher<Set<String>>? = null
    private lateinit var requestPermissionLauncher: ActivityResultLauncher<Set<String>>
    private var authService: AuthorizationService? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Log.d(TAG, "onCreate called. intent.data=${intent?.data}, scheme=${intent?.data?.scheme}, host=${intent?.data?.host}")

        // If this is an auth redirect, handle it and finish immediately
        if (isAuthRedirectIntent(intent)) {
            Log.d(TAG, "onCreate: detected auth redirect intent")
            authService = AuthorizationService(this)
            handleAuthIntent(intent)
            return
        } else {
            Log.d(TAG, "onCreate: NOT an auth redirect intent, proceeding to normal launch flow")
        }

        // Register permission launcher
        requestPermissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { _ ->
            lifecycleScope.launch {
                checkAndProceed()
            }
        }
        permissionLauncher = requestPermissionLauncher

        lifecycleScope.launch { checkAndProceed() }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        Log.d(TAG, "onNewIntent called. intent.data=${intent?.data}, scheme=${intent?.data?.scheme}, host=${intent?.data?.host}")
        if (intent != null && isAuthRedirectIntent(intent)) {
            Log.d(TAG, "onNewIntent: detected auth redirect intent")
            authService = AuthorizationService(this)
            handleAuthIntent(intent)
        } else {
            Log.d(TAG, "onNewIntent: NOT an auth redirect intent")
        }
    }

    private fun isAuthRedirectIntent(intent: Intent?): Boolean {
        val data: Uri? = intent?.data
        return data != null &&
                data.scheme == REDIRECT_SCHEME &&
                data.host == REDIRECT_HOST
    }

    private fun handleAuthIntent(intent: Intent?) {
        if (intent == null) {
            Log.e(TAG, "handleAuthIntent: intent is null")
            finish()
            return
        }

        val resp = AuthorizationResponse.fromIntent(intent)
        val ex = AuthorizationException.fromIntent(intent)

        Log.d(TAG, "handleAuthIntent: resp=${resp != null}, ex=${ex?.errorDescription}")

        if (resp == null) {
            Log.e(TAG, "handleAuthIntent: no auth response, error=${ex?.errorDescription}")
            val mainIntent = Intent(applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(mainIntent)
            finish()
            return
        }

        val tokenRequest: TokenRequest = resp.createTokenExchangeRequest()
        Log.d(TAG, "handleAuthIntent: starting token exchange")

        authService?.performTokenRequest(tokenRequest) { tokenResponse, tokenEx ->
            if (tokenResponse?.accessToken != null) {
                Log.d(TAG, "handleAuthIntent: token exchange success")
                AuthModule.storePendingToken(applicationContext, tokenResponse.accessToken!!)
            } else {
                Log.e(TAG, "handleAuthIntent: token exchange failed, error=${tokenEx?.errorDescription}")
            }
            val mainIntent = Intent(applicationContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(mainIntent)
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        authService?.dispose()
    }

    private suspend fun checkAndProceed() {
        // ── 1. Check Health Connect availability ─────────────────────────────
        val isAndroid14Plus = Build.VERSION.SDK_INT >= 34
        val packageName = if (isAndroid14Plus) {
            "com.android.healthconnect.controller"
        } else {
            "com.google.android.apps.healthdata"
        }

        val sdkStatus = HealthConnectClient.getSdkStatus(this, packageName)
        Log.d(TAG, "Android API: ${Build.VERSION.SDK_INT}, isAndroid14Plus: $isAndroid14Plus")
        Log.d(TAG, "SDK Status: $sdkStatus")

        if (sdkStatus != HealthConnectClient.SDK_AVAILABLE) {
            Log.e(TAG, "Health Connect not available (status=$sdkStatus)")
            return
        }

        // ── 2. Initialise repo ───────────────────────────────────────────────
        if (!::repo.isInitialized) {
            repo = HealthRepository(this)
        }

        // ── 3. Start server ──────────────────────────────────────────────────
        try {
            Log.d(TAG, "Starting server...")
            HealthServerManager.start(applicationContext, repo)
            Log.d(TAG, "Server started — isRunning: ${HealthServerManager.isRunning}")
        } catch (e: Exception) {
            Log.e(TAG, "Server start failed", e)
            return
        }

        // ── 4. Hand off to React Native ──────────────────────────────────────
        delay(400)
        startActivity(Intent(this, MainActivity::class.java))
        finish()
    }
}