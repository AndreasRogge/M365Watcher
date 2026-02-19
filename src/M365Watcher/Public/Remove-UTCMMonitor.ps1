<#
.SYNOPSIS
    Removes a configuration monitor
#>
function Remove-UTCMMonitor {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorId
    )

    try {
        if ($PSCmdlet.ShouldProcess($MonitorId, "Delete monitor")) {
            Write-Host "Deleting monitor: $MonitorId" -ForegroundColor Cyan

            $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
            Invoke-UTCMGraphRequest -Uri $uri -Method DELETE | Out-Null

            Write-Host "Monitor deleted successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Error "Failed to delete monitor: $_"
    }
}
