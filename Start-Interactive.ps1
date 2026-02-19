<#
.SYNOPSIS
    Launches the UTCM Interactive Management Console
.DESCRIPTION
    Imports the M365Watcher module and starts the interactive menu interface.
#>
Import-Module "$PSScriptRoot\src\M365Watcher" -Force
Start-UTCMInteractive
