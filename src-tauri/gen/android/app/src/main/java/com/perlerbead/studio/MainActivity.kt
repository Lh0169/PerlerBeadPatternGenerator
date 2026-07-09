package com.perlerbead.studio

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/** 提供给 WebView 的相册存储接口 */
class GallerySaver(private val context: Context) {
    @JavascriptInterface
    fun savePng(base64Data: String, filename: String): String {
        val bytes = Base64.decode(base64Data, Base64.DEFAULT)
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/png")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/拼豆图纸")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        }

        val resolver = context.contentResolver
        val uri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            ?: throw RuntimeException("无法创建图片文件")

        resolver.openOutputStream(uri)?.use { stream ->
            stream.write(bytes)
        } ?: throw RuntimeException("无法写入图片数据")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            values.clear()
            values.put(MediaStore.Images.Media.IS_PENDING, 0)
            resolver.update(uri, values, null, null)
        }

        return uri.toString()
    }
}

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    // 注入相册存储接口，JS 侧通过 window._gallerySaver.savePng(base64, filename) 调用
    webView.addJavascriptInterface(GallerySaver(this), "_gallerySaver")

    // 读取系统状态栏真实高度（px），转为 dp 注入为 CSS 变量（取半值避免标题栏间距过大）
    val density = resources.displayMetrics.density
    val resourceId = resources.getIdentifier("status_bar_height", "dimen", "android")
    val statusBarHeightPx = if (resourceId > 0) resources.getDimensionPixelSize(resourceId) else 0
    val statusBarHeightDp = (statusBarHeightPx / density / 2).toInt()

    // 注入 CSS 变量 + 平台标识（在页面加载前执行，确保 JS 侧检测可靠）
    val script = """
      document.documentElement.style.setProperty('--status-bar-height', '${statusBarHeightDp}px');
      window.__PLATFORM__ = 'android';
      console.log('[Native] 状态栏高度: ${statusBarHeightDp}dp, 平台: android');
    """.trimIndent()

    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addDocumentStartJavaScript(webView, script, setOf("*"))
    } else {
      webView.evaluateJavascript(
        "(function(){function s(){document.documentElement.style.setProperty('--status-bar-height','${statusBarHeightDp}px');window.__PLATFORM__='android';console.log('[Native] statusBar:${statusBarHeightDp}dp');}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',s)}else{s()}})();",
        null
      )
    }
  }
}
