# Records and compares /speckit-tweak iterations of a feature.
#
#   devScripts/tweak.ps1 save <n> "<title>"   commit the working tree as TWEAK<nn> and tag it
#   devScripts/tweak.ps1 list                 list the saved iterations
#   devScripts/tweak.ps1 show <n> [-Port 8081] run iteration <n> beside the current one
#   devScripts/tweak.ps1 stop <n>             remove iteration <n>'s worktree
#
# Each iteration is one commit tagged <Prefix>-TWEAK<nn> (local tags only). "show" checks the tag out
# into its own worktree next to this one, shares this worktree's node_modules, and starts a copy of the
# local devScripts/launch-dev.ps1 on another port, against the same development database. Sign-in
# cookies are per host, not per port, so both servers are signed in as the same user.
param(
    [Parameter(Mandatory = $true, Position = 0)][ValidateSet("save", "list", "show", "stop")][string]$Command,
    [Parameter(Position = 1)][int]$Number,
    [Parameter(Position = 2)][string]$Title = "",
    [int]$Port = 8081,
    [string]$Prefix = "color-contrast"
)
$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel).Trim()
function Tag([int]$n) { "$Prefix-TWEAK{0:D2}" -f $n }
function TreeDir([int]$n) { Join-Path (Split-Path $root -Parent) ((Split-Path $root -Leaf) + "-TWEAK{0:D2}" -f $n) }
function NeedNumber { if (-not $Number) { throw "Give the tweak number, e.g. devScripts/tweak.ps1 $Command 2" } }

switch ($Command) {
    "save" {
        NeedNumber
        $tag = Tag $Number
        if (git tag --list $tag) { throw "$tag already exists; delete it first (git tag -d $tag) to re-record it." }
        git -C $root add -A
        $message = "TWEAK{0:D2}" -f $Number
        if ($Title) { $message += ": $Title" }
        git -C $root diff --cached --quiet
        if ($LASTEXITCODE -eq 0) { Write-Host "Nothing changed since the last commit; tagging HEAD." }
        else { git -C $root commit -m $message | Out-Null }
        git -C $root tag -a $tag -m $message
        Write-Host "Saved $tag at $((git -C $root rev-parse --short HEAD).Trim())."
    }
    "list" {
        git -C $root tag --list "$Prefix-TWEAK*" --sort=refname --format="%(refname:short)  %(creatordate:format:%Y-%m-%d %H:%M)  %(contents:subject)"
    }
    "show" {
        NeedNumber
        $tag = Tag $Number
        if (-not (git tag --list $tag)) { throw "No iteration $tag; see devScripts/tweak.ps1 list." }
        $dir = TreeDir $Number
        if (-not (Test-Path $dir)) { git -C $root worktree add --detach $dir $tag | Out-Null }
        $modules = Join-Path $dir "node_modules"
        if (-not (Test-Path $modules)) { New-Item -ItemType Junction -Path $modules -Target (Join-Path $root "node_modules") | Out-Null }
        $launch = Join-Path $root "devScripts/launch-dev.ps1"
        if (-not (Test-Path $launch)) { throw "No devScripts/launch-dev.ps1; create it from devScripts.example/launch-dev.ps1." }
        $copy = Join-Path $dir "devScripts/launch-dev.ps1"
        (Get-Content $launch -Raw) -replace '\$env:ENV_PORT = "\d+"', "`$env:ENV_PORT = `"$Port`"" `
            -replace 'http://localhost:\d+', "http://localhost:$Port" | Set-Content $copy
        Write-Host "Starting $tag on http://localhost:$Port from $dir ..."
        Set-Location $dir
        & $copy
    }
    "stop" {
        NeedNumber
        $dir = TreeDir $Number
        if (-not (Test-Path $dir)) { Write-Host "No worktree for iteration $Number."; return }
        $modules = Join-Path $dir "node_modules"
        if (Test-Path $modules) { cmd /c rmdir "$modules" | Out-Null }
        git -C $root worktree remove --force $dir
        Write-Host "Removed $dir."
    }
}
