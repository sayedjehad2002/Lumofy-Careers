<#
.SYNOPSIS
  Deploy Lumofy Careers Supabase edge functions (careers account required).

.DESCRIPTION
  Wraps `npx supabase functions deploy` with the project ref baked in, and knows
  which functions import each _shared module so shared-code edits fan out to every
  importer. Always runs from the repo root regardless of the current directory.

  Keep the importer lists below in sync with docs/DEPLOY.md when imports change.

.EXAMPLE
  .\scripts\deploy-functions.ps1 update-applicant

.EXAMPLE
  .\scripts\deploy-functions.ps1 analyze-cv get-cv-url

.EXAMPLE
  .\scripts\deploy-functions.ps1 -Shared ai        # everything that imports _shared/ai.ts

.EXAMPLE
  .\scripts\deploy-functions.ps1 -All
#>
[CmdletBinding()]
param(
  [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Functions = @(),

  [switch]$All,

  [ValidateSet("ai", "cors", "rate-limit", "seniority", "taxonomy", "validate-file", "validate-session")]
  [string]$Shared,

  [string]$ProjectRef = "dufbgzfqehkfibclaphy"
)

$ErrorActionPreference = "Stop"

# Deploys only work from the repo root — go there no matter where we were invoked.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$allFunctions = @(
  "admin-data", "ai-job-assist", "analyze-cv", "auto-analyze-applicant",
  "cv-library-analyze", "cv-library-classify", "cv-library-manage", "cv-library-parse",
  "cv-library-upload", "delete-applicant", "get-applicants", "get-cv-url", "get-jd-url",
  "hr-invite-accept", "hr-me", "hr-team", "logout", "submit-application",
  "transcribe-audio", "update-applicant", "upload-cv", "upload-jd", "verify-password"
)

# Which functions bundle each _shared module at deploy time.
$sharedImporters = @{
  "ai"               = @("ai-job-assist", "analyze-cv", "auto-analyze-applicant",
                         "cv-library-analyze", "cv-library-classify", "cv-library-parse",
                         "transcribe-audio")
  "seniority"        = @("ai-job-assist", "analyze-cv", "auto-analyze-applicant",
                         "cv-library-analyze")
  "taxonomy"         = @("cv-library-analyze", "cv-library-classify", "cv-library-manage",
                         "cv-library-parse")
  "validate-file"    = @("cv-library-upload", "upload-cv")
  "cors"             = $allFunctions
  "rate-limit"       = @($allFunctions | Where-Object { @("hr-me", "hr-team") -notcontains $_ })
  "validate-session" = @($allFunctions | Where-Object { $_ -ne "verify-password" })
}

$targets = @()
if ($All) {
  $targets = $allFunctions
}
elseif ($Shared) {
  $targets = $sharedImporters[$Shared]
  Write-Host "_shared/$Shared.ts fan-out: $($targets.Count) function(s)."
}
elseif ($Functions.Count -gt 0) {
  foreach ($fn in $Functions) {
    if ($allFunctions -notcontains $fn) {
      Write-Error "Unknown function '$fn'. Valid names:`n  $($allFunctions -join "`n  ")"
    }
  }
  $targets = $Functions
}
else {
  Write-Host "Usage:"
  Write-Host "  deploy-functions.ps1 <name> [<name> ...]   deploy specific functions"
  Write-Host "  deploy-functions.ps1 -Shared <module>      deploy all importers of _shared/<module>.ts"
  Write-Host "  deploy-functions.ps1 -All                  deploy every function"
  Write-Host ""
  Write-Host "Functions:`n  $($allFunctions -join "`n  ")"
  exit 1
}

Write-Host "Deploying $($targets.Count) function(s) to project $ProjectRef ...`n"

$failed = @()
foreach ($fn in $targets) {
  Write-Host "=== $fn ==="
  npx supabase functions deploy $fn --project-ref $ProjectRef
  if ($LASTEXITCODE -ne 0) { $failed += $fn }
  Write-Host ""
}

if ($failed.Count -gt 0) {
  Write-Host "FAILED: $($failed -join ', ')" -ForegroundColor Red
  Write-Host "Tips: 403 = wrong Supabase account (needs the CAREERS account, not melrweny)."
  Write-Host "Fallback: `$env:SUPABASE_ACCESS_TOKEN = '<token>' in this window, then re-run."
  exit 1
}

Write-Host "All $($targets.Count) function(s) deployed OK." -ForegroundColor Green
