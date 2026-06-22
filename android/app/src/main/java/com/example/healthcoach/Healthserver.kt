package com.example.healthcoach

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.util.Log
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import java.time.Duration
import java.time.Instant

class HealthServer(
    private val context: Context,
    private val repo: HealthRepository,
    port: Int = 8080
) : NanoHTTPD(port) {

    companion object {
        private const val TAG = "HealthServer"
        private const val BACKEND_URL = "http://10.45.8.88:5000/healthdata"
    }

    override fun serve(session: IHTTPSession): Response {
        val method = session.method
        val uri = session.uri

        Log.d(TAG, "Incoming: $method $uri")

        // ── CORS pre-flight ──────────────────────────────────────────────────
        if (method == Method.OPTIONS) {
            return corsResponse(newFixedLengthResponse(""))
        }

        return when {
            uri == "/healthdata"        && method == Method.POST -> handleHealthData(session)
            uri == "/ping"              && method == Method.GET  -> handlePing()
            uri == "/permissions"       && method == Method.GET  -> handleGetPermissions()
            uri == "/permissions/open"  && method == Method.POST -> handleOpenHealthConnect()
            else -> corsResponse(
                newFixedLengthResponse(
                    Response.Status.NOT_FOUND,
                    "application/json",
                    """{"error":"Not found"}"""
                )
            )
        }
    }

    // ── GET /permissions ─────────────────────────────────────────────────────
    private fun handleGetPermissions(): Response {
        val granted  = runBlocking { repo.getGrantedPermissions() }
        val required = repo.requiredPermissions()

        val isAndroid14Plus = Build.VERSION.SDK_INT >= 34
        val statusText = when {
            granted.size == required.size -> "All permissions granted"
            granted.isEmpty()             -> "No permissions granted"
            else                          -> "${granted.size}/${required.size} Permissions granted"
        }

        val body = JSONObject(mapOf(
            "granted"       to granted.size,
            "total"         to required.size,
            "all_granted"   to (granted.size == required.size),
            "status_text"   to statusText,
            "android_14_plus" to isAndroid14Plus
        )).toString()

        return corsResponse(
            newFixedLengthResponse(Response.Status.OK, "application/json", body)
        )
    }

    // ── POST /permissions/open ────────────────────────────────────────────────
    private fun handleOpenHealthConnect(): Response {
        Log.d(TAG, "handleOpenHealthConnect called")
        val activity = HealthServerManager.currentActivity
        Log.d(TAG, "currentActivity: $activity")
        return if (activity != null) {
            activity.runOnUiThread {
                try {
                    activity.permissionLauncher?.launch(HealthRepository(context).requiredPermissions())
                    Log.d(TAG, "Health Connect opened successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed: ${e.message}", e)
                }
            }
            corsResponse(
                newFixedLengthResponse(Response.Status.OK, "application/json", """{"success":true}""")
            )
        } else {
            Log.e(TAG, "No current activity available")
            corsResponse(
                newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    """{"success":false,"error":"Activity not available"}"""
                )
            )
        }
    }

    // ── GET /ping ────────────────────────────────────────────────────────────
    private fun handlePing(): Response =
        corsResponse(
            newFixedLengthResponse(
                Response.Status.OK,
                "application/json",
                """{"status":"ok"}"""
            )
        )

    // ── POST /healthdata ─────────────────────────────────────────────────────
    private fun handleHealthData(session: IHTTPSession): Response {
        // 1. Parse request body
        val userNote = try {
            val contentLength = session.headers["content-length"]?.toIntOrNull() ?: 0
            val bodyBytes = ByteArray(contentLength)
            session.inputStream.read(bodyBytes, 0, contentLength)
            val bodyStr = String(bodyBytes, Charsets.UTF_8)
            if (bodyStr.isNotBlank()) {
                JSONObject(bodyStr).optString("user_note", "")
            } else {
                ""
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not parse body: ${e.message}")
            ""
        }

        // 2. Collect health data (blocking — NanoHTTPD runs on its own thread pool)
        val payload: Map<String, Any> = try {
            runBlocking { collectHealthData(userNote) }
        } catch (e: Exception) {
            Log.e(TAG, "Health data collection failed", e)
            return corsResponse(
                newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    """{"error":"Health data collection failed: ${e.message}"}"""
                )
            )
        }

        // 3. Forward to FastAPI backend and STREAM its response back to React Native
        //    as it arrives, instead of waiting for the full body first.
        return try {
            val backendHttpResponse = NetworkClient.postJsonStreaming(BACKEND_URL, payload)

            if (!backendHttpResponse.isSuccessful) {
                val errorBody = backendHttpResponse.body?.string() ?: "Unknown backend error"
                backendHttpResponse.close()
                return corsResponse(
                    newFixedLengthResponse(
                        Response.Status.INTERNAL_ERROR,
                        "application/json",
                        """{"error":"Backend returned ${backendHttpResponse.code}: $errorBody"}"""
                    )
                )
            }

            val rawStream = backendHttpResponse.body?.byteStream()
                ?: throw Exception("Empty backend response body")

            // Wrap in a logging stream so we can see exactly when NanoHTTPD
            // pulls bytes out of it — confirms whether forwarding is truly
            // progressive or buffered somewhere.
            val bodyStream = object : java.io.InputStream() {
                override fun read(): Int = rawStream.read()
                override fun read(b: ByteArray, off: Int, len: Int): Int {
                    val n = rawStream.read(b, off, len)
                    Log.d(TAG, "[stream] read $n bytes at ${System.currentTimeMillis()}")
                    return n
                }
                override fun close() = rawStream.close()
            }

            // newChunkedResponse streams the InputStream directly to the client
            // as bytes become available — this is the key change that enables
            // real streaming all the way to React Native.
            val response = newChunkedResponse(
                Response.Status.OK,
                "text/plain",
                bodyStream
            )

            corsResponse(response)
        } catch (e: Exception) {
            Log.e(TAG, "Backend request failed", e)
            corsResponse(
                newFixedLengthResponse(
                    Response.Status.INTERNAL_ERROR,
                    "application/json",
                    """{"error":"Backend request failed: ${e.message}"}"""
                )
            )
        }
    }

    // ── Collect all health data from Health Connect ──────────────────────────
    private suspend fun collectHealthData(userNote: String): Map<String, Any> {
        val steps          = repo.getStepsLast24Hours()
        val (hrMin, hrMax) = repo.getHeartRateMinMaxLast24Hours()
        val restingHr      = repo.getRestingHeartRateLast24Hours()
        val totalCalories  = repo.getTotalCaloriesLast24Hours()
        val sleepSessions  = repo.getSleepSessionsLast24Hours()
        val exerciseSessions = repo.getExerciseSessionsLast24Hours()

        val sleepHours = sleepSessions.sumOf {
            Duration.between(it.startTime, it.endTime).toMinutes()
        } / 60.0

        val sleepStages = sleepSessions.flatMap { session ->
            session.stages.map { stage ->
                val stageName = when (stage.stage) {
                    1 -> "AWAKE"
                    2 -> "SLEEPING"
                    3 -> "OUT_OF_BED"
                    4 -> "LIGHT"
                    5 -> "DEEP"
                    6 -> "REM"
                    else -> "UNKNOWN"
                }
                mapOf(
                    "type"             to stageName,
                    "type_code"        to stage.stage,
                    "start"            to stage.startTime.toString(),
                    "end"              to stage.endTime.toString(),
                    "duration_minutes" to Duration.between(stage.startTime, stage.endTime).toMinutes()
                )
            }
        }

        val granted  = repo.getGrantedPermissions()
        val required = repo.requiredPermissions()

        return mapOf(
            "timestamp"                  to Instant.now().toString(),
            "user_note"                  to userNote,
            "steps_last_24h"             to steps,
            "heart_rate_min"             to hrMin,
            "heart_rate_max"             to hrMax,
            "total_calories_burned"      to totalCalories,
            "resting_heart_rate"         to restingHr,
            "sleep_hours"                to sleepHours,
            "sleep_sessions"             to sleepSessions.map {
                mapOf(
                    "start" to it.startTime.toString(),
                    "end"   to it.endTime.toString(),
                    "title" to (it.title ?: "Sleep"),
                    "notes" to (it.notes ?: "")
                )
            },
            "sleep_stages"               to sleepStages,
            "exercise_duration_minutes"  to exerciseSessions.sumOf { it.durationMinutes },
            "exercise_sessions"          to exerciseSessions.map {
                mapOf(
                    "type"             to it.type,
                    "duration_minutes" to it.durationMinutes,
                    "title"            to it.title
                )
            },
            "permissions_granted"        to granted.size,
            "permissions_total"          to required.size
        )
    }

    // ── Add CORS headers to any response ────────────────────────────────────
    private fun corsResponse(response: Response): Response {
        response.addHeader("Access-Control-Allow-Origin",  "*")
        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.addHeader("Access-Control-Allow-Headers", "Content-Type")
        return response
    }
}