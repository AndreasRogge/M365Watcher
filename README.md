# Microsoft Graph UTCM PowerShell Script - Quick Reference Guide

## Overview

This PowerShell script provides comprehensive management of Microsoft's Unified Tenant Configuration Management (UTCM) APIs through Microsoft Graph. UTCM enables automated monitoring of Microsoft 365 tenant configuration settings and detection of configuration drift across workloads.

## Prerequisites

- **PowerShell 7.0 or later** (recommended)
- **Microsoft.Graph.Authentication module**
  ```powershell
  Install-Module Microsoft.Graph.Authentication -Scope CurrentUser
  ```
- **Permissions Required:**
  - Graph API: `ConfigurationMonitoring.ReadWrite.All`
  - Service Principal: Various workload-specific permissions

## Supported Workloads

- **Entra ID** (Conditional Access, Authentication Methods, etc.)
- **Exchange Online** (Transport Rules, CAS Mailbox Plans, etc.)
- **Microsoft Intune** (Device Compliance, Configuration Policies)
- **Microsoft Teams** (Meeting Policies, Messaging Policies)
- **Microsoft Defender**
- **Microsoft Purview** (Retention Policies, Sensitivity Labels)

## Quick Start

### 1. Initial Setup

```powershell
# Load the script
. .\UTCM-Management.ps1

# Connect to Microsoft Graph
Connect-UTCM

# Create the UTCM service principal
Initialize-UTCMServicePrincipal

# Grant required permissions
Grant-UTCMPermissions -Permissions @(
    'Policy.Read.All',
    'Policy.ReadWrite.ConditionalAccess'
)
```

### 2. Create Your First Snapshot

```powershell
# Create a snapshot of Conditional Access policies
$snapshot = New-UTCMSnapshot `
    -DisplayName "CA Policies Baseline - $(Get-Date -Format 'yyyy-MM-dd')" `
    -Description "Baseline snapshot for Conditional Access policies" `
    -Resources @('microsoft.entra.conditionalaccesspolicy')

# View snapshot details
$snapshot | Format-List
```

### 3. Create a Monitor

```powershell
# Wait a moment for snapshot to complete
Start-Sleep -Seconds 15

# Create a monitor using the snapshot
$monitor = New-UTCMMonitor `
    -DisplayName "CA Policy Monitor" `
    -Description "Monitors Conditional Access policies for unauthorized changes" `
    -BaselineSnapshotId $snapshot.id

# View monitor details
$monitor | Format-List
```

### 4. Check for Drift

```powershell
# Wait for first monitoring cycle (monitors run every 6 hours)
# Or make a change to trigger drift...

# Get all active drifts
Get-UTCMDrift -Status Active

# Get drifts for a specific monitor
Get-UTCMDrift -MonitorId $monitor.id

# Get detailed drift information
$drifts = Get-UTCMDrift -Status Active
if ($drifts.Count -gt 0) {
    $driftDetail = Get-UTCMDriftDetail -DriftId $drifts[0].id
    $driftDetail | ConvertTo-Json -Depth 10
}
```

## Common Usage Examples

### Example 1: Monitor Exchange Transport Rules

```powershell
# Create snapshot
$exSnapshot = New-UTCMSnapshot `
    -DisplayName "Exchange Transport Rules Baseline" `
    -Description "Baseline for all transport rules" `
    -Resources @('microsoft.exchange.transportRule')

# Grant Exchange permissions if needed
Grant-UTCMPermissions -Permissions @('Exchange.ManageAsApp')

# Create monitor
$exMonitor = New-UTCMMonitor `
    -DisplayName "Transport Rules Monitor" `
    -Description "Monitors Exchange transport rules" `
    -BaselineSnapshotId $exSnapshot.id
```

### Example 2: Monitor Multiple Entra ID Policies

```powershell
# Create comprehensive Entra ID snapshot
$entraSnapshot = New-UTCMSnapshot `
    -DisplayName "Entra ID Security Baseline" `
    -Description "All critical Entra ID security policies" `
    -Resources @(
        'microsoft.entra.conditionalaccesspolicy',
        'microsoft.entra.authenticationmethodpolicy',
        'microsoft.entra.authorizationpolicy'
    )

# Create monitor
$entraMonitor = New-UTCMMonitor `
    -DisplayName "Entra ID Security Monitor" `
    -Description "Comprehensive Entra ID security monitoring" `
    -BaselineSnapshotId $entraSnapshot.id
```

