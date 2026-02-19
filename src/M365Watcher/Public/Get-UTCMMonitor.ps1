<#
.SYNOPSIS
    Gets all configuration monitors or a specific monitor
#>
function Get-UTCMMonitor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$MonitorId,

        [Parameter(Mandatory = $false)]
        [string]$DisplayName
    )

    try {
        if ($MonitorId) {
            $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
            Write-Host "Retrieving monitor: $MonitorId" -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination
            return $result
        }
        elseif ($DisplayName) {
            $uri = "beta/admin/configurationManagement/configurationMonitors/?`$filter=displayName eq '$DisplayName'"
            Write-Host "Retrieving monitor by name: $DisplayName" -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET
            return $result.value
        }
        else {
            $uri = "beta/admin/configurationManagement/configurationMonitors"
            Write-Host "Retrieving all monitors..." -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve monitors: $_"
        return $null
    }
}
