$ErrorActionPreference='Stop'
$javaRoot=$env:JAVA_HOME
$androidJar=$env:ANDROID_JAR
$donutJar=$env:DONUT_PLUGIN_JAR
$kotlinJar=$env:KOTLIN_STDLIB_JAR
foreach($dependency in @($javaRoot,$androidJar,$donutJar,$kotlinJar)) {
  if(!$dependency -or !(Test-Path -LiteralPath $dependency)){throw 'Set JAVA_HOME, ANDROID_JAR, DONUT_PLUGIN_JAR and KOTLIN_STDLIB_JAR to installed dependencies.'}
}
$pluginId='wx0000000000000000'
$version='0.1.1'
$build=Join-Path $PSScriptRoot ('build\'+[DateTime]::Now.ToString('yyyyMMdd-HHmmss'))
$classes=Join-Path $build 'classes'
$aarDir=Join-Path $build 'aar'
$upload=Join-Path $build 'upload'
New-Item -ItemType Directory -Path $classes,$aarDir,$upload -Force | Out-Null
$sources=@(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot 'src') -Filter '*.java' -Recurse | ForEach-Object{$_.FullName})
& "$javaRoot\bin\javac.exe" -encoding UTF-8 -source 8 -target 8 -classpath "$androidJar;$donutJar;$kotlinJar" -d $classes @sources
if($LASTEXITCODE -ne 0){throw 'Native plugin compilation failed'}
$services=Join-Path $classes 'META-INF\services'
New-Item -ItemType Directory -Path $services -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'services\com.tencent.luggage.wxa.SaaA.plugin.NativePluginInterface'),(Join-Path $PSScriptRoot 'services\com.tencent.luggage.wxa.SaaA.plugin.NativePluginApplicationInterface') -Destination $services
& "$javaRoot\bin\jar.exe" cf (Join-Path $aarDir 'classes.jar') -C $classes .
if($LASTEXITCODE -ne 0){throw 'Jar packaging failed'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'AndroidManifest.xml') -Destination $aarDir
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'consumer-rules.pro') -Destination (Join-Path $aarDir 'proguard.txt')
& "$javaRoot\bin\jar.exe" cf (Join-Path $upload "$pluginId-$version.aar") -C $aarDir .
if($LASTEXITCODE -ne 0){throw 'AAR packaging failed'}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot "$pluginId-$version.pom") -Destination $upload
& "$javaRoot\bin\jar.exe" cf (Join-Path $build "$pluginId-$version.zip") -C $upload .
if($LASTEXITCODE -ne 0){throw 'Upload archive packaging failed'}
Get-FileHash -LiteralPath (Join-Path $build "$pluginId-$version.zip") -Algorithm SHA256
