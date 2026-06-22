package com.example.healthcoach

import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.PermissionController
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

    var permissionLauncher: ActivityResultLauncher<Set<String>>? = null

    override fun getMainComponentName(): String = "main"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = HealthRepository(this)
        permissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) { _ -> }
    }

    override fun onResume() {
        super.onResume()
        HealthServerManager.currentActivity = this
    }

    override fun onDestroy() {
        super.onDestroy()
        HealthServerManager.currentActivity = null
    }
}
