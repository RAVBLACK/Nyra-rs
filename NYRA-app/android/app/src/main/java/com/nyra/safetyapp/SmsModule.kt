package com.nyra.safetyapp

import android.telephony.SmsManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableArray
import android.util.Log

class SmsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmsModule"
    }

    @ReactMethod
    fun sendSms(phoneNumber: String, message: String, promise: Promise) {
        try {
            Log.d("SmsModule", "Attempting to send SMS to: $phoneNumber")
            
            val smsManager = SmsManager.getDefault()
            
            // For long messages, divide into multiple parts
            val parts = smsManager.divideMessage(message)
            
            if (parts.size == 1) {
                // Single part message
                smsManager.sendTextMessage(phoneNumber, null, message, null, null)
                Log.d("SmsModule", "SMS sent successfully to: $phoneNumber")
                promise.resolve("SMS sent successfully")
            } else {
                // Multi-part message
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
                Log.d("SmsModule", "Multi-part SMS sent successfully to: $phoneNumber")
                promise.resolve("Multi-part SMS sent successfully")
            }
            
        } catch (e: Exception) {
            Log.e("SmsModule", "Failed to send SMS to: $phoneNumber", e)
            promise.reject("SMS_ERROR", "Failed to send SMS: ${e.message}", e)
        }
    }

    @ReactMethod
    fun sendSmsToMultiple(phoneNumbers: ReadableArray, message: String, promise: Promise) {
        try {
            val successCount = mutableListOf<String>()
            val failedCount = mutableListOf<String>()
            
            for (i in 0 until phoneNumbers.size()) {
                val phoneNumber = phoneNumbers.getString(i) ?: continue
                
                try {
                    val smsManager = SmsManager.getDefault()
                    val parts = smsManager.divideMessage(message)
                    
                    if (parts.size == 1) {
                        smsManager.sendTextMessage(phoneNumber, null, message, null, null)
                    } else {
                        smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null)
                    }
                    
                    successCount.add(phoneNumber)
                    Log.d("SmsModule", "SMS sent to: $phoneNumber")
                    
                } catch (e: Exception) {
                    failedCount.add(phoneNumber)
                    Log.e("SmsModule", "Failed to send SMS to: $phoneNumber", e)
                }
            }
            
            val result = mapOf(
                "success" to successCount.size,
                "failed" to failedCount.size,
                "total" to phoneNumbers.size()
            )
            
            promise.resolve(com.facebook.react.bridge.Arguments.makeNativeMap(result))
            
        } catch (e: Exception) {
            Log.e("SmsModule", "Error in sendSmsToMultiple", e)
            promise.reject("SMS_ERROR", "Failed to send SMS: ${e.message}", e)
        }
    }
}
