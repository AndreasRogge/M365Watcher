<#
.SYNOPSIS
    Gets monitoring results for a specific monitor
#>
function Get-UTCMMonitoringResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$MonitorId,

        [Parameter(Mandatory = $false)]
        [string]$ResultId
    )

    try {
        if ($ResultId) {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults/$ResultId"
            Write-Host "Retrieving monitoring result: $ResultId" -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination
            return $result
        }
        elseif ($MonitorId) {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults?`$filter=monitorId eq '$MonitorId'"
            Write-Host "Retrieving monitoring results for monitor: $MonitorId" -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET
            return $result.value
        }
        else {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults"
            Write-Host "Retrieving all monitoring results..." -ForegroundColor Cyan
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve monitoring results: $_"
        return $null
    }
}
