param(
  [string]$ConfigPath = ".\github-push.config.json",
  [string]$Owner = "",
  [string]$OwnerType = "",
  [string[]]$Folders = @(),
  [string]$Visibility = "",
  [switch]$EnablePages
)

$ErrorActionPreference = "Stop"

function Write-Info($msg) {
  Write-Host "[INFO] $msg" -ForegroundColor Cyan
}

function Write-Success($msg) {
  Write-Host "[OK]   $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
  Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string[]]$Args
  )

  $previousErrorPref = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & git -C $Path @Args 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorPref
  }
  return [PSCustomObject]@{
    ExitCode = $exitCode
    Output   = $output
  }
}

function ConvertTo-RepoSlug {
  param([string]$Name)
  $slug = $Name.ToLowerInvariant()
  $slug = [regex]::Replace($slug, "[^a-z0-9]+", "-")
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    return "repo-" + [DateTime]::UtcNow.ToString("yyyyMMddHHmmss")
  }
  return $slug
}

function Build-ProjectsFromFolders {
  param([string[]]$InputFolders)
  $items = @()
  foreach ($folder in $InputFolders) {
    if ([string]::IsNullOrWhiteSpace($folder)) { continue }
    $leaf = Split-Path -Path $folder -Leaf
    $repo = ConvertTo-RepoSlug -Name $leaf
    $items += [PSCustomObject]@{
      name      = $leaf
      localPath = $folder
      repo      = $repo
    }
  }
  return $items
}

function Get-GitHubHeaders {
  param([string]$Token)
  if ([string]::IsNullOrWhiteSpace($Token)) { return $null }
  return @{
    "Accept"               = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "Authorization"        = "Bearer $Token"
  }
}

function Test-GitHubRepoExists {
  param(
    [string]$Owner,
    [string]$Repo,
    [hashtable]$Headers
  )
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo" -Headers $Headers -Method Get | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Ensure-GitHubRepo {
  param(
    [string]$Owner,
    [string]$OwnerType,
    [string]$Repo,
    [string]$Visibility,
    [hashtable]$Headers
  )

  if (-not $Headers) {
    Write-Warn "No GitHub token found. Skipping repo creation check for $Owner/$Repo."
    return
  }

  if (Test-GitHubRepoExists -Owner $Owner -Repo $Repo -Headers $Headers) {
    Write-Info "Repository exists: https://github.com/$Owner/$Repo"
    return
  }

  $isPrivate = $Visibility -eq "private"
  $body = @{
    name    = $Repo
    private = $isPrivate
  } | ConvertTo-Json

  if ($OwnerType -eq "org") {
    $createUrl = "https://api.github.com/orgs/$Owner/repos"
  } else {
    $createUrl = "https://api.github.com/user/repos"
  }

  Invoke-RestMethod -Uri $createUrl -Headers $Headers -Method Post -Body $body
  Write-Success "Created repository: https://github.com/$Owner/$Repo"
}

function Enable-GitHubPages {
  param(
    [string]$Owner,
    [string]$Repo,
    [string]$Branch,
    [hashtable]$Headers
  )

  if (-not $Headers) {
    Write-Warn "No GitHub token found. Skipping Pages API call for $Owner/$Repo."
    return
  }

  $payload = @{
    source = @{
      branch = $Branch
      path   = "/"
    }
  } | ConvertTo-Json -Depth 4

  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$Owner/$Repo/pages" -Headers $Headers -Method Post -Body $payload | Out-Null
    Write-Success "Enabled GitHub Pages for $Owner/$Repo"
  } catch {
    $message = $_.Exception.Message
    if ($message -match "409|already exists|build_type") {
      Write-Info "GitHub Pages already configured for $Owner/$Repo"
    } else {
      Write-Warn "Could not auto-enable GitHub Pages for $Owner/$Repo. $message"
    }
  }
}

if (-not [string]::IsNullOrWhiteSpace($Owner) -and $Folders.Count -gt 0) {
  $config = [PSCustomObject]@{
    github = [PSCustomObject]@{
      owner = $Owner
      ownerType = $(if ([string]::IsNullOrWhiteSpace($OwnerType)) { "user" } else { $OwnerType })
      tokenEnv = "GITHUB_TOKEN"
    }
    defaults = [PSCustomObject]@{
      branch = "main"
      visibility = $(if ([string]::IsNullOrWhiteSpace($Visibility)) { "public" } else { $Visibility })
      enablePages = [bool]$EnablePages
      commitMessage = "Automated update"
    }
    projects = Build-ProjectsFromFolders -InputFolders $Folders
  }
} else {
  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Config file not found: $ConfigPath"
  }
  $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
}

if (-not $config.projects -or $config.projects.Count -eq 0) {
  throw "No projects found. Provide projects in config, or pass -Owner and -Folders."
}

$owner = if (-not [string]::IsNullOrWhiteSpace($Owner)) { $Owner } else { $config.github.owner }
if ([string]::IsNullOrWhiteSpace($owner)) {
  throw "GitHub owner is required. Set github.owner in config or pass -Owner."
}

$ownerTypeResolved = if (-not [string]::IsNullOrWhiteSpace($OwnerType)) { $OwnerType } elseif ($config.github.ownerType) { $config.github.ownerType } else { "user" }
$tokenEnv = if ($config.github.tokenEnv) { $config.github.tokenEnv } else { "GITHUB_TOKEN" }
$token = [Environment]::GetEnvironmentVariable($tokenEnv, "Process")
if (-not $token) { $token = [Environment]::GetEnvironmentVariable($tokenEnv, "User") }
if (-not $token) { $token = [Environment]::GetEnvironmentVariable($tokenEnv, "Machine") }
$headers = Get-GitHubHeaders -Token $token

