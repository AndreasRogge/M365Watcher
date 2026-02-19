<#
.SYNOPSIS
    Tests if UTCM is available in the tenant
#>
function Test-UTCMAvailability {
    [CmdletBinding()]
    param()

    try {
        Write-Host "Testing UTCM availability..." -ForegroundColor Cyan

        $uri = "beta/admin/configurationManagement/configurationSnapshotJobs"
        $result = Invoke-UTCMGraphRequest -Uri $uri -Method GET -NoPagination

        Write-Host "UTCM is available in this tenant!" -ForegroundColor Green
        return $true
    }
    catch {
        if ($_.Exception.Message -like "*404*") {
            Write-Warning "UTCM may not be available in this tenant yet."
        } else {
            Write-Error "Error testing UTCM availability: $_"
        }
        return $false
    }
}
