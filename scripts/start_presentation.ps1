[CmdletBinding()]
param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$presentationUrl = 'http://127.0.0.1:8080/?case=1'
$repositoryDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$frontendDirectory = Join-Path $repositoryDirectory 'frontend'
$artifactsDirectory = Join-Path $repositoryDirectory 'artifacts'

function Get-PresentationProbe {
    try {
        # Fixed loopback destination; do not follow redirects to another service.
        $response = Invoke-WebRequest -Uri $presentationUrl -UseBasicParsing -TimeoutSec 2 -MaximumRedirection 0
        $isPresentation = $response.StatusCode -eq 200 -and
            $response.Content -match '<title>\s*AIOps Observatory' -and
            $response.Content -match 'name="description"\s+content="AIOps Observatory:'
        return [pscustomobject]@{ Responded = $true; IsPresentation = [bool]$isPresentation }
    }
    catch {
        return [pscustomobject]@{ Responded = [bool]$_.Exception.Response; IsPresentation = $false }
    }
}

function Test-PresentationPort {
    # Include listeners on other local addresses instead of replacing another service.
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        if (@(Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue).Count -gt 0) {
            return $true
        }
    }
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $pending = $client.ConnectAsync('127.0.0.1', 8080)
        if ($pending.Wait(500)) { return $client.Connected }
        return $false
    }
    catch { return $false }
    finally { $client.Dispose() }
}

function Show-Presentation {
    Write-Host ''
    Write-Host ('Sunum hazır: ' + $presentationUrl) -ForegroundColor Green
    Write-Host 'Bu sayfa saklanmış gerçek vaka kaydını gösterir. Yeni AI çağrısı veya sisteme müdahale başlatmaz.'
    Write-Host 'Canlı operasyon paneli ayrıca yönetim hizmeti ve laboratuvar gerektirir.'
    if (-not $NoBrowser) {
        # Opening the requested presentation is the only visible process launch.
        Start-Process -FilePath $presentationUrl
    }
}

function Assert-FreePresentationPort {
    $probe = Get-PresentationProbe
    if ($probe.IsPresentation) { return $false }
    if ($probe.Responded -or (Test-PresentationPort)) {
        throw '8080 bağlantı noktası başka bir hizmet tarafından kullanılıyor. Hiçbir işlem durdurulmadı. Bu hizmeti kendin kapattıktan sonra sunumu yeniden açabilirsin.'
    }
    return $true
}

function Invoke-FrontendNpm {
    param(
        [string[]]$NpmArguments,
        [string]$LogName
    )
    $logPath = Join-Path $artifactsDirectory $LogName
    Write-Host ('Çalıştırılıyor: npm ' + ($NpmArguments -join ' '))
    $previousErrorPreference = $ErrorActionPreference
    try {
        # Native stderr warnings must not abort an otherwise successful npm command in Windows PowerShell.
        $ErrorActionPreference = 'Continue'
        & $npmExecutable '--prefix' $frontendDirectory @NpmArguments *> $logPath
        $npmExitCode = $LASTEXITCODE
    }
    finally { $ErrorActionPreference = $previousErrorPreference }
    if ($npmExitCode -ne 0) {
        throw ('Hazırlık tamamlanamadı. Ayrıntı günlüğü: ' + $logPath)
    }
}

try {
    if (-not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'package.json') -PathType Leaf)) {
        throw 'Sunum dosyaları bulunamadı. Bu başlatıcıyı aiops-agent proje klasöründen kullan.'
    }

    # Existing AIOps previews are reused before dependency checks, installs or builds.
    if (-not (Assert-FreePresentationPort)) {
        Write-Host 'Açık AIOps sunumu bulundu; yeniden derleme veya yeniden başlatma yapılmadı.'
        Show-Presentation
        exit 0
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $npmCommand -or -not $nodeCommand) {
        throw 'Node.js ve npm bulunamadı. Node.js kurulduktan sonra bu başlatıcıyı yeniden aç.'
    }
    $npmExecutable = $npmCommand.Source
    $nodeExecutable = $nodeCommand.Source
    New-Item -ItemType Directory -Path $artifactsDirectory -Force | Out-Null

    if (-not (Test-Path -LiteralPath (Join-Path $frontendDirectory 'node_modules') -PathType Container)) {
        Write-Host 'İlk açılış için bağımlılıklar indiriliyor. Bu adım internet bağlantısı gerektirir.'
        Invoke-FrontendNpm -NpmArguments @('ci', '--no-audit', '--no-fund') -LogName 'presentation-install.log'
    }

    $viteScript = Join-Path $frontendDirectory 'node_modules\vite\bin\vite.js'
    if (-not (Test-Path -LiteralPath $viteScript -PathType Leaf)) {
        throw 'Ön yüz bağımlılıkları eksik. frontend klasöründe npm ci komutunu çalıştırıp yeniden dene.'
    }
    Write-Host 'Sunum hazırlanıyor. Özel ayarlar ve giriş bilgileri değiştirilmez.'
    Invoke-FrontendNpm -NpmArguments @('run', 'build') -LogName 'presentation-build.log'

    # Another launch may have claimed the fixed port during the build.
    if (-not (Assert-FreePresentationPort)) {
        Write-Host 'Hazırlık sırasında açılmış AIOps sunumu kullanılacak.'
        Show-Presentation
        exit 0
    }

    $previewLog = Join-Path $artifactsDirectory 'presentation-preview.log'
    $previewErrorLog = Join-Path $artifactsDirectory 'presentation-preview-error.log'
    # Start-Process joins ArgumentList values; quote the complete script path for spaces and Unicode directories.
    $nodeArguments = @(('"' + $viteScript + '"'), 'preview', '--host', '127.0.0.1', '--port', '8080', '--strictPort')
    $preview = Start-Process -FilePath $nodeExecutable -ArgumentList $nodeArguments -WorkingDirectory $frontendDirectory -WindowStyle Hidden -RedirectStandardOutput $previewLog -RedirectStandardError $previewErrorLog -PassThru
    $deadline = (Get-Date).AddSeconds(15)
    do {
        $probe = Get-PresentationProbe
        if ($probe.IsPresentation) {
            Show-Presentation
            exit 0
        }
        $preview.Refresh()
        if ($preview.HasExited) { break }
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline)
    throw ('Sunumun açıldığı doğrulanamadı. Başlatma günlüğü: ' + $previewErrorLog + '. Hiçbir mevcut hizmet durdurulmadı.')
}
catch {
    Write-Host ''
    Write-Host ('Sunum açılamadı: ' + $_.Exception.Message) -ForegroundColor Red
    exit 1
}
