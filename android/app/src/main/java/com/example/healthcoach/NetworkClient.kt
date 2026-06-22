package com.example.healthcoach

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import com.google.gson.Gson
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException
import java.io.InputStream

object NetworkClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(120, java.util.concurrent.TimeUnit.SECONDS)
        .writeTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()
    private val gson = Gson()

    // ── Original non-streaming method — kept for /permissions etc. ───────────
    fun postJson(url: String, payload: Any, callback: (success: Boolean, body: String?) -> Unit) {
        val json = gson.toJson(payload)
        val body = json.toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback(false, e.localizedMessage)
            }

            override fun onResponse(call: Call, response: Response) {
                callback(response.isSuccessful, response.body?.string())
                response.close()
            }
        })
    }

    // ── New streaming method ──────────────────────────────────────────────────
    // Makes the POST request synchronously (caller must be off the main thread —
    // NanoHTTPD's serve() already runs on its own thread pool, so this is safe)
    // and returns the raw response body InputStream so the caller can read it
    // progressively instead of waiting for the full body.
    //
    // IMPORTANT: the caller is responsible for closing the returned Response
    // once done reading, to release the underlying connection.
    fun postJsonStreaming(url: String, payload: Any): Response {
        val json = gson.toJson(payload)
        val body = json.toRequestBody("application/json; charset=utf-8".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .build()

        // .execute() is the synchronous OkHttp call — blocks until headers
        // arrive, but does NOT wait for the full body. The body stream stays
        // open for progressive reading.
        return client.newCall(request).execute()
    }
}