<#
.SYNOPSIS
    Removes a configuration snapshot
#>
function Remove-UTCMSnapshot {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string]$SnapshotId
    )

    try {
        if ($PSCmdlet.ShouldProcess($SnapshotId, "Delete snapshot")) {
            Write-Host "Deleting snapshot: $SnapshotId" -ForegroundColor Cyan

            $uri = "beta/admin/configurationManagement/configurationSnapshotJobs/$SnapshotId"
            Invoke-UTCMGraphRequest -Uri $uri -Method DELETE | Out-Null

            Write-Host "Snapshot deleted successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Error "Failed to delete snapshot: $_"
    }
}