### Example 3: Monitor Intune Compliance Policies

```powershell
# Ensure proper permissions
Grant-UTCMPermissions -Permissions @(
    'DeviceManagementConfiguration.Read.All',
    'Policy.Read.All'
)

# Create Intune snapshot
$intuneSnapshot = New-UTCMSnapshot `
    -DisplayName "Intune Compliance Baseline" `
    -Description "Device compliance policies baseline" `
    -Resources @('microsoft.intune.deviceCompliancePolicy')

# Create monitor
$intuneMonitor = New-UTCMMonitor `
    -DisplayName "Intune Compliance Monitor" `
    -Description "Monitors device compliance policies" `
    -BaselineSnapshotId $intuneSnapshot.id
```

### Example 4: Get Configuration Summary

```powershell
# Get overall UTCM status
Get-UTCMSummary

# Get all snapshots
$allSnapshots = Get-UTCMSnapshot
$allSnapshots | Format-Table displayName, status, createdDateTime

# Get all monitors
$allMonitors = Get-UTCMMonitor
$allMonitors | Format-Table displayName, id, createdDateTime

# Get monitoring results
$results = Get-UTCMMonitoringResult
$results | Select-Object monitorId, status, detectedDateTime | Format-Table
```

### Example 5: Update Monitor Baseline

```powershell
# Create new snapshot with current configuration
$newBaseline = New-UTCMSnapshot `
    -DisplayName "Updated CA Baseline - $(Get-Date -Format 'yyyy-MM-dd')" `
    -Description "Updated baseline after approved changes" `
    -Resources @('microsoft.entra.conditionalaccesspolicy')

# Wait for snapshot completion
Start-Sleep -Seconds 15

# Update the monitor
Update-UTCMMonitorBaseline `
    -MonitorId $monitor.id `
    -NewBaselineSnapshotId $newBaseline.id

# Note: This will delete all previous drift records
```

### Example 6: Cleanup Old Snapshots

```powershell
# Get all snapshots
$snapshots = Get-UTCMSnapshot

# Filter snapshots older than 5 days
$oldSnapshots = $snapshots | Where-Object { 
    $_.createdDateTime -lt (Get-Date).AddDays(-5) 
}

# Delete old snapshots
foreach ($snap in $oldSnapshots) {
    Write-Host "Deleting snapshot: $($snap.displayName)" -ForegroundColor Yellow
    Remove-UTCMSnapshot -SnapshotId $snap.id -Confirm:$false
}
```

### Example 7: Export Drift Report

```powershell
# Get all active drifts
$drifts = Get-UTCMDrift -Status Active

# Create detailed report
$report = foreach ($drift in $drifts) {
    $detail = Get-UTCMDriftDetail -DriftId $drift.id
    
    [PSCustomObject]@{
        MonitorName = ($allMonitors | Where-Object {$_.id -eq $drift.monitorId}).displayName
        ResourceType = $drift.resourceType
        ResourceId = $drift.resourceId
        DetectedDate = $drift.detectedDateTime
        ChangeType = $drift.changeType
        Status = $drift.status
    }
}

# Export to CSV
$report | Export-Csv -Path "UTCM-Drift-Report-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation

