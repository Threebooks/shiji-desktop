param(
  [string]$ElectronVersion = "45.2.3"
)

$ErrorActionPreference = "Stop"
$desktopRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$projectRoot = [System.IO.Path]::GetFullPath((Split-Path $desktopRoot -Parent))
$buildRoot = Join-Path $projectRoot ".desktop-build"
$releaseRoot = Join-Path $projectRoot "release"
$package = Get-Content -Raw -Encoding UTF8 (Join-Path $desktopRoot "package.json") | ConvertFrom-Json
$version = $package.version
$appRoot = Join-Path $releaseRoot "拾集"
$zipPath = Join-Path $releaseRoot "拾集-第二测试版-$version-Windows-x64.zip"
$electronZip = Join-Path $buildRoot "electron-v$ElectronVersion-win32-x64.zip"
$electronDir = Join-Path $buildRoot "electron-v$ElectronVersion-win32-x64"
$electronUrl = "https://github.com/electron/electron/releases/download/v$ElectronVersion/electron-v$ElectronVersion-win32-x64.zip"
$rceditPath = Join-Path $buildRoot "rcedit-x64.exe"
$rceditUrl = "https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe"

New-Item -ItemType Directory -Path $buildRoot -Force | Out-Null
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null

if (-not (Test-Path -LiteralPath $electronZip)) {
  Write-Host "下载 Electron $ElectronVersion ..."
  Invoke-WebRequest -Uri $electronUrl -OutFile $electronZip
}

if (-not (Test-Path -LiteralPath $rceditPath)) {
  Write-Host "下载 Windows 图标与版本信息工具 ..."
  Invoke-WebRequest -Uri $rceditUrl -OutFile $rceditPath
}

if (Test-Path -LiteralPath $electronDir) {
  [System.IO.Directory]::Delete($electronDir, $true)
}
Expand-Archive -LiteralPath $electronZip -DestinationPath $electronDir

if (Test-Path -LiteralPath $appRoot) {
  [System.IO.Directory]::Delete($appRoot, $true)
}
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
Copy-Item -Path (Join-Path $electronDir "*") -Destination $appRoot -Recurse -Force

$exePath = Join-Path $appRoot "electron.exe"
$renamedExePath = Join-Path $appRoot "拾集.exe"
if (-not (Test-Path -LiteralPath $exePath)) {
  throw "Electron 压缩包中未找到 electron.exe。"
}
Move-Item -LiteralPath $exePath -Destination $renamedExePath

$resourcesRoot = Join-Path $appRoot "resources"
$defaultApp = Join-Path $resourcesRoot "default_app.asar"
if (Test-Path -LiteralPath $defaultApp) {
  Remove-Item -LiteralPath $defaultApp -Force
}

$packagedApp = Join-Path $resourcesRoot "app"
New-Item -ItemType Directory -Path $packagedApp -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $desktopRoot "package.json") -Destination $packagedApp
Copy-Item -LiteralPath (Join-Path $desktopRoot "main.js") -Destination $packagedApp
Copy-Item -LiteralPath (Join-Path $desktopRoot "preload.js") -Destination $packagedApp
Copy-Item -LiteralPath (Join-Path $desktopRoot "icon.png") -Destination $packagedApp

$wwwRoot = Join-Path $packagedApp "www"
New-Item -ItemType Directory -Path $wwwRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "index.html") -Destination $wwwRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "app.css") -Destination $wwwRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "js") -Destination $wwwRoot -Recurse
New-Item -ItemType Directory -Path (Join-Path $wwwRoot "assets") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\icon.svg") -Destination (Join-Path $wwwRoot "assets")
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\author-avatar.jpg") -Destination (Join-Path $wwwRoot "assets")
New-Item -ItemType Directory -Path (Join-Path $wwwRoot "assets\demo") -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\demo\recording-preview.mp4") -Destination (Join-Path $wwwRoot "assets\demo")
Copy-Item -LiteralPath (Join-Path $projectRoot "assets\release") -Destination (Join-Path $wwwRoot "assets") -Recurse

$pngBytes = [System.IO.File]::ReadAllBytes((Join-Path $desktopRoot "icon.png"))
$icoPath = Join-Path $desktopRoot "icon.ico"
$stream = [System.IO.File]::Create($icoPath)
$writer = [System.IO.BinaryWriter]::new($stream)
try {
  $writer.Write([UInt16]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]1)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([Byte]0)
  $writer.Write([UInt16]1)
  $writer.Write([UInt16]32)
  $writer.Write([UInt32]$pngBytes.Length)
  $writer.Write([UInt32]22)
  $writer.Write($pngBytes)
} finally {
  $writer.Dispose()
  $stream.Dispose()
}

& $rceditPath $renamedExePath `
  --set-icon $icoPath `
  --set-file-version $version `
  --set-product-version $version `
  --set-version-string "CompanyName" "YinL." `
  --set-version-string "FileDescription" "拾集 · 本地资源与创作素材管理（第二测试版）" `
  --set-version-string "ProductName" "拾集 第二测试版" `
  --set-version-string "LegalCopyright" "Copyright © 2026 YinL."
if ($LASTEXITCODE -ne 0) {
  throw "写入 Windows 应用图标失败。"
}

Copy-Item -LiteralPath (Join-Path $desktopRoot "使用说明.txt") -Destination $appRoot
Copy-Item -LiteralPath (Join-Path $projectRoot "RELEASE_NOTES.md") -Destination $appRoot

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $appRoot -DestinationPath $zipPath -CompressionLevel Optimal

$hash = Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
"$($hash.Hash) *$([System.IO.Path]::GetFileName($zipPath))" |
  Set-Content -LiteralPath (Join-Path $releaseRoot "SHA256SUMS.txt") -Encoding utf8

Write-Host ""
Write-Host "桌面版构建完成：" -ForegroundColor Green
Write-Host "  可运行目录：$appRoot"
Write-Host "  压缩包：$zipPath"
Write-Host "  大小：$([Math]::Round((Get-Item -LiteralPath $zipPath).Length / 1MB, 1)) MB"
