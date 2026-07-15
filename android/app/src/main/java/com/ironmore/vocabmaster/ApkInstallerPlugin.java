package com.ironmore.vocabmaster;

import android.content.Intent;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Downloads a release APK to the app cache and hands it to the Android package
 * installer, so updates happen inside the app instead of bouncing to a browser.
 * Emits "downloadProgress" ({ progress: 0..1 }) events while fetching.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    @PluginMethod
    public void installApk(final PluginCall call) {
        final String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url");
            return;
        }
        new Thread(() -> {
            try {
                File apk = download(url);
                launchInstaller(apk);
                JSObject ret = new JSObject();
                ret.put("installed", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Download or install failed: " + e.getMessage(), e);
            }
        }).start();
    }

    private File download(String urlStr) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
        conn.setInstanceFollowRedirects(true);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);
        conn.connect();
        int code = conn.getResponseCode();
        if (code < 200 || code >= 300) throw new Exception("HTTP " + code);

        int total = conn.getContentLength();
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        File apk = new File(dir, "vocabmaster-update.apk");
        if (apk.exists()) apk.delete();

        InputStream in = conn.getInputStream();
        OutputStream out = new FileOutputStream(apk);
        try {
            byte[] buffer = new byte[8192];
            long downloaded = 0;
            int read;
            int lastPct = -1;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                downloaded += read;
                if (total > 0) {
                    int pct = (int) (downloaded * 100 / total);
                    if (pct != lastPct) {
                        lastPct = pct;
                        JSObject p = new JSObject();
                        p.put("progress", pct / 100.0);
                        notifyListeners("downloadProgress", p);
                    }
                }
            }
            out.flush();
        } finally {
            try { out.close(); } catch (Exception ignored) {}
            try { in.close(); } catch (Exception ignored) {}
            conn.disconnect();
        }
        return apk;
    }

    private void launchInstaller(File apk) {
        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }
}