# Display report
$report | Format-Table -AutoSize
```

## Resource Types Reference

### Entra ID Resources
- `microsoft.entra.conditionalaccesspolicy`
- `microsoft.entra.authenticationmethodpolicy`
- `microsoft.entra.authorizationpolicy`
- `microsoft.entra.identitySecurityDefaultsEnforcementPolicy`

### Exchange Online Resources
- `microsoft.exchange.casMailboxPlan`
- `microsoft.exchange.transportRule`
- `microsoft.exchange.mailboxPlan`
- `microsoft.exchange.acceptedDomain`
- `microsoft.exchange.remoteDomain`

### Intune Resources
- `microsoft.intune.deviceCompliancePolicy`
- `microsoft.intune.deviceConfiguration`
- `microsoft.intune.deviceEnrollmentConfiguration`

### Teams Resources
- `microsoft.teams.meetingPolicy`
- `microsoft.teams.messagingPolicy`
- `microsoft.teams.callingPolicy`

### Purview Resources
- `microsoft.purview.retentionPolicy`
- `microsoft.purview.sensitivityLabel`
- `microsoft.purview.dataLossPreventionPolicy`

## Required Permissions by Resource Type

| Resource Type | Required Permissions |
|--------------|---------------------|
| Conditional Access | Policy.Read.All, Policy.ReadWrite.ConditionalAccess |
| Authentication Methods | Policy.Read.All, Policy.ReadWrite.AuthenticationMethod |
| Exchange Transport Rules | Exchange.ManageAsApp |
| Intune Policies | DeviceManagementConfiguration.Read.All |
| Teams Policies | TeamworkConfiguration.Read.All |

## Important Limitations

- **Maximum 30 monitors per tenant**
- **Maximum 800 resources monitored per day** across all monitors
- **Monitors run every 6 hours** (fixed interval, cannot be changed)
- **Maximum 12 snapshot jobs visible** at a time
- **Snapshots retained for 7 days** before automatic deletion
- **20,000 resource limit** per month for snapshot extractions
- **Updating a monitor's baseline deletes** all previous drift records

## Troubleshooting

### Issue: "Service principal not found"
**Solution:** Run `Initialize-UTCMServicePrincipal` first

### Issue: "Permission denied" errors
**Solution:** Ensure you've granted the correct permissions:
```powershell
Grant-UTCMPermissions -Permissions @('Policy.Read.All', 'Policy.ReadWrite.ConditionalAccess')
```

### Issue: Snapshot status shows "Failed"
**Solution:** Check that:
1. UTCM service principal has required permissions
2. Resource type names are correct
3. Resources exist in your tenant

### Issue: No drifts detected after changes
**Solution:** 
- Monitors run every 6 hours; wait for next cycle
- Verify monitor is active: `Get-UTCMMonitor -MonitorId <id>`
- Check monitoring results: `Get-UTCMMonitoringResult -MonitorId <id>`

### Issue: Cannot connect to Graph
**Solution:**
```powershell
# Disconnect and reconnect
Disconnect-MgGraph
Connect-UTCM -Scopes @('ConfigurationMonitoring.ReadWrite.All', 'Directory.ReadWrite.All')
```

## Best Practices

1. **Use Descriptive Names**: Include dates and resource types in snapshot names
2. **Regular Baseline Updates**: Update baselines after approved configuration changes
3. **Monitor Critical Resources**: Start with high-impact policies (CA, transport rules)
4. **Export Reports**: Regularly export drift reports for compliance/audit
5. **Cleanup Old Snapshots**: Delete snapshots older than 7 days (they auto-delete anyway)
6. **Grant Minimum Permissions**: Only grant permissions needed for resources you're monitoring
7. **Test in Non-Production**: Test monitoring setup in dev/test tenant first
8. **Document Monitors**: Keep track of what each monitor watches and why

## Automation Examples

### Schedule Daily Drift Report via Task Scheduler

```powershell
# Create script to run daily
$scriptContent = @'
. .\UTCM-Management.ps1
Connect-UTCM
$drifts = Get-UTCMDrift -Status Active
if ($drifts.Count -gt 0) {
    $drifts | Export-Csv "C:\Reports\UTCM-Drift-$(Get-Date -Format 'yyyy-MM-dd').csv" -NoTypeInformation
    # Send email notification (add your email logic here)
}
'@

$scriptContent | Out-File "C:\Scripts\Daily-UTCM-Check.ps1"

# Create scheduled task (run as admin)
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\Scripts\Daily-UTCM-Check.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "UTCM Daily Drift Check" -Description "Checks for UTCM drifts daily"
```

### Azure Automation Runbook Example

```powershell
# Azure Automation Runbook
param()

# Connect using Managed Identity
Connect-AzAccount -Identity
Connect-MgGraph -Identity

# Load UTCM functions
. .\UTCM-Management.ps1

# Check for drifts
$drifts = Get-UTCMDrift -Status Active

if ($drifts.Count -gt 0) {
    # Create detailed report
    $report = $drifts | ForEach-Object {
        Get-UTCMDriftDetail -DriftId $_.id
    }
    
    # Store in blob storage or send notification
    # Add your logic here
}
```

## Additional Resources

- [Official Microsoft Documentation](https://learn.microsoft.com/en-us/graph/api/resources/unified-tenant-configuration-management-api-overview)
- [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- [UTCM Authentication Setup](https://learn.microsoft.com/en-us/graph/utcm-authentication-setup)
- [Microsoft 365 DSC to UTCM Migration](https://microsoft365dsc.com/)

## License

This script is provided as-is for educational and operational purposes.

## Contributing

Feel free to extend this script with additional functionality or improve existing functions.
