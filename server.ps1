param([int]$port = 8080)

# 현재 실행 위치(CWD)를 루트 디렉토리로 사용 (한글 경로 인코딩 문제 원천 차단)
$root = (Get-Location).Path

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Prefixes.Add("http://127.0.0.1:$port/")

try {
    $listener.Start()
} catch {
    $port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Prefixes.Add("http://127.0.0.1:$port/")
    $listener.Start()
}

Write-Host "Localhost server running at http://localhost:$port/ from root: $root"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        $rawPath = $req.Url.AbsolutePath

        # ⚡ 로컬 번역 프록시 엔드포인트 (브라우저 CORS 및 봇 차단 100% 우회)
        if ($rawPath -eq "/api/translate") {
            Add-Type -AssemblyName System.Web -ErrorAction SilentlyContinue
            $rawQuery = ""
            if ($req.RawUrl -match "\?(.*)$") { $rawQuery = $matches[1] }
            $parsedQuery = [System.Web.HttpUtility]::ParseQueryString($rawQuery, [System.Text.Encoding]::UTF8)
            $q = $parsedQuery["q"]
            $sl = $parsedQuery["sl"]
            if ([string]::IsNullOrWhiteSpace($sl)) { $sl = "ko" }
            $tl = $parsedQuery["tl"]
            if ([string]::IsNullOrWhiteSpace($tl)) { $tl = "ja" }

            $translated = ""
            $pron = ""

            # 1차: Google Chrome 공식 확장 엔드포인트 (차단 없음, 딜레이 제로)
            try {
                $encQ = [System.Uri]::EscapeDataString($q)
                $cUrl = "https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=$sl&tl=$tl&q=$encQ"
                $wr = [System.Net.WebRequest]::Create($cUrl)
                $wr.Timeout = 4000
                $wr.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                $wres = $wr.GetResponse()
                $sr = New-Object System.IO.StreamReader($wres.GetResponseStream(), [System.Text.Encoding]::UTF8)
                $rawJson = $sr.ReadToEnd()
                $sr.Close()
                $wres.Close()

                $parsed = ConvertFrom-Json $rawJson
                if ($parsed -is [array] -and $parsed.Count -gt 0) {
                    $translated = [string]$parsed[0]
                } elseif ($parsed -is [string]) {
                    $translated = $parsed
                }
            } catch {
                Write-Host "Clients5 error: $_"
            }

            # 2차 백업: MyMemory
            if ([string]::IsNullOrWhiteSpace($translated)) {
                try {
                    $encQ = [System.Uri]::EscapeDataString($q)
                    $mUrl = "https://api.mymemory.translated.net/get?q=$encQ&langpair=$sl|$tl"
                    $wr = [System.Net.WebRequest]::Create($mUrl)
                    $wr.Timeout = 4000
                    $wres = $wr.GetResponse()
                    $sr = New-Object System.IO.StreamReader($wres.GetResponseStream(), [System.Text.Encoding]::UTF8)
                    $rawJson = $sr.ReadToEnd()
                    $sr.Close()
                    $wres.Close()

                    $parsed = ConvertFrom-Json $rawJson
                    if ($parsed.responseData -and $parsed.responseData.translatedText) {
                        $tText = $parsed.responseData.translatedText
                        if (-not $tText.StartsWith("MYMEMORY WARNING")) {
                            $translated = $tText
                        }
                    }
                } catch {}
            }

            if ([string]::IsNullOrWhiteSpace($translated)) { $translated = $q }

            $jsonObj = [PSCustomObject]@{
                translated = $translated
                pron = $pron
                sl = $sl
                tl = $tl
            }
            $jsonOut = ConvertTo-Json $jsonObj
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonOut)

            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.AddHeader("Access-Control-Allow-Origin", "*")
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.OutputStream.Close()
            continue
        }

        if ([string]::IsNullOrWhiteSpace($rawPath) -or $rawPath -eq "/") {
            $rel = "index.html"
        } else {
            $rel = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
        }

        $rel = $rel -replace "/", "\"
        $fullPath = Join-Path $root $rel

        if (Test-Path $fullPath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $ct = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) { $ct = $mimeTypes[$ext] }

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $res.ContentType = $ct
            $res.ContentLength64 = $bytes.Length
            $res.AddHeader("Access-Control-Allow-Origin", "*")
            $res.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("File not found: $rel")
            $res.OutputStream.Write($err, 0, $err.Length)
        }
        $res.OutputStream.Close()
    } catch {
        # ignore error
    }
}
