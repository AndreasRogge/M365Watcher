<#
.SYNOPSIS
    Gets all configuration snapshots
#>
function Get-UTCMSnapshot {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$SnapshotId
    )

    try {
        if ($SnapshotId) {
            $uri = "beta/admin/configurationManagement/configurationSnapshotJobs/$SnapshotId"
            Write-Host "Retrieving snapshot: $SnapshotId" -ForegroundColor Cyan
        } else {
            $uri = "beta/admin/configurationManagement/configurationSnapshotJobs"
            Write-Host "Retrieving all snapshots..." -ForegroundColor Cyan
        }

        if ($SnapshotId) {
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination
            return $result
        } else {
            $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve snapshots: $_"
        return $null
    }
}
