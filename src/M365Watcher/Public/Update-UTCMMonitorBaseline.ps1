<#
.SYNOPSIS
    Updates a configuration monitor's baseline
#>
function Update-UTCMMonitorBaseline {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorId,

        [Parameter(Mandatory = $true)]
        [string]$NewBaselineSnapshotId
    )

    try {
        Write-Host "Updating monitor baseline..." -ForegroundColor Cyan
        Write-Warning "Note: Updating baseline will delete all previous monitoring results and drifts for this monitor."

        $body = @{
            baselineSnapshot = @{
                id = $NewBaselineSnapshotId
            }
        }

        if (-not $PSCmdlet.ShouldProcess("Monitor '$MonitorId'", "Update baseline (deletes drift history)")) { return $null }
        $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
        $result = Invoke-UTCMGraphRequest -Uri $uri -Method PATCH -Body $body

        Write-Host "Monitor baseline updated successfully!" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Error "Failed to update monitor baseline: $_"
        return $null
    }
}
