param(
  [ValidateSet("status", "deploy")]
  [string]$Action = "status",
  [string]$CodexHome = "$env:USERPROFILE\.codex"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Items = @("AGENTS.md", "skills", "prompts", "workflows", "references")

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
  $files = Get-ChildItem -LiteralPath $Source -Recurse -File
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($Source.Length).TrimStart('\')
    $dest = Join-Path $Target $relative
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null
    $sourceHash = Get-HashSafe $file.FullName
    $targetHash = Get-HashSafe $dest
    if ($sourceHash -and $sourceHash -eq $targetHash) {
      $skipped += 1
    } else {
      Copy-Item -LiteralPath $file.FullName -Destination $dest -Force
      $changed += 1
    }
  }
  Write-Host "  [dir] ${Label}: $changed changed, $skipped unchanged"
}

if ($Action -eq "status") {
  Write-Host "Codex sync status"
  Write-Host "  source: $ScriptDir"
  Write-Host "  target: $CodexHome"
  Write-Host ""
  foreach ($item in $Items) {
    $source = Join-Path $ScriptDir $item
    $target = Join-Path $CodexHome $item
    $sourceState = if (Test-Path -LiteralPath $source) { "present" } else { "missing" }
    $targetState = if (Test-Path -LiteralPath $target) { "present" } else { "missing" }
    Write-Host ("  {0,-14} source:{1,-8} target:{2,-8}" -f $item, $sourceState, $targetState)
  }
  exit 0
}

Write-Host "Deploying Codex adapter assets"
Write-Host "  source: $ScriptDir"
Write-Host "  target: $CodexHome"
Write-Host ""
New-Item -ItemType Directory -Force -Path $CodexHome | Out-Null
Copy-FileIfChanged (Join-Path $ScriptDir "AGENTS.md") (Join-Path $CodexHome "AGENTS.md") "AGENTS.md"
Copy-DirIfChanged (Join-Path $ScriptDir "skills") (Join-Path $CodexHome "skills") "skills"
Copy-DirIfChanged (Join-Path $ScriptDir "prompts") (Join-Path $CodexHome "prompts") "prompts"
Copy-DirIfChanged (Join-Path $ScriptDir "workflows") (Join-Path $CodexHome "workflows") "workflows"
Copy-DirIfChanged (Join-Path $ScriptDir "references") (Join-Path $CodexHome "references") "references"