$branchDefault = if ($config.defaults.branch) { $config.defaults.branch } else { "main" }
$visibilityDefault = if (-not [string]::IsNullOrWhiteSpace($Visibility)) { $Visibility } elseif ($config.defaults.visibility) { $config.defaults.visibility } else { "public" }
$enablePagesDefault = if ($EnablePages.IsPresent) { $true } else { [bool]$config.defaults.enablePages }
$commitDefault = if ($config.defaults.commitMessage) { $config.defaults.commitMessage } else { "Automated update" }

$results = @()

foreach ($project in $config.projects) {
  $name = if ($project.name) { $project.name } else { $project.repo }
  $path = $project.localPath
  $repo = if ($project.repo) { $project.repo } else { ConvertTo-RepoSlug -Name (Split-Path -Path $path -Leaf) }
  $branch = if ($project.branch) { $project.branch } else { $branchDefault }
  $visibility = if ($project.visibility) { $project.visibility } else { $visibilityDefault }
  $enablePages = if ($null -ne $project.enablePages) { [bool]$project.enablePages } else { $enablePagesDefault }
  $commitMsg = if ($project.commitMessage) { $project.commitMessage } else { $commitDefault }

  if (-not (Test-Path -LiteralPath $path)) {
    Write-Warn "Skipping '$name' because path does not exist: $path"
    continue
  }

  Write-Info "Processing: $name"
  Ensure-GitHubRepo -Owner $owner -OwnerType $ownerTypeResolved -Repo $repo -Visibility $visibility -Headers $headers

  $checkRepo = Invoke-Git -Path $path -Args @("rev-parse", "--is-inside-work-tree")
  if ($checkRepo.ExitCode -ne 0) {
    $initResult = Invoke-Git -Path $path -Args @("init")
    if ($initResult.ExitCode -ne 0) { throw "git init failed at $path`n$($initResult.Output)" }
  }

  $checkout = Invoke-Git -Path $path -Args @("checkout", "-B", $branch)
  if ($checkout.ExitCode -ne 0) { throw "git checkout failed at $path`n$($checkout.Output)" }

  $add = Invoke-Git -Path $path -Args @("add", "-A")
  if ($add.ExitCode -ne 0) { throw "git add failed at $path`n$($add.Output)" }

  $status = Invoke-Git -Path $path -Args @("status", "--porcelain")
  if ($status.ExitCode -ne 0) { throw "git status failed at $path`n$($status.Output)" }

  if (-not [string]::IsNullOrWhiteSpace(($status.Output -join "`n"))) {
    $commit = Invoke-Git -Path $path -Args @("commit", "-m", $commitMsg)
    if ($commit.ExitCode -ne 0) {
      Write-Warn "Commit skipped/failed at $path. Output: $($commit.Output -join ' ')"
    } else {
      Write-Success "Committed changes in $name"
    }
  } else {
    Write-Info "No new changes to commit in $name"
  }

  $remoteUrl = "https://github.com/$owner/$repo.git"
  $remoteCheck = Invoke-Git -Path $path -Args @("remote", "get-url", "origin")
  if ($remoteCheck.ExitCode -eq 0) {
    $setRemote = Invoke-Git -Path $path -Args @("remote", "set-url", "origin", $remoteUrl)
    if ($setRemote.ExitCode -ne 0) { throw "git remote set-url failed at $path" }
  } else {
    $addRemote = Invoke-Git -Path $path -Args @("remote", "add", "origin", $remoteUrl)
    if ($addRemote.ExitCode -ne 0) { throw "git remote add failed at $path" }
  }

  $push = Invoke-Git -Path $path -Args @("push", "-u", "origin", $branch)
  if ($push.ExitCode -ne 0) {
    $pushText = $push.Output -join "`n"
    if ($pushText -match "fetch first|non-fast-forward") {
      Write-Warn "Remote has new commits for $name. Rebasing local branch and retrying push."
      $pull = Invoke-Git -Path $path -Args @("pull", "--rebase", "origin", $branch)
      if ($pull.ExitCode -ne 0) {
        throw "git pull --rebase failed for '$name'.`n$($pull.Output -join "`n")"
      }
      $push = Invoke-Git -Path $path -Args @("push", "-u", "origin", $branch)
    }
    if ($push.ExitCode -ne 0) {
      throw "git push failed for '$name'.`n$($push.Output -join "`n")"
    }
  }

  if ($enablePages) {
    Enable-GitHubPages -Owner $owner -Repo $repo -Branch $branch -Headers $headers
  }

  $repoLink = "https://github.com/$owner/$repo"
  $pagesLink = "https://$($owner.ToLower()).github.io/$repo/"
  $results += [PSCustomObject]@{
    Name      = $name
    LocalPath = $path
    Repo      = $repoLink
    Pages     = $pagesLink
  }
}

Write-Host ""
Write-Host "================ PUSH SUMMARY ================" -ForegroundColor Magenta
foreach ($r in $results) {
  Write-Host "Project: $($r.Name)"
  Write-Host "  Path : $($r.LocalPath)"
  Write-Host "  Repo : $($r.Repo)"
  Write-Host "  Page : $($r.Pages)"
  Write-Host ""
}
