/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.danclark.bookmarks;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.trusted.TrustedWebActivityIntent;

import com.google.androidbrowserhelper.trusted.TwaLauncher;

public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {

    // androidbrowserhelper always launches the Trusted Web Activity with
    // COLOR_SCHEME_SYSTEM, which makes Chrome apply its own automatic
    // dark-mode darkening to the page whenever the phone is in system dark
    // mode -- overriding this app's own light/dark toggle. Forcing
    // COLOR_SCHEME_LIGHT here stops Chrome from doing that, so the page's
    // own CSS (which already handles both themes) is what actually renders.
    @Override
    protected TwaLauncher createTwaLauncher() {
        return new TwaLauncher(this) {
            @Override
            protected TrustedWebActivityIntent onPrepareIntent(TrustedWebActivityIntent intent) {
                intent.getIntent().putExtra(
                        CustomTabsIntent.EXTRA_COLOR_SCHEME,
                        CustomTabsIntent.COLOR_SCHEME_LIGHT);
                return super.onPrepareIntent(intent);
            }
        };
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();

        

        return uri;
    }
}
