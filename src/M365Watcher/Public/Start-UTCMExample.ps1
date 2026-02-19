<#
.SYNOPSIS
    Example: Complete setup and monitoring workflow
#>
function Start-UTCMExample {
    [CmdletBinding()]
    param()

    Write-Host "`n=== UTCM Example Workflow ===" -ForegroundColor Cyan
    Write-Host "This example demonstrates a complete UTCM workflow" -ForegroundColor Gray

    # Step 1: Connect
    Write-Host "`nStep 1: Connecting to Microsoft Graph..." -ForegroundColor Yellow
    Connect-UTCM

    # Step 2: Initialize service principal
    Write-Host "`nStep 2: Setting up UTCM Service Principal..." -ForegroundColor Yellow
    Initialize-UTCMServicePrincipal

    # Step 3: Grant permissions
    Write-Host "`nStep 3: Granting permissions..." -ForegroundColor Yellow
    Grant-UTCMPermissions -Permissions @('Policy.Read.All', 'Policy.ReadWrite.ConditionalAccess')

    # Step 4: Create snapshot
    Write-Host "`nStep 4: Creating baseline snapshot..." -ForegroundColor Yellow
    $snapshot = New-UTCMSnapshot `
        -DisplayName "Authorization Policy Baseline $(Get-Date -Format 'yyyy-MM-dd')" `
        -Description "Baseline for authorization policies" `
        -Resources @('microsoft.entra.authorizationpolicy')

    if ($snapshot) {
        # Wait for snapshot to complete
        Write-Host "Waiting for snapshot to complete..." -ForegroundColor Gray
        Start-Sleep -Seconds 10

        # Step 5: Create monitor
        Write-Host "`nStep 5: Creating monitor..." -ForegroundColor Yellow
        $monitor = New-UTCMMonitor `
            -DisplayName "CA Policy Monitor" `
            -Description "Monitors Conditional Access policies for drift" `
            -BaselineSnapshotId $snapshot.id

        # Step 6: Check summary
        Write-Host "`nStep 6: Getting UTCM summary..." -ForegroundColor Yellow
        Get-UTCMSummary
    }

    Write-Host "`n=== Example Complete ===" -ForegroundColor Cyan
}
