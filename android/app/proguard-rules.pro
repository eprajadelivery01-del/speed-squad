# ==============================================================================
# REGRAS DO PROGUARD / R8 — SPEED-SQUAD (APP DO ENTREGADOR É PRA JÁ)
# ==============================================================================

# 1. PRESERVAÇÃO TOTAL DO PACOTE NATIVO DO ENTREGADOR
# Nenhuma classe, método, campo ou anotação é renomeado ou removido.
-keep class com.eprajaentregador.** { *; }
-keepclassmembers class com.eprajaentregador.** { *; }
-keep interface com.eprajaentregador.** { *; }
-keep enum com.eprajaentregador.** { *; }

# 2. PRESERVAÇÃO TOTAL DO CAPACITOR E SUA BRIDGE JAVASCRIPT-NATIVO
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }

-keep public class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
    public *;
}
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep class * implements com.getcapacitor.PluginMethod { *; }

# 3. PRESERVAÇÃO DO CORDOVA E SEUS PLUGINS
-keep class org.apache.cordova.** { *; }
-keepclassmembers class org.apache.cordova.** { *; }

# 4. PRESERVAÇÃO DOS COMPONENTES NATIVOS DO ANDROID MANIFEST
-keep public class * extends android.app.Activity { *; }
-keep public class * extends android.app.Service { *; }
-keep public class * extends android.content.BroadcastReceiver { *; }
-keep public class * extends android.content.ContentProvider { *; }

# 5. PRESERVAÇÃO DO FIREBASE CLOUD MESSAGING E GOOGLE PLAY SERVICES
-keep class com.google.firebase.** { *; }
-keepclassmembers class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keepclassmembers class com.google.android.gms.** { *; }

# 6. ATRIBUTOS CRÍTICOS PARA REFLEXÃO, SERIALIZAÇÃO E LOGS DE CRASH
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
-dontwarn **
-ignorewarnings
