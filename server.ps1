param(
  [int]$Port = 4173
)

$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:${Port}/")

$mimeTypes = @{
  ".html"        = "text/html; charset=utf-8"
  ".css"         = "text/css; charset=utf-8"
  ".js"          = "text/javascript; charset=utf-8"
  ".json"        = "application/json; charset=utf-8"
  ".svg"         = "image/svg+xml"
  ".png"         = "image/png"
  ".ico"         = "image/x-icon"
  ".mp4"         = "video/mp4"
  ".webm"        = "video/webm"
  ".mp3"         = "audio/mpeg"
  ".wav"         = "audio/wav"
}

try {
  $listener.Start()
  Write-Host ""
  Write-Host "  拾集已启动" -ForegroundColor Green
  Write-Host "  本机访问: http://localhost:$Port" -ForegroundColor Cyan
  Write-Host "  按 Ctrl+C 停止服务"
  Write-Host ""

  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    try {
      $relativePath = [System.Uri]::UnescapeDataString(
        $request.Url.AbsolutePath.TrimStart("/")
      )
      if ([string]::IsNullOrWhiteSpace($relativePath)) {
        $relativePath = "index.html"
      }

      $candidate = [System.IO.Path]::GetFullPath((Join-Path $root $relativePath))
      $rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

      if ($candidate -ne $root -and -not $candidate.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        $response.StatusCode = 403
      } elseif (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = Join-Path $candidate "index.html"
      }

      if ($response.StatusCode -eq 200 -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $extension = [System.IO.Path]::GetExtension($candidate).ToLowerInvariant()
        $response.ContentType = if ($mimeTypes.ContainsKey($extension)) {
          $mimeTypes[$extension]
        } else {
          "application/octet-stream"
        }
        $response.Headers["Cache-Control"] = if ($extension -eq ".html") {
          "no-cache"
        } else {
          "public, max-age=3600"
        }

        $bytes = [System.IO.File]::ReadAllBytes($candidate)
        $response.ContentLength64 = $bytes.Length
        if ($request.HttpMethod -ne "HEAD") {
          $response.OutputStream.Write($bytes, 0, $bytes.Length)
        }
      } elseif ($response.StatusCode -eq 200) {
        $response.StatusCode = 404
        $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
        $response.ContentType = "text/plain; charset=utf-8"
        $response.ContentLength64 = $body.Length
        $response.OutputStream.Write($body, 0, $body.Length)
      }
    } catch {
      $response.StatusCode = 500
    } finally {
      $response.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
