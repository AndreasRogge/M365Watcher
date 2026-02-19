<#
.SYNOPSIS
    Displays a summary of UTCM configuration
#>
function Get-UTCMSummary {
    [CmdletBinding()]
    param()

    try {
        Write-Host "`n=== UTCM Configuration Summary ===" -ForegroundColor Cyan

        # Get snapshots
        $snapshots = Get-UTCMSnapshot
        Write-Host "`nSnapshots: $($snapshots.Count)" -ForegroundColor Yellow

        # Get monitors
        $monitors = Get-UTCMMonitor
        Write-Host "Monitors: $($monitors.Count)" -ForegroundColor Yellow

        # Get active drifts
        $activeDrifts = Get-UTCMDrift -Status Active
        Write-Host "Active Drifts: $($activeDrifts.Count)" -ForegroundColor $(if ($activeDrifts.Count -gt 0) { 'Red' } else { 'Green' })

        Write-Host "`n==================================" -ForegroundColor Cyan

        return @{
            Snapshots = $snapshots
            Monitors = $monitors
            ActiveDrifts = $activeDrifts
        }
    }
    catch {
        Write-Error "Failed to retrieve UTCM summary: $_"
    }
}
