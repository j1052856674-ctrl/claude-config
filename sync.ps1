param(
  [ValidateSet("status", "deploy")]
  [string]$Action = "status",
  [string]$ClaudeHome = "$env:USERPROFILE\.claude"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDir "sync-config.json"

if (!(Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  Write-Error "Missing sync-config.json. Copy sync-config.example.json first."
  exit 1
}

$Config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json
$Items = @($Config.items)

function Get-HashSafe([string]$Path) {
  if (!(Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash
}

function Copy-FileIfChanged([string]$Source, [string]$Target, [string]$Label) {
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Target) | Out-Null
  $sourceHash = Get-HashSafe $Source
  $targetHash = Get-HashSafe $Target
  if ($sourceHash -and $sourceHash -eq $targetHash) {
    Write-Host "  [skip] $Label"
    return
  }
  Copy-Item -LiteralPath $Source -Destination $Target -Force
  Write-Host "  [write] $Label"
}

function Copy-DirIfChanged([string]$Source, [string]$Target, [string]$Label) {
  if (!(Test-Path -LiteralPath $Source -PathType Container)) {
    Write-Host "  [skip] $Label missing in source"
    return
  }
  New-Item -ItemType Directory -Force -Path $Target | Out-Null
  $changed = 0
  $skipped = 0
  Get-ChildItem -LiteralPath $Source -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($Source.Length).TrimStart('\')
    $dest = Join-Path $Target $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    $sourceHash = Get-HashSafe $_.FullName
    $targetHash = Get-HashSafe $dest
    if ($sourceHash -and $sourceHash -eq $targetHash) {
      $skipped += 1
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
      $changed += 1
    }
  }
  Write-Host "  [dir] ${Label}: $changed changed, $skipped unchanged"
}

function Show-Status {
  Write-Host "Claude sync status"
  Write-Host "  source: $ScriptDir"
  Write-Host "  target: $ClaudeHome"
  Write-Host ""
  foreach ($item in $Items) {
    $source = Join-Path $ScriptDir $item
    $target = Join-Path $ClaudeHome $item
    $sourceState = if (Test-Path -LiteralPath $source) { "present" } else { "missing" }
    $targetState = if (Test-Path -LiteralPath $target) { "present" } else { "missing" }
    Write-Host ("  {0,-18} source:{1,-8} target:{2,-8}" -f $item, $sourceState, $targetState)
  }
}

function Deploy {
  Write-Host "Deploying Claude assets"
  Write-Host "  source: $ScriptDir"
  Write-Host "  target: $ClaudeHome"
  Write-Host ""
  New-Item -ItemType Directory -Force -Path $ClaudeHome | Out-Null

  foreach ($item in $Items) {
    $source = Join-Path $ScriptDir $item
    $target = Join-Path $ClaudeHome $item
    if (!(Test-Path -LiteralPath $source)) {
      Write-Host "  [skip] $item missing in source"
      continue
    }
    if (Test-Path -LiteralPath $source -PathType Container) {
      Copy-DirIfChanged $source $target $item
    } else {
      Copy-FileIfChanged $source $target $item
    }
  }

  $repoSkills = Join-Path $ScriptDir "skills"
  $claudeSkills = Join-Path $ClaudeHome "skills"
  if (Test-Path -LiteralPath $repoSkills -PathType Container) {
    Get-ChildItem -LiteralPath $repoSkills -Directory | Where-Object { $_.Name -notlike "_*" } | ForEach-Object {
      $target = Join-Path $claudeSkills $_.Name
      Copy-DirIfChanged $_.FullName $target "skills/$($_.Name)"
    }
  }
}

switch ($Action) {
  "status" { Show-Status }
  "deploy" { Deploy }
}
