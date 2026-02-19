<#
.SYNOPSIS
    Gets available resource types for UTCM
#>
function Get-UTCMResourceTypes {
    [CmdletBinding()]
    param()

    $totalTypes = $script:VerifiedResourceTypes.Count
    Write-Host "Verified UTCM Resource Types ($totalTypes confirmed working):" -ForegroundColor Cyan

    foreach ($workload in $script:ResourceTypeCatalog.PSObject.Properties) {
        $label = $workload.Value.label
        $types = $workload.Value.types
        $count = $types.Count
        Write-Host "`n$label ($count types):" -ForegroundColor Yellow
        foreach ($type in $types) {
            Write-Host "  - $type"
        }
    }

    Write-Host "`nFull schema (270+ types): https://www.schemastore.org/utcm-monitor.json" -ForegroundColor Gray
    Write-Host "$totalTypes of 270 types confirmed working. See README for full test results." -ForegroundColor Gray
}
