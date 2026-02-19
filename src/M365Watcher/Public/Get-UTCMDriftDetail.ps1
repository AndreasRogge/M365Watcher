<#
.SYNOPSIS
    Gets detailed information about a specific drift
#>
function Get-UTCMDriftDetail {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DriftId
    )

    try {
        Write-Host "Retrieving drift details: $DriftId" -ForegroundColor Cyan

        $uri = "beta/admin/configurationManagement/configurationDrifts/$DriftId"
        $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination

        return $result
    }
    catch {
        Write-Error "Failed to retrieve drift details: $_"
        return $null
    }
}
