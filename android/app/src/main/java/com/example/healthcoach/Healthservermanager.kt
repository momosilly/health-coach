package com.example.healthcoach

import android.content.Context
import android.util.Log

/**
 * Singleton that owns the [HealthServer] instance.
 *
 * Using a singleton means:
 *  - The server is started once from PermissionActivity and keeps running.
 *  - MainActivity (RN) never needs to touch it.
 *  - If PermissionActivity is recreated (e.g. rotation), start() is a no-op.
 */
object HealthServerManager {

    private const val TAG = "HealthServerManager"
    const val PORT = 8765

    var currentActivity: MainActivity? = null

    @Volatile
    private var server: HealthServer? = null

    /** Start the server. Safe to call multiple times — only starts once. */
    fun start(context: Context, repo: HealthRepository) {
        Log.d(TAG, "start() called — current server alive: ${server?.isAlive}")

        server?.let {
            if (it.isAlive) {
                it.stop()
                Log.d(TAG, "Stopped existing server")
            }
        }
        server = null

        val s = HealthServer(context.applicationContext, repo, PORT)
        s.start()
        server = s
        Log.d(TAG, "Server started — isAlive: ${s.isAlive}, port: ${s.listeningPort}")
    }

    /** Stop the server (call from Application.onTerminate or a shutdown hook). */
    fun stop() {
        Log.d(TAG, "stop() called from: ${Thread.currentThread().stackTrace.take(5).joinToString()}")
        server?.let {
            if (it.isAlive) {
                it.stop()
                Log.d(TAG, "Server stopped")
            }
        }
        server = null
    }

    val isRunning: Boolean get() = server?.isAlive == true
}