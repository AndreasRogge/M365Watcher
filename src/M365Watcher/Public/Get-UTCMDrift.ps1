<#
.SYNOPSIS
    Gets configuration drifts
#>
function Get-UTCMDrift {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$MonitorId,

        [Parameter(Mandatory = $false)]
        [ValidateSet('Active', 'Resolved', 'All')]
        [string]$Status = 'All'
    )

    try {
        $uri = "beta/admin/configurationManagement/configurationDrifts"

        # Build filter
        $filters = @()

        if ($MonitorId) {
            $filters += "monitorId eq '$MonitorId'"
        }

        if ($Status -ne 'All') {
            $statusValue = if ($Status -eq 'Active') { 'active' } else { 'resolved' }
            $filters += "status eq '$statusValue'"
        }

        if ($filters.Count -gt 0) {
            $filterString = $filters -join ' and '
            $uri += "?`$filter=$filterString"
        }

        Write-Host "Retrieving configuration drifts..." -ForegroundColor Cyan

        $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET

        if ($result.value.Count -eq 0) {
            Write-Host "No drifts found." -ForegroundColor Yellow
        } else {
            Write-Host "Found $($result.value.Count) drift(s)" -ForegroundColor Green
        }

        return $result.value
    }
    catch {
        Write-Error "Failed to retrieve drifts: $_"
        return $null
    }
}
