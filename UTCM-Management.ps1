<#
.SYNOPSIS
    DEPRECATED - Use Import-Module .\src\M365Watcher instead.
.DESCRIPTION
    This script is a compatibility wrapper. The UTCM functions have been
    refactored into the M365Watcher PowerShell module at src/M365Watcher/.

    For interactive mode, use: .\Start-Interactive.ps1
    For scripting, use: Import-Module .\src\M365Watcher
#>

param(
    [Parameter(Mandatory = $false)]
    [switch]$Interactive
)

Write-Warning "UTCM-Management.ps1 is deprecated. Use 'Import-Module .\src\M365Watcher' instead. For interactive mode, use '.\Start-Interactive.ps1'."

Import-Module "$PSScriptRoot\src\M365Watcher" -Force

if ($Interactive) {
    Start-UTCMInteractive
}
