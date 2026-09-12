package com.chipcolate.tesserone.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Per-instance selection, keyed like Expo `widget:cfg:<widgetId>`. */
object WidgetPrefs {
    private const val PREFS = "tesserone_widget_cfg"

    fun singleCardId(context: Context, appWidgetId: Int): String? {
        val raw = prefs(context).getString(key(appWidgetId), null) ?: return null
        return runCatching { JSONObject(raw).optString("cardId").takeIf { it.isNotEmpty() } }
            .getOrNull()
    }

    fun listCardIds(context: Context, appWidgetId: Int): List<String> {
        val raw = prefs(context).getString(key(appWidgetId), null) ?: return emptyList()
        return runCatching {
            val arr = JSONObject(raw).optJSONArray("cardIds") ?: JSONArray()
            (0 until arr.length()).mapNotNull { arr.optString(it).takeIf { id -> id.isNotEmpty() } }
        }.getOrDefault(emptyList())
    }

    fun saveSingle(context: Context, appWidgetId: Int, cardId: String) {
        prefs(context).edit().putString(key(appWidgetId), JSONObject().put("cardId", cardId).toString()).apply()
    }

    fun saveList(context: Context, appWidgetId: Int, cardIds: List<String>) {
        val arr = JSONArray()
        cardIds.forEach { arr.put(it) }
        prefs(context).edit().putString(key(appWidgetId), JSONObject().put("cardIds", arr).toString()).apply()
    }

    fun clear(context: Context, appWidgetIds: IntArray) {
        val editor = prefs(context).edit()
        appWidgetIds.forEach { editor.remove(key(it)) }
        editor.apply()
    }

    fun isSingleCard(context: Context, appWidgetId: Int): Boolean {
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return true
        val info = AppWidgetManager.getInstance(context).getAppWidgetInfo(appWidgetId) ?: return true
        return info.provider.className.endsWith("SingleCardWidgetReceiver")
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun key(appWidgetId: Int) = "widget:cfg:$appWidgetId"
}
