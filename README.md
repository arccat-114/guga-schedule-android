# Guga Schedule for Android / 咕嘎课程表

[Download the latest APK](https://github.com/arccat-114/guga-schedule-android/releases/latest/download/guga-schedule.apk)

An Android edition of my WeChat Mini Program coursework, built with the WeChat Donut multi-platform framework. It supports importing and viewing a personal Beijing Information Science and Technology University timetable.

I am sharing the sanitized original source under the MIT license. If you find it useful, a star is welcome. [Visit my GitHub profile](https://github.com/arccat-114).

## Source and tests

`miniprogram/` contains the pages, timetable logic and school client. `native-notifications/` contains the Android Java plugin, manifest, service descriptors and AAR build script. `tests/` contains mocked frontend, authentication, scheduling and native test sources.

With Node.js installed:

```sh
npm ci --prefix miniprogram
npm test
```

Tests use synthetic credentials and do not log into a real school account. Legacy WeChat cloud deployment code and cloud-only tests are omitted; the public summer-term test covers the Android frontend.

## Build your own APK

1. Register your own Donut application and Android plugin in WeChat Developer Tools.
2. Set your app ID in `project.config.json`. Replace `wx0000000000000000` in the native package directory names, source, service descriptors, POM, build script, `project.miniapp.json` and `miniprogram/utils/local-notifications.js` with your own plugin ID. The app ID and plugin ID are separate values.
3. Configure your own multi-platform binding in `miniprogram/app.miniapp.json`, Android package name, icons and signing certificate. Personal bindings and the character artwork are excluded.
4. Install Java 17, Android API 35, the official Donut plugin SDK 1.0.10 and Kotlin stdlib 1.7.21 (the versions used by this snapshot). Set `JAVA_HOME`, `ANDROID_JAR`, `DONUT_PLUGIN_JAR` and `KOTLIN_STDLIB_JAR`, then run `native-notifications/build.ps1` with PowerShell.
5. Integrate/upload the AAR through your own Donut plugin project, set its version in the app configuration, build npm dependencies in Developer Tools, then build and sign your APK. Runtime versions are recorded in `project.miniapp.json`.

[Official native plugin guide](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/miniapp/handbook/plugin/androidPlugin.html)

The public school endpoints describe the supported authentication protocol; they are not credentials. Native features and real school login still need real-device testing.

## Sanitized source and license

Private IDE configuration, personal platform bindings, cloud deployment settings, credentials, user/device data, keys, SDK binaries, npm bundles and build outputs are excluded. Sample course names, rooms and owner are fictional; date/week patterns are retained as test fixtures.

The [MIT license](LICENSE) covers original source. See [third-party notices](THIRD_PARTY_NOTICES.md) for dependencies, the Donut runtime and excluded character artwork. Downloadable APKs contain third-party components with their own licensing terms.

## Classroom trial

- Open the download link in a browser, install the APK, and sign in with your own school account to import your timetable.
- Scheduled course reminders and next-day summaries are experimental and may fail in the background.
- The current trial uses the existing debug certificate. A future change to the signing certificate may require reinstalling the app.
- This is the tested development build, which includes JavaScript debugging resources and source maps inside the APK.
- The APK predates this sanitized source publication. Desktop widgets and saved-credential one-tap refresh are planned; background reminders remain unreliable.

The latest-download URL stays the same when a new release includes an asset named `guga-schedule.apk` and is marked as the latest release.
