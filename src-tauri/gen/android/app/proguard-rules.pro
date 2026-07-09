# Add project specific ProGuard rules here.

# 保留 GallerySaver 的 JavascriptInterface 方法（避免 R8 混淆移除）
-keep class com.perlerbead.studio.GallerySaver {
    @android.webkit.JavascriptInterface public <methods>;
}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable