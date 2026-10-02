# Fetch Railway variables and write local .env files (values are not printed).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

function Get-RailwayVars([string]$Service) {
    $map = @{}
    $lines = railway variable list --service $Service --kv 2>$null
    foreach ($line in $lines) {
        if ($line -match '^([^=]+)=(.*)$') {
            $map[$Matches[1]] = $Matches[2]
        }
    }
    return $map
}

function Is-RailwayInternalKey([string]$Key) {
    return $Key -like 'RAILWAY_*'
}

$api = Get-RailwayVars 'tingting-api'
$pg = Get-RailwayVars 'Postgres'

$merged = @{}
foreach ($pair in $api.GetEnumerator()) {
    if (-not (Is-RailwayInternalKey $pair.Key)) { $merged[$pair.Key] = $pair.Value }
}
if ($pg.ContainsKey('DATABASE_PUBLIC_URL')) {
    $merged['DATABASE_URL'] = $pg['DATABASE_PUBLIC_URL']
} elseif (-not $merged.ContainsKey('DATABASE_URL') -and $pg.ContainsKey('DATABASE_URL')) {
    $merged['DATABASE_URL'] = $pg['DATABASE_URL']
}

# Local development overrides
$merged['NODE_ENV'] = 'development'
$merged['EXPO_PUBLIC_API_URL'] = 'http://localhost:3000'
$merged['CORS_ORIGIN'] = '*'
$merged['PORT'] = '3000'
$merged['PGSSLMODE'] = 'require'
$merged['UPLOADS_DIR'] = (Join-Path $root 'apps/api/uploads')
$merged.Remove('PUBLIC_API_URL')
if ($merged.ContainsKey('APP_KEY')) { $merged['EXPO_PUBLIC_APP_KEY'] = $merged['APP_KEY'] }

$expoKeys = @('EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_APP_KEY')

function Write-EnvFile([string]$Path, [hashtable]$Vars, [string[]]$KeyOrder, [string]$Header) {
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add($Header)
    $lines.Add('')
    $written = New-Object 'System.Collections.Generic.HashSet[string]'
    foreach ($key in $KeyOrder) {
        if ($Vars.ContainsKey($key)) {
            $lines.Add("$key=$($Vars[$key])")
            [void]$written.Add($key)
        }
    }
    foreach ($key in ($Vars.Keys | Sort-Object)) {
        if (-not $written.Contains($key)) {
            $lines.Add("$key=$($Vars[$key])")
        }
    }
    $content = ($lines -join "`n") + "`n"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $content, $utf8NoBom)
}

$rootOrder = @(
    'DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'CORS_ORIGIN', 'PORT', 'PGSSLMODE', 'UPLOADS_DIR',
    'APP_KEY', 'COUPLE_USER1_NAME', 'COUPLE_USER2_NAME', 'COUPLE_INITIAL_PASSWORD',
    'KAKAO_REST_API_KEY', 'MYBOX_TOKEN', 'MYBOX_TOKEN_EXPIRES', 'MYBOX_FOLDER_NAME', 'EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_APP_KEY'
)

Write-EnvFile -Path (Join-Path $root '.env') -Vars $merged -KeyOrder $rootOrder -Header @'
# Synced from Railway (tingting / production) — do not commit.
# Regenerate: powershell -File scripts/sync-railway-env.ps1
# Local overrides: API on :3000, NODE_ENV=development
'@

$mobileVars = @{}
foreach ($key in $expoKeys) {
    if ($merged.ContainsKey($key)) { $mobileVars[$key] = $merged[$key] }
}

Write-EnvFile -Path (Join-Path $root 'apps/mobile/.env') -Vars $mobileVars -KeyOrder $expoKeys -Header @'
# Synced from Railway — Expo reads this at Metro start. Restart Expo after changes.
# Regenerate: powershell -File scripts/sync-railway-env.ps1
'@

Write-Host "Wrote .env ($($merged.Count) keys) and apps/mobile/.env ($($mobileVars.Count) keys)"
