package id.jasakite.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.IOException;

/**
 * Cangkang WebView JASAKITE — seluruh fitur web berjalan di dalam sini.
 *
 * Yang WAJIB ditangani agar aplikasi terasa asli (bukan browser polos):
 * 1. Cookie + localStorage aktif — tanpa ini sesi login dan draft checkout
 *    hilang setiap aplikasi dibuka ulang.
 * 2. File chooser (galeri + kamera) — dipakai alur inti produk: unggah bukti
 *    transfer QRIS, bukti top-up, dan foto jasa.
 * 3. Tautan luar (WhatsApp share, telepon, domain lain) dibuka ke aplikasi
 *    yang tepat — jangan pernah mencoba memuat wa.me di dalam WebView.
 * 4. Tombol kembali = mundur dalam riwayat halaman, bukan keluar aplikasi.
 * 5. Halaman offline bawaan saat jaringan mati (WebView sendiri hanya
 *    menampilkan layar error bawaan yang membingungkan).
 *
 * UA diberi akhiran "JasakiteApp" — situs memakainya untuk mematikan banner
 * "Pasang aplikasi" yang menyesatkan di dalam aplikasi ini.
 */
public class MainActivity extends Activity {

    private static final String SITE_URL = "https://jasakite.vercel.app";
    private static final String SITE_HOST = "jasakite.vercel.app";
    private static final int REQUEST_FILE_CHOOSER = 1001;

    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private File pendingCameraFile;
    private boolean showingOfflinePage = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);          // localStorage draft/CSRF
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);            // hasil file chooser
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " JasakiteApp/1.0");

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true); // avatar CDN dsb.

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() == null ? "" : uri.getScheme();
                // Halaman milik sendiri dimuat di dalam; sisanya (wa.me,
                // mailto, tel, domain lain) diserahkan ke aplikasi sistem.
                boolean isOurs = ("https".equals(scheme) || "http".equals(scheme))
                        && SITE_HOST.equals(uri.getHost());
                if (isOurs) return false;
                openExternally(uri);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                showingOfflinePage = "file:///android_asset/offline.html".equals(url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request,
                                        WebResourceError error) {
                if (request.isForMainFrame()) showOfflinePage();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }
                fileChooserCallback = callback;
                openImageChooser();
                return true;
            }
        });

        // Unduhan (mis. membuka bukti transfer) diserahkan ke browser/unduhan sistem.
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, size) ->
                openExternally(Uri.parse(url)));

        setContentView(webView);
        if (savedInstanceState == null) {
            webView.loadUrl(SITE_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    private void showOfflinePage() {
        if (showingOfflinePage) return;
        showingOfflinePage = true;
        webView.loadUrl("file:///android_asset/offline.html");
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Tidak ada aplikasi untuk membuka tautan ini",
                    Toast.LENGTH_SHORT).show();
        }
    }

    /** Pemilih gambar: galeri ATAU kamera — dua sumber foto bukti transfer. */
    private void openImageChooser() {
        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        gallery.setType("image/*");

        Intent camera = null;
        try {
            // Harus di bawah cacheDir — persis root yang dideklarasikan
            // res/xml/file_paths.xml; lokasi lain membuat FileProvider melempar.
            pendingCameraFile = File.createTempFile(
                    "jasakite_", ".jpg", getCacheDir());
            Uri photoUri = FileProvider.getUriForFile(this,
                    "id.jasakite.app.fileprovider", pendingCameraFile);
            camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
        } catch (IOException e) {
            pendingCameraFile = null;
        }

        Intent chooser = Intent.createChooser(gallery, "Pilih atau jepret foto");
        if (camera != null) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
        }
        startActivityForResult(chooser, REQUEST_FILE_CHOOSER);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode != REQUEST_FILE_CHOOSER) {
            super.onActivityResult(requestCode, resultCode, data);
            return;
        }
        if (fileChooserCallback == null) return;

        Uri[] result = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getData() != null) {
                result = new Uri[]{ data.getData() };
            } else if (pendingCameraFile != null && pendingCameraFile.exists()
                    && pendingCameraFile.length() > 0) {
                // Kamera menulis ke file lewat EXTRA_OUTPUT — data Intent kosong.
                result = new Uri[]{ Uri.fromFile(pendingCameraFile) };
            }
        }
        fileChooserCallback.onReceiveValue(result);
        fileChooserCallback = null;
        pendingCameraFile = null;
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack() && !showingOfflinePage) {
            webView.goBack();
        } else if (showingOfflinePage) {
            webView.loadUrl(SITE_URL); // dari halaman offline, "kembali" = coba lagi
        } else {
            super.onBackPressed();
        }
    }
}
