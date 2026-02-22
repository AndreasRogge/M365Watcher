<#
.SYNOPSIS
    Starts an interactive menu-driven interface for UTCM management
#>
function Start-UTCMInteractive {
    [CmdletBinding()]
    param()

    # Ensure connected
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "`nNot connected to Microsoft Graph. Connecting now..." -ForegroundColor Yellow
        Connect-UTCM
    }

    do {
        Clear-Host
        Write-Host "`n=================================================================" -ForegroundColor Cyan
        Write-Host "          UTCM Interactive Management Console" -ForegroundColor Cyan
        Write-Host "=================================================================" -ForegroundColor Cyan

        $activeTenantId = Get-UTCMActiveTenantId
        $allTenants = Get-UTCMAllTenants
        if ($activeTenantId -and $allTenants.ContainsKey($activeTenantId)) {
            $activeName = $allTenants[$activeTenantId].DisplayName
            Write-Host "`nActive Tenant: $activeName ($activeTenantId)" -ForegroundColor Green
        } else {
            Write-Host "`nConnected to: $($context.TenantId)" -ForegroundColor Green
        }
        Write-Host "Account: $($context.Account)" -ForegroundColor Green
        if ($allTenants.Count -gt 1) {
            Write-Host "Connected Tenants: $($allTenants.Count)" -ForegroundColor Green
        }

        Write-Host ""
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host " Setup & Configuration" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host "  1. Test UTCM Availability"
        Write-Host "  2. Initialize UTCM Service Principal"
        Write-Host "  3. Grant Permissions to UTCM Service Principal"

        Write-Host "`n=================================================================" -ForegroundColor Yellow
        Write-Host " Snapshot Management" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host "  4. Create New Snapshot"
        Write-Host "  5. View All Snapshots"
        Write-Host "  6. View Specific Snapshot"
        Write-Host "  7. Delete Snapshot"

        Write-Host "`n=================================================================" -ForegroundColor Yellow
        Write-Host " Monitor Management" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host "  8. Create New Monitor"
        Write-Host "  9. View All Monitors"
        Write-Host " 10. View Specific Monitor"
        Write-Host " 11. Update Monitor Baseline"
        Write-Host " 12. Delete Monitor"

        Write-Host "`n=================================================================" -ForegroundColor Yellow
        Write-Host " Drift & Results" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host " 13. View Configuration Drifts"
        Write-Host " 14. View Drift Details"
        Write-Host " 15. View Monitoring Results"

        Write-Host "`n=================================================================" -ForegroundColor Yellow
        Write-Host " Utilities" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host " 16. Get UTCM Summary"
        Write-Host " 17. Show Available Resource Types"
        Write-Host " 18. Reconnect to Microsoft Graph"

        Write-Host "`n=================================================================" -ForegroundColor Yellow
        Write-Host " Multi-Tenant" -ForegroundColor Yellow
        Write-Host "=================================================================" -ForegroundColor Yellow
        Write-Host " 19. View Connected Tenants"
        Write-Host " 20. Switch Active Tenant"
        Write-Host " 21. Connect Additional Tenant"
        Write-Host " 22. Compare Snapshots Across Tenants"

        Write-Host "`n=================================================================" -ForegroundColor Cyan
        Write-Host "  0. Exit" -ForegroundColor Red
        Write-Host "=================================================================" -ForegroundColor Cyan

        $choice = Read-Host "`nSelect an option"

        switch ($choice) {
            "1" {
                Test-UTCMAvailability
                Read-Host "`nPress Enter to continue"
            }
            "2" {
                Initialize-UTCMServicePrincipal
                Read-Host "`nPress Enter to continue"
            }
            "3" {
                Write-Host "`nCommon permissions:" -ForegroundColor Yellow
                Write-Host "  - ConfigurationMonitoring.ReadWrite.All" -ForegroundColor Gray
                Write-Host "  - Policy.Read.All" -ForegroundColor Gray
                Write-Host "  - Policy.ReadWrite.ConditionalAccess" -ForegroundColor Gray
                $perms = Read-Host "`nEnter permissions (comma-separated)"
                if ($perms) {
                    $permArray = $perms -split ',' | ForEach-Object { $_.Trim() }
                    Grant-UTCMPermissions -Permissions $permArray
                }
                Read-Host "`nPress Enter to continue"
            }
            "4" {
                Write-Host "`nNote: Snapshot display name should be descriptive (recommended: 8-50 chars)" -ForegroundColor Yellow
                $displayName = Read-Host "`nEnter snapshot display name"

                if ([string]::IsNullOrWhiteSpace($displayName)) {
                    Write-Host "`nError: Display name is required" -ForegroundColor Red
                } else {
                    $description = Read-Host "Enter description (optional)"
                    Write-Host "`nExample resources:" -ForegroundColor Yellow
                    Write-Host "  - microsoft.entra.authorizationpolicy" -ForegroundColor Gray
                    Write-Host "  - microsoft.exchange.transportrule" -ForegroundColor Gray
                    Write-Host "  - microsoft.teams.meetingpolicy" -ForegroundColor Gray
                    Write-Host "  - microsoft.securityandcompliance.dlpcompliancepolicy" -ForegroundColor Gray
                    Write-Host "`nHint: Use option 17 to see all available resource types" -ForegroundColor Gray
                    $resources = Read-Host "`nEnter resources (comma-separated)"

                    if ($resources) {
                        $resourceArray = $resources -split ',' | ForEach-Object { $_.Trim() }
                        New-UTCMSnapshot -DisplayName $displayName -Description $description -Resources $resourceArray
                    } else {
                        Write-Host "`nError: At least one resource type is required" -ForegroundColor Red
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "5" {
                $snapshots = Get-UTCMSnapshot
                if ($snapshots) {
                    $snapshots | Format-Table -AutoSize id, displayName, status, createdDateTime
                }
                Read-Host "`nPress Enter to continue"
            }
            "6" {
                $snapshotId = Read-Host "`nEnter snapshot ID"
                if ($snapshotId) {
                    $snapshot = Get-UTCMSnapshot -SnapshotId $snapshotId
                    if ($snapshot) {
                        $snapshot | Format-List
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "7" {
                Write-Host "`n=== Delete Snapshot ===" -ForegroundColor Cyan

                # First, get and display available snapshots
                Write-Host "`nRetrieving available snapshots..." -ForegroundColor Cyan
                $snapshots = Get-UTCMSnapshot

                if (-not $snapshots -or $snapshots.Count -eq 0) {
                    Write-Host "`nNo snapshots available." -ForegroundColor Yellow
                    Read-Host "`nPress Enter to continue"
                    continue
                }

                # Display snapshots in a numbered list
                Write-Host "`nAvailable Snapshots:" -ForegroundColor Yellow
                Write-Host "=================================================================" -ForegroundColor Gray
                for ($i = 0; $i -lt $snapshots.Count; $i++) {
                    $snap = $snapshots[$i]
                    $statusColor = switch ($snap.status) {
                        "succeeded" { "Green" }
                        "inProgress" { "Yellow" }
                        "failed" { "Red" }
                        default { "Gray" }
                    }
                    Write-Host ("{0,2}. " -f ($i + 1)) -NoNewline
                    Write-Host $snap.displayName -ForegroundColor White
                    Write-Host ("    ID: {0}" -f $snap.id) -ForegroundColor Gray
                    Write-Host "    Status: " -NoNewline
                    Write-Host $snap.status -ForegroundColor $statusColor
                    Write-Host "    Created: $($snap.createdDateTime)" -ForegroundColor Gray
                    Write-Host ""
                }
                Write-Host "=================================================================" -ForegroundColor Gray

                # Let user select a snapshot
                Write-Host "`nYou can enter the snapshot number or paste the full snapshot ID" -ForegroundColor Yellow
                Write-Host "Enter 0 to cancel" -ForegroundColor Gray
                $selection = Read-Host "Select snapshot to delete (0-$($snapshots.Count) or ID)"

                # Check for cancellation
                if ($selection -eq "0") {
                    Write-Host "`nDeletion cancelled." -ForegroundColor Yellow
                    Read-Host "`nPress Enter to continue"
                    continue
                }

                # Determine which snapshot was selected
                $selectedSnapshot = $null
                if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $snapshots.Count) {
                    $selectedSnapshot = $snapshots[[int]$selection - 1]
                } else {
                    # Try to find by ID
                    $selectedSnapshot = $snapshots | Where-Object { $_.id -eq $selection }
                }

                if (-not $selectedSnapshot) {
                    Write-Host "`nInvalid selection. Please try again." -ForegroundColor Red
                    Read-Host "`nPress Enter to continue"
                    continue
                }

                # Confirm deletion
                Write-Host "`nYou are about to delete:" -ForegroundColor Yellow
                Write-Host "  Name: $($selectedSnapshot.displayName)" -ForegroundColor White
                Write-Host "  ID: $($selectedSnapshot.id)" -ForegroundColor Gray
                Write-Host "  Status: $($selectedSnapshot.status)" -ForegroundColor Gray
                Write-Host "`nWARNING: This action cannot be undone!" -ForegroundColor Red

                $confirm = Read-Host "`nAre you sure you want to delete this snapshot? (yes/no)"
                if ($confirm -eq "yes") {
                    Remove-UTCMSnapshot -SnapshotId $selectedSnapshot.id -Confirm:$false
                } else {
                    Write-Host "`nDeletion cancelled." -ForegroundColor Yellow
                }
                Read-Host "`nPress Enter to continue"
            }
            "8" {
                Write-Host "`n=== Create New Monitor ===" -ForegroundColor Cyan

                # First, get and display available snapshots
                Write-Host "`nRetrieving available snapshots..." -ForegroundColor Cyan
                $snapshots = Get-UTCMSnapshot

                if (-not $snapshots -or $snapshots.Count -eq 0) {
                    Write-Host "`nNo snapshots available. Please create a snapshot first (option 4)." -ForegroundColor Red
                    Read-Host "`nPress Enter to continue"
                    continue
                }

                # Display snapshots in a numbered list
                Write-Host "`nAvailable Snapshots:" -ForegroundColor Yellow
                Write-Host "=================================================================" -ForegroundColor Gray
                for ($i = 0; $i -lt $snapshots.Count; $i++) {
                    $snap = $snapshots[$i]
                    $statusColor = switch ($snap.status) {
                        "succeeded" { "Green" }
                        "inProgress" { "Yellow" }
                        "failed" { "Red" }
                        default { "Gray" }
                    }
                    Write-Host ("{0,2}. " -f ($i + 1)) -NoNewline
                    Write-Host $snap.displayName -ForegroundColor White
                    Write-Host ("    ID: {0}" -f $snap.id) -ForegroundColor Gray
                    Write-Host "    Status: " -NoNewline
                    Write-Host $snap.status -ForegroundColor $statusColor
                    Write-Host "    Created: $($snap.createdDateTime)" -ForegroundColor Gray
                    Write-Host ""
                }
                Write-Host "=================================================================" -ForegroundColor Gray

                # Let user select a snapshot
                Write-Host "`nYou can enter the snapshot number or paste the full snapshot ID" -ForegroundColor Yellow
                $selection = Read-Host "Select snapshot (1-$($snapshots.Count) or ID)"

                # Determine which snapshot was selected
                $selectedSnapshot = $null
                if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $snapshots.Count) {
                    $selectedSnapshot = $snapshots[[int]$selection - 1]
                } else {
                    # Try to find by ID
                    $selectedSnapshot = $snapshots | Where-Object { $_.id -eq $selection }
                }

                if (-not $selectedSnapshot) {
                    Write-Host "`nInvalid selection. Please try again." -ForegroundColor Red
                    Read-Host "`nPress Enter to continue"
                    continue
                }

                # Check if selected snapshot has succeeded
                if ($selectedSnapshot.status -ne "succeeded") {
                    Write-Host "`nWarning: Selected snapshot status is '$($selectedSnapshot.status)', not 'succeeded'" -ForegroundColor Yellow
                    $continue = Read-Host "Do you want to continue anyway? (yes/no)"
                    if ($continue -ne "yes") {
                        Write-Host "`nMonitor creation cancelled." -ForegroundColor Yellow
                        Read-Host "`nPress Enter to continue"
                        continue
                    }
                }

                Write-Host "`nSelected snapshot: $($selectedSnapshot.displayName)" -ForegroundColor Green
                Write-Host "Snapshot ID: $($selectedSnapshot.id)" -ForegroundColor Gray

                # Now get monitor details
                Write-Host "`n--- Monitor Details ---" -ForegroundColor Cyan
                Write-Host "Note: Monitor display name must be 8-32 characters" -ForegroundColor Yellow
                $displayName = Read-Host "`nEnter monitor display name (8-32 chars)"

                # Validate display name length
                if ($displayName.Length -lt 8 -or $displayName.Length -gt 32) {
                    Write-Host "`nError: Display name must be between 8 and 32 characters (current: $($displayName.Length))" -ForegroundColor Red
                } else {
                    $description = Read-Host "Enter description (optional)"

                    # Create the monitor
                    New-UTCMMonitor -DisplayName $displayName -Description $description -BaselineSnapshotId $selectedSnapshot.id
                }
                Read-Host "`nPress Enter to continue"
            }
            "9" {
                $monitors = Get-UTCMMonitor
                if ($monitors) {
                    $monitors | Format-Table -AutoSize id, displayName, createdDateTime
                }
                Read-Host "`nPress Enter to continue"
            }
            "10" {
                $monitorId = Read-Host "`nEnter monitor ID"
                if ($monitorId) {
                    $monitor = Get-UTCMMonitor -MonitorId $monitorId
                    if ($monitor) {
                        $monitor | Format-List
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "11" {
                $monitorId = Read-Host "`nEnter monitor ID"
                $newBaselineId = Read-Host "Enter new baseline snapshot ID"
                if ($monitorId -and $newBaselineId) {
                    Update-UTCMMonitorBaseline -MonitorId $monitorId -NewBaselineSnapshotId $newBaselineId
                }
                Read-Host "`nPress Enter to continue"
            }
            "12" {
                $monitorId = Read-Host "`nEnter monitor ID to delete"
                if ($monitorId) {
                    $confirm = Read-Host "Are you sure you want to delete this monitor? (yes/no)"
                    if ($confirm -eq "yes") {
                        Remove-UTCMMonitor -MonitorId $monitorId -Confirm:$false
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "13" {
                Write-Host "`nStatus filter:" -ForegroundColor Yellow
                Write-Host "  1. Active" -ForegroundColor Gray
                Write-Host "  2. Resolved" -ForegroundColor Gray
                Write-Host "  3. All" -ForegroundColor Gray
                $statusChoice = Read-Host "Select status (1-3, default: 3)"
                $status = switch ($statusChoice) {
                    "1" { "Active" }
                    "2" { "Resolved" }
                    default { "All" }
                }
                $drifts = Get-UTCMDrift -Status $status
                if ($drifts) {
                    $drifts | Format-Table -AutoSize id, status, detectedDateTime, resourceType
                }
                Read-Host "`nPress Enter to continue"
            }
            "14" {
                $driftId = Read-Host "`nEnter drift ID"
                if ($driftId) {
                    $drift = Get-UTCMDriftDetail -DriftId $driftId
                    if ($drift) {
                        $drift | Format-List
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "15" {
                $monitorId = Read-Host "`nEnter monitor ID (optional, leave blank for all)"
                if ($monitorId) {
                    $results = Get-UTCMMonitoringResult -MonitorId $monitorId
                } else {
                    $results = Get-UTCMMonitoringResult
                }
                if ($results) {
                    $results | Format-Table -AutoSize id, monitorId, runStatus, runInitiationDateTime, runCompletionDateTime, driftsCount
                }
                Read-Host "`nPress Enter to continue"
            }
            "16" {
                Get-UTCMSummary
                Read-Host "`nPress Enter to continue"
            }
            "17" {
                Get-UTCMResourceTypes
                Read-Host "`nPress Enter to continue"
            }
            "18" {
                Disconnect-MgGraph
                Connect-UTCM
                $context = Get-MgContext
                Read-Host "`nPress Enter to continue"
            }
            "19" {
                Get-UTCMTenantContext | Format-Table -AutoSize TenantId, DisplayName, Account, IsActive, ConnectedAt
                Read-Host "`nPress Enter to continue"
            }
            "20" {
                $tenantContexts = Get-UTCMTenantContext
                if ($tenantContexts.Count -le 1) {
                    Write-Host "`nOnly one tenant connected. Connect additional tenants first (option 21)." -ForegroundColor Yellow
                } else {
                    Write-Host "`nConnected Tenants:" -ForegroundColor Yellow
                    for ($i = 0; $i -lt $tenantContexts.Count; $i++) {
                        $t = $tenantContexts[$i]
                        $marker = if ($t.IsActive) { " (active)" } else { "" }
                        Write-Host "  $($i + 1). $($t.DisplayName) - $($t.TenantId)$marker" -ForegroundColor $(if ($t.IsActive) { "Green" } else { "White" })
                    }
                    $selection = Read-Host "`nSelect tenant (1-$($tenantContexts.Count))"
                    if ($selection -match '^\d+$' -and [int]$selection -ge 1 -and [int]$selection -le $tenantContexts.Count) {
                        $selected = $tenantContexts[[int]$selection - 1]
                        Set-UTCMTenantContext -TenantId $selected.TenantId
                        $context = Get-MgContext
                    } else {
                        Write-Host "`nInvalid selection." -ForegroundColor Red
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "21" {
                $tenantId = Read-Host "`nEnter Azure AD Tenant ID for the new tenant"
                if ($tenantId) {
                    $displayName = Read-Host "Enter a friendly name (optional)"
                    if ($displayName) {
                        Connect-UTCM -TenantId $tenantId -DisplayName $displayName
                    } else {
                        Connect-UTCM -TenantId $tenantId
                    }
                    $context = Get-MgContext
                }
                Read-Host "`nPress Enter to continue"
            }
            "22" {
                $tenantContexts = Get-UTCMTenantContext
                if ($tenantContexts.Count -lt 2) {
                    Write-Host "`nNeed at least 2 connected tenants for cross-tenant comparison." -ForegroundColor Yellow
                    Write-Host "Use option 21 to connect additional tenants." -ForegroundColor Gray
                } else {
                    Write-Host "`nSelect SOURCE tenant:" -ForegroundColor Yellow
                    for ($i = 0; $i -lt $tenantContexts.Count; $i++) {
                        Write-Host "  $($i + 1). $($tenantContexts[$i].DisplayName)" -ForegroundColor White
                    }
                    $srcSel = Read-Host "Source tenant (1-$($tenantContexts.Count))"
                    $srcTenant = $tenantContexts[[int]$srcSel - 1]
                    $srcSnapshotId = Read-Host "Enter source snapshot ID"

                    Write-Host "`nSelect TARGET tenant:" -ForegroundColor Yellow
                    for ($i = 0; $i -lt $tenantContexts.Count; $i++) {
                        Write-Host "  $($i + 1). $($tenantContexts[$i].DisplayName)" -ForegroundColor White
                    }
                    $tgtSel = Read-Host "Target tenant (1-$($tenantContexts.Count))"
                    $tgtTenant = $tenantContexts[[int]$tgtSel - 1]
                    $tgtSnapshotId = Read-Host "Enter target snapshot ID"

                    if ($srcSnapshotId -and $tgtSnapshotId) {
                        $diffs = Compare-UTCMSnapshot `
                            -SourceTenantId $srcTenant.TenantId `
                            -SourceSnapshotId $srcSnapshotId `
                            -TargetTenantId $tgtTenant.TenantId `
                            -TargetSnapshotId $tgtSnapshotId
                        if ($diffs) {
                            $diffs | Format-Table -AutoSize Status, ResourceType, ResourceName
                        }
                    }
                }
                Read-Host "`nPress Enter to continue"
            }
            "0" {
                Write-Host "`nExiting UTCM Interactive Console..." -ForegroundColor Cyan
                return
            }
            default {
                Write-Host "`nInvalid option. Please try again." -ForegroundColor Red
                Start-Sleep -Seconds 1
            }
        }
    } while ($true)
}
