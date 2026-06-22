package com.example.healthcoach

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.time.TimeRangeFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.temporal.ChronoUnit
import android.util.Log
import java.time.Duration
import android.os.Build

class HealthRepository(context: Context) {

    private val client: HealthConnectClient = HealthConnectClient.getOrCreate(context.applicationContext)

    // All permissions needed
    fun requiredPermissions(): Set<String> = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(HeartRateRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
        HealthPermission.getReadPermission(RestingHeartRateRecord::class),
        HealthPermission.getReadPermission(SleepSessionRecord::class),
        HealthPermission.getReadPermission(ExerciseSessionRecord::class)
    )

    // Get granted permissions
    suspend fun getGrantedPermissions(): Set<String> = withContext(Dispatchers.IO) {
        client.permissionController.getGrantedPermissions()
    }

    // Aggregate total steps last 24 hours
    suspend fun getStepsLast24Hours(): Long = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val result: AggregationResult = client.aggregate(request)
            result[StepsRecord.COUNT_TOTAL]?.toLong() ?: 0L
        } catch (e: Exception) {
            0L
        }
    }

    // Aggregate heart rate min/max last 24 hours
    suspend fun getHeartRateMinMaxLast24Hours(): Pair<Long, Long> = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = AggregateRequest(
                metrics = setOf(HeartRateRecord.BPM_MIN, HeartRateRecord.BPM_MAX),
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val result: AggregationResult = client.aggregate(request)
            val minHr = result[HeartRateRecord.BPM_MIN]?.toLong() ?: 0L
            val maxHr = result[HeartRateRecord.BPM_MAX]?.toLong() ?: 0L
            Pair(minHr, maxHr)
        } catch (e: Exception) {
            Pair(0L, 0L)
        }
    }

    // Get total calories burned last 24 hours
    suspend fun getTotalCaloriesLast24Hours(): Double = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = AggregateRequest(
                metrics = setOf(TotalCaloriesBurnedRecord.ENERGY_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val result: AggregationResult = client.aggregate(request)
            result[TotalCaloriesBurnedRecord.ENERGY_TOTAL]?.inKilocalories ?: 0.0
        } catch (e: Exception) {
            0.0
        }
    }

    // Get resting heart rate (most recent in last 24 hours)
    suspend fun getRestingHeartRateLast24Hours(): Long = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = ReadRecordsRequest(
                recordType = RestingHeartRateRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val response = client.readRecords(request)
            // Get the most recent resting heart rate
            response.records.lastOrNull()?.beatsPerMinute ?: 0L
        } catch (e: Exception) {
            0L
        }
    }

    // Get total sleep duration last 24 hours (in hours)
    suspend fun getSleepSessionsLast24Hours(): List<SleepSessionRecord> = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = ReadRecordsRequest(
                recordType = SleepSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val response = client.readRecords(request)
            response.records
        } catch (e: Exception) {
            emptyList()
        }
    }


    // Get exercise sessions last 24 hours
    suspend fun getExerciseSessionsLast24Hours(): List<ExerciseSessionData> = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val response = client.readRecords(request)

            response.records.map { session ->
                val duration = Duration.between(session.startTime, session.endTime)
                ExerciseSessionData(
                    type = session.exerciseType.toString(),
                    durationMinutes = duration.toMinutes(),
                    title = session.title ?: "Unknown"
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
    //test
    suspend fun logExerciseSources() = withContext(Dispatchers.IO) {
        try {
            val now = Instant.now()
            val start = now.minus(24, ChronoUnit.HOURS)
            val request = ReadRecordsRequest(
                recordType = ExerciseSessionRecord::class,
                timeRangeFilter = TimeRangeFilter.between(start, now)
            )
            val response = client.readRecords(request)

            Log.d("HC", "Found ${response.records.size} exercise sessions")
            response.records.forEach {
                Log.d("HC", "Exercise from: ${it.metadata.dataOrigin.packageName}")
            }
        } catch (e: Exception) {
            Log.e("HC", "Error reading exercise sources", e)
        }
    }

    // Get total exercise duration in minutes last 24 hours
    suspend fun getTotalExerciseDurationLast24Hours(): Long = withContext(Dispatchers.IO) {
        try {
            val sessions = getExerciseSessionsLast24Hours()
            sessions.sumOf { it.durationMinutes }
        } catch (e: Exception) {
            0L
        }
    }
}

// Data class for exercise sessions
data class ExerciseSessionData(
    val type: String,
    val durationMinutes: Long,
    val title: String
)