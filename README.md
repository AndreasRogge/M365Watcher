# Microsoft Graph UTCM PowerShell Script - Quick Reference Guide

## Overview

This PowerShell script provides comprehensive management of Microsoft's Unified Tenant Configuration Management (UTCM) APIs through Microsoft Graph. UTCM enables automated monitoring of Microsoft 365 tenant configuration settings and detection of configuration drift across workloads.

> **⚠️ Important:** UTCM is currently in **preview** and may not be available in all Microsoft 365 tenants. Use `Test-UTCMAvailability` to check if UTCM is enabled in your tenant before proceeding.

## Features

- ✅ **Interactive Menu Interface** - User-friendly menu for all operations
- ✅ **Complete UTCM Management** - All snapshot, monitor, and drift operations
- ✅ **Resilient API Layer** - Automatic retry with exponential backoff (429/503/504), pagination, structured error parsing
- ✅ **Resource Type Validation** - 107 verified types validated before API calls
- ✅ **Safe Operations** - `-WhatIf`/`-Confirm` support on all destructive operations
- ✅ **Service Principal Setup** - Automated UTCM service principal creation
- ✅ **Permission Management** - Grant and verify required permissions
- ✅ **Drift Detection** - Monitor configuration changes across workloads
- ✅ **Export & Reporting** - Generate drift reports and summaries
- ✅ **Automation Ready** - All functions support scripting and automation

## Prerequisites

- **PowerShell 7.0 or later** (recommended)
- **Microsoft.Graph.Authentication module**
  ```powershell
  Install-Module Microsoft.Graph.Authentication -Scope CurrentUser
  ```
- **Permissions Required:**
  - Graph API: `ConfigurationMonitoring.ReadWrite.All`
  - Service Principal: Various workload-specific permissions
- **UTCM Availability:** UTCM must be enabled in your tenant (currently in preview)

## Supported Workloads

- **Entra ID** - 13 verified types (Authorization Policy, Admin Units, Applications, Groups, Security Defaults, and more)
- **Exchange Online** - 47 verified types (Transport Rules, Anti-Phish, Safe Links, Malware Filter, Connectors, and more)
- **Microsoft Intune** - 4 verified types (Device Category, Policy Sets, Role Assignments, Role Definitions)
- **Security & Compliance** - 10 verified types (DLP, Case Hold, Compliance Search, Label Policy, and more)
- **Microsoft Teams** - 33 verified types (Meeting, Messaging, Calling, Voice Routing, and more)

> **107 of 270 schema resource types confirmed working.** See [Resource Types Reference](#resource-types-reference) for the full list.

## Available Functions

### Connection & Setup
- `Connect-UTCM` - Connect to Microsoft Graph with UTCM permissions
- `Test-UTCMAvailability` - Test if UTCM is available in tenant
- `Initialize-UTCMServicePrincipal` - Create UTCM service principal
- `Grant-UTCMPermissions` - Grant permissions to UTCM service principal

### Snapshot Management
- `New-UTCMSnapshot` - Create a configuration snapshot
- `Get-UTCMSnapshot` - Get snapshots (all or specific)
- `Remove-UTCMSnapshot` - Delete a snapshot

### Monitor Management
- `New-UTCMMonitor` - Create a configuration monitor
- `Get-UTCMMonitor` - Get monitors (all, specific, or by name)
- `Remove-UTCMMonitor` - Delete a monitor
- `Update-UTCMMonitorBaseline` - Update monitor baseline snapshot

### Drift Detection
- `Get-UTCMDrift` - Get configuration drifts (with filters)
- `Get-UTCMDriftDetail` - Get detailed drift information

### Results & Reporting
- `Get-UTCMMonitoringResult` - Get monitoring results
- `Get-UTCMSummary` - Display UTCM configuration summary

### Utilities
- `Get-UTCMResourceTypes` - Show available resource types
- `Start-UTCMInteractive` - Launch interactive menu interface
- `Start-UTCMExample` - Run example workflow

## Quick Start

### Interactive Mode (Recommended for Beginners)

The script includes an interactive menu-driven interface for easy management:

```powershell
# Launch interactive mode
.\UTCM-Management.ps1 -Interactive

# Or load the script and start interactive mode
. .\UTCM-Management.ps1
Start-UTCMInteractive
```

The interactive menu provides a user-friendly interface with all UTCM operations organized by category:
- Setup & Configuration
- Snapshot Management (with smart snapshot selection)
- Monitor Management (with smart snapshot selection)
- Drift & Results
- Utilities

**Enhanced User Experience:**
- **Smart Snapshot Selection**: Options 7 (Delete Snapshot) and 8 (Create Monitor) automatically fetch and display a numbered list of available snapshots
- **Color-Coded Status**:
  - 🟢 Green = Succeeded
  - 🟡 Yellow = In Progress
  - 🔴 Red = Failed
- **Flexible Selection**: Choose snapshots by number (1, 2, 3) or by full snapshot ID
- **Easy Cancellation**: Enter 0 to cancel and return to the main menu
- **Clean Display**: Clear screen formatting for better readability

**Interactive Menu Operations:**

When you select option **7 (Delete Snapshot)** or **8 (Create Monitor)**, the script will:
1. Automatically fetch all available snapshots from your tenant
2. Display them in a numbered, color-coded list showing:
   - Snapshot number (for easy selection)
   - Display name
   - Status (succeeded, inProgress, failed)
   - Creation date
3. Allow you to select by:
   - Entering the number (e.g., `1` for the first snapshot)
   - Pasting the full snapshot ID
   - Entering `0` to cancel
4. Validate your selection before proceeding

This eliminates the need to manually look up snapshot IDs and makes the interactive mode significantly more user-friendly.

### Command-Line Mode

For automation and scripting, use the individual functions:

#### 1. Initial Setup

```powershell
# Load the script
. .\UTCM-Management.ps1

# Test if UTCM is available in your tenant
Test-UTCMAvailability

# Connect to Microsoft Graph
Connect-UTCM

# Create the UTCM service principal
Initialize-UTCMServicePrincipal

# Grant required permissions
Grant-UTCMPermissions -Permissions @(
    'Policy.Read.All'
)
```

#### 2. Create Your First Snapshot

```powershell
# Create a snapshot of Exchange transport rules
$snapshot = New-UTCMSnapshot `
    -DisplayName "Transport Rules Baseline - $(Get-Date -Format 'yyyy-MM-dd')" `
    -Description "Baseline snapshot for Exchange transport rules" `
    -Resources @('microsoft.exchange.transportrule')

# View snapshot details
$snapshot | Format-List
```

#### 3. Create a Monitor

```powershell
# Wait a moment for snapshot to complete
Start-Sleep -Seconds 15

# Create a monitor using the snapshot
# Note: Monitor display name must be 8-32 characters
$monitor = New-UTCMMonitor `
    -DisplayName "Transport Rules Monitor" `
    -Description "Monitors Exchange transport rules for unauthorized changes" `
    -BaselineSnapshotId $snapshot.id

# View monitor details
$monitor | Format-List
```

**Important:**
- Monitor display name must be between 8 and 32 characters
- The function automatically retrieves the snapshot's baseline configuration
- Ensure the snapshot job has completed before creating the monitor

#### 4. Check for Drift

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
    -Resources @('microsoft.exchange.transportrule')

# Grant Exchange permissions if needed
Grant-UTCMPermissions -Permissions @('Exchange.ManageAsApp')

# Create monitor
$exMonitor = New-UTCMMonitor `
    -DisplayName "Transport Rules Monitor" `
    -Description "Monitors Exchange transport rules" `
    -BaselineSnapshotId $exSnapshot.id
```

### Example 2: Monitor Teams Policies

```powershell
# Create Teams snapshot
$teamsSnapshot = New-UTCMSnapshot `
    -DisplayName "Teams Policies Baseline" `
    -Description "Baseline for Teams meeting and messaging policies" `
    -Resources @(
        'microsoft.teams.meetingpolicy',
        'microsoft.teams.messagingpolicy'
    )

# Create monitor
$teamsMonitor = New-UTCMMonitor `
    -DisplayName "Teams Policies Monitor" `
    -Description "Monitors Teams policies for unauthorized changes" `
    -BaselineSnapshotId $teamsSnapshot.id
```

### Example 3: Get Configuration Summary

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

### Example 4: Update Monitor Baseline

```powershell
# Create new snapshot with current configuration
$newBaseline = New-UTCMSnapshot `
    -DisplayName "Updated Rules Baseline - $(Get-Date -Format 'yyyy-MM-dd')" `
    -Description "Updated baseline after approved changes" `
    -Resources @('microsoft.exchange.transportrule')

# Wait for snapshot completion
Start-Sleep -Seconds 15

# Update the monitor
Update-UTCMMonitorBaseline `
    -MonitorId $monitor.id `
    -NewBaselineSnapshotId $newBaseline.id

# Note: This will delete all previous drift records
```

### Example 5: Cleanup Old Snapshots

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

### Example 6: Export Drift Report

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

The UTCM schema defines [270+ resource types](https://www.schemastore.org/utcm-monitor.json). We tested all of them against the API - **107 confirmed working**, 163 returned errors.

### Entra ID Resources (13 verified)
- `microsoft.entra.administrativeunit`
- `microsoft.entra.application`
- `microsoft.entra.authorizationpolicy`
- `microsoft.entra.group`
- `microsoft.entra.grouplifecyclepolicy`
- `microsoft.entra.namedlocationpolicy`
- `microsoft.entra.roledefinition`
- `microsoft.entra.rolesetting`
- `microsoft.entra.securitydefaults`
- `microsoft.entra.serviceprincipal`
- `microsoft.entra.tenantdetails`
- `microsoft.entra.tokenlifetimepolicy`
- `microsoft.entra.user`

### Exchange Online Resources (47 verified)
- `microsoft.exchange.accepteddomain`
- `microsoft.exchange.antiphishpolicy`
- `microsoft.exchange.antiphishrule`
- `microsoft.exchange.atppolicyforo365`
- `microsoft.exchange.authenticationpolicy`
- `microsoft.exchange.availabilityconfig`
- `microsoft.exchange.calendarprocessing`
- `microsoft.exchange.casmailboxplan`
- `microsoft.exchange.casmailboxsettings`
- `microsoft.exchange.dataclassification`
- `microsoft.exchange.dataencryptionpolicy`
- `microsoft.exchange.distributiongroup`
- `microsoft.exchange.dkimsigningconfig`
- `microsoft.exchange.emailaddresspolicy`
- `microsoft.exchange.groupsettings`
- `microsoft.exchange.inboundconnector`
- `microsoft.exchange.irmconfiguration`
- `microsoft.exchange.journalrule`
- `microsoft.exchange.mailboxpermission`
- `microsoft.exchange.mailboxplan`
- `microsoft.exchange.mailboxsettings`
- `microsoft.exchange.mailcontact`
- `microsoft.exchange.mailtips`
- `microsoft.exchange.malwarefilterpolicy`
- `microsoft.exchange.malwarefilterrule`
- `microsoft.exchange.managementrole`
- `microsoft.exchange.omeconfiguration`
- `microsoft.exchange.organizationconfig`
- `microsoft.exchange.outboundconnector`
- `microsoft.exchange.owamailboxpolicy`
- `microsoft.exchange.partnerapplication`
- `microsoft.exchange.place`
- `microsoft.exchange.policytipconfig`
- `microsoft.exchange.quarantinepolicy`
- `microsoft.exchange.recipientpermission`
- `microsoft.exchange.remotedomain`
- `microsoft.exchange.reportsubmissionrule`
- `microsoft.exchange.roleassignmentpolicy`
- `microsoft.exchange.rolegroup`
- `microsoft.exchange.safeattachmentpolicy`
- `microsoft.exchange.safeattachmentrule`
- `microsoft.exchange.safelinkspolicy`
- `microsoft.exchange.safelinksrule`
- `microsoft.exchange.sharedmailbox`
- `microsoft.exchange.sharingpolicy`
- `microsoft.exchange.transportconfig`
- `microsoft.exchange.transportrule`

### Intune Resources (4 verified)
- `microsoft.intune.devicecategory`
- `microsoft.intune.policysets`
- `microsoft.intune.roleassignment`
- `microsoft.intune.roledefinition`

### Security & Compliance Resources (10 verified)
- `microsoft.securityandcompliance.caseholdpolicy`
- `microsoft.securityandcompliance.caseholdrule`
- `microsoft.securityandcompliance.compliancecase`
- `microsoft.securityandcompliance.compliancesearch`
- `microsoft.securityandcompliance.compliancetag`
- `microsoft.securityandcompliance.dlpcompliancepolicy`
- `microsoft.securityandcompliance.labelpolicy`
- `microsoft.securityandcompliance.protectionalert`
- `microsoft.securityandcompliance.retentioneventtype`
- `microsoft.securityandcompliance.securityfilter`

### Teams Resources (33 verified)
- `microsoft.teams.appsetuppolicy`
- `microsoft.teams.callholdpolicy`
- `microsoft.teams.callingpolicy`
- `microsoft.teams.callparkpolicy`
- `microsoft.teams.callqueue`
- `microsoft.teams.channelspolicy`
- `microsoft.teams.clientconfiguration`
- `microsoft.teams.cortanapolicy`
- `microsoft.teams.eventspolicy`
- `microsoft.teams.feedbackpolicy`
- `microsoft.teams.filespolicy`
- `microsoft.teams.ipphonepolicy`
- `microsoft.teams.meetingconfiguration`
- `microsoft.teams.meetingpolicy`
- `microsoft.teams.messagingpolicy`
- `microsoft.teams.mobilitypolicy`
- `microsoft.teams.networkroamingpolicy`
- `microsoft.teams.onlinevoiceuser`
- `microsoft.teams.pstnusage`
- `microsoft.teams.shiftspolicy`
- `microsoft.teams.templatespolicy`
- `microsoft.teams.tenantdialplan`
- `microsoft.teams.tenantnetworkregion`
- `microsoft.teams.tenantnetworksite`
- `microsoft.teams.tenantnetworksubnet`
- `microsoft.teams.translationrule`
- `microsoft.teams.upgradeconfiguration`
- `microsoft.teams.upgradepolicy`
- `microsoft.teams.user`
- `microsoft.teams.vdipolicy`
- `microsoft.teams.voiceroute`
- `microsoft.teams.voiceroutingpolicy`
- `microsoft.teams.workloadpolicy`

### Unsupported Resource Types (163 failed)

The following resource types are defined in the [UTCM schema](https://www.schemastore.org/utcm-monitor.json) but currently return `BadRequest` errors when used with the API.

<details>
<summary>Click to expand full list of unsupported types</summary>

**Entra ID (26 failed):**
- `microsoft.entra.attributeset`
- `microsoft.entra.authenticationcontextclassreference`
- `microsoft.entra.authenticationmethodpolicy`
- `microsoft.entra.authenticationmethodpolicyauthenticator`
- `microsoft.entra.authenticationmethodpolicyemail`
- `microsoft.entra.authenticationmethodpolicyfido2`
- `microsoft.entra.authenticationmethodpolicysms`
- `microsoft.entra.authenticationmethodpolicysoftware`
- `microsoft.entra.authenticationmethodpolicytemporary`
- `microsoft.entra.authenticationmethodpolicyvoice`
- `microsoft.entra.authenticationmethodpolicyx509`
- `microsoft.entra.authenticationstrengthpolicy`
- `microsoft.entra.conditionalaccesspolicy`
- `microsoft.entra.crosstenantaccesspolicy`
- `microsoft.entra.crosstenantaccesspolicyconfigurationdefault`
- `microsoft.entra.crosstenantaccesspolicyconfigurationpartner`
- `microsoft.entra.entitlementmanagementaccesspackage`
- `microsoft.entra.entitlementmanagementaccesspackageassignmentpolicy`
- `microsoft.entra.entitlementmanagementaccesspackagecatalog`
- `microsoft.entra.entitlementmanagementaccesspackagecatalogresource`
- `microsoft.entra.entitlementmanagementconnectedorganization`
- `microsoft.entra.externalidentitypolicy`
- `microsoft.entra.groupsnamingpolicy`
- `microsoft.entra.groupssettings`
- `microsoft.entra.roleeligibilityschedulerequest`
- `microsoft.entra.socialidentityprovider`

**Exchange Online (29 failed):**
- `microsoft.exchange.activesyncdeviceaccessrule`
- `microsoft.exchange.addressbookpolicy`
- `microsoft.exchange.addresslist`
- `microsoft.exchange.applicationaccesspolicy`
- `microsoft.exchange.authenticationpolicyassignment`
- `microsoft.exchange.availabilityaddressspace`
- `microsoft.exchange.clientaccessrule`
- `microsoft.exchange.eopprotectionpolicyrule`
- `microsoft.exchange.externalinoutlook`
- `microsoft.exchange.globaladdresslist`
- `microsoft.exchange.hostedconnectionfilterpolicy`
- `microsoft.exchange.hostedcontentfilterpolicy`
- `microsoft.exchange.hostedcontentfilterrule`
- `microsoft.exchange.hostedoutboundspamfilterpolicy`
- `microsoft.exchange.hostedoutboundspamfilterrule`
- `microsoft.exchange.intraorganizationconnector`
- `microsoft.exchange.mailboxautoreplyconfiguration`
- `microsoft.exchange.mailboxcalendarfolder`
- `microsoft.exchange.managementroleassignment`
- `microsoft.exchange.managementroleentry`
- `microsoft.exchange.messageclassification`
- `microsoft.exchange.mobiledevicemailboxpolicy`
- `microsoft.exchange.offlineaddressbook`
- `microsoft.exchange.onpremisesorganization`
- `microsoft.exchange.organizationrelationship`
- `microsoft.exchange.perimeterconfiguration`
- `microsoft.exchange.reportsubmissionpolicy`
- `microsoft.exchange.resourceconfiguration`
- `microsoft.exchange.sweeprule`

**Intune (65 failed):**
All `microsoft.intune.*` types except `devicecategory`, `policysets`, `roleassignment`, and `roledefinition` are unsupported. This includes all device compliance, device configuration, app protection, WiFi configuration, Windows Autopilot, and Windows Update policies.

**Security & Compliance (17 failed):**
- `microsoft.securityandcompliance.auditconfigurationpolicy`
- `microsoft.securityandcompliance.autosensitivitylabelpolicy`
- `microsoft.securityandcompliance.autosensitivitylabelrule`
- `microsoft.securityandcompliance.compliancesearchaction`
- `microsoft.securityandcompliance.deviceconditionalaccesspolicy`
- `microsoft.securityandcompliance.deviceconfigurationpolicy`
- `microsoft.securityandcompliance.dlpcompliancerule`
- `microsoft.securityandcompliance.fileplanpropertyauthority`
- `microsoft.securityandcompliance.fileplanpropertycategory`
- `microsoft.securityandcompliance.fileplanpropertycitation`
- `microsoft.securityandcompliance.fileplanpropertydepartment`
- `microsoft.securityandcompliance.fileplanpropertyreferenceid`
- `microsoft.securityandcompliance.fileplanpropertysubcategory`
- `microsoft.securityandcompliance.retentioncompliancepolicy`
- `microsoft.securityandcompliance.sensitivitylabel`
- `microsoft.securityandcompliance.supervisoryreviewpolicy`
- `microsoft.securityandcompliance.supervisoryreviewrule`

**Teams (26 failed):**
- `microsoft.teams.audioconferencingpolicy`
- `microsoft.teams.channel`
- `microsoft.teams.channeltab`
- `microsoft.teams.compliancerecordingpolicy`
- `microsoft.teams.dialinconferencingtenantsettings`
- `microsoft.teams.emergencycallingpolicy`
- `microsoft.teams.emergencycallroutingpolicy`
- `microsoft.teams.enhancedencryptionpolicy`
- `microsoft.teams.federationconfiguration`
- `microsoft.teams.grouppolicyassignment`
- `microsoft.teams.guestcallingconfiguration`
- `microsoft.teams.guestmeetingconfiguration`
- `microsoft.teams.guestmessagingconfiguration`
- `microsoft.teams.meetingbroadcastconfiguration`
- `microsoft.teams.meetingbroadcastpolicy`
- `microsoft.teams.onlinevoicemailpolicy`
- `microsoft.teams.onlinevoicemailusersettings`
- `microsoft.teams.orgwideappsettings`
- `microsoft.teams.team`
- `microsoft.teams.tenanttrustedipaddress`
- `microsoft.teams.unassignednumbertreatment`
- `microsoft.teams.updatemanagementpolicy`
- `microsoft.teams.usercallingsettings`
- `microsoft.teams.userpolicyassignment`

</details>

## Required Permissions by Resource Type

| Resource Type | Required Permissions |
|--------------|---------------------|
| Entra ID Policies | Policy.Read.All |
| Entra ID Groups/Apps | Directory.Read.All |
| Entra ID Role Definitions | RoleManagement.Read.Directory |
| Exchange Online | Exchange.ManageAsApp |
| Intune | DeviceManagementConfiguration.Read.All |
| Security & Compliance | Policy.Read.All |
| Teams Policies | TeamworkConfiguration.Read.All |

## Important Limitations & Known Issues

### UTCM Service Limitations
- **Maximum 30 monitors per tenant**
- **Maximum 800 resources monitored per day** across all monitors
- **Monitors run every 6 hours** (fixed interval, cannot be changed)
- **Maximum 12 snapshot jobs visible** at a time
- **Snapshots retained for 7 days** before automatic deletion
- **20,000 resource limit** per month for snapshot extractions
- **Updating a monitor's baseline deletes** all previous drift records

### Preview Limitations
- **UTCM availability varies by tenant** - Feature is in preview and rolling out gradually
- **Service interruptions possible** - As a preview service, occasional outages may occur
- **API endpoints may change** - Beta endpoints are subject to change without notice
- **Resource type support varies** - Not all resource types may be supported in all tenants

### Script Implementation Notes
- **Correct API endpoints used:**
  - Creating snapshots: `POST /beta/admin/configurationManagement/configurationSnapshots/createSnapshot`
  - Listing snapshots: `GET /beta/admin/configurationManagement/configurationSnapshotJobs`
  - Getting specific snapshot: `GET /beta/admin/configurationManagement/configurationSnapshotJobs/{id}`
- **Client-side filtering:** appRoleId filtering is done in PowerShell due to Graph API limitations
- **Resource type names are case-sensitive**

## Troubleshooting

### Issue: UTCM returns 404 errors
**Symptoms:** All UTCM operations return 404 or "UnknownError"
**Solution:** UTCM is not available in your tenant yet. This is a preview feature being rolled out gradually.
```powershell
# Test availability
Test-UTCMAvailability

# If not available, monitor Microsoft 365 Message Center for rollout updates
```

### Issue: "Invalid filter clause" or "appRoleId filter not supported"
**Symptoms:** Error when granting permissions: "Invalid filter clause appRoleId"
**Solution:** This is a known Graph API limitation - the script now handles this correctly by fetching all role assignments and filtering in PowerShell instead of using OData filters.

### Issue: "DisplayName must be a string with a minimum length of 8 and a maximum length of 32"
**Symptoms:** Error when creating a monitor with display name validation error
**Solution:** Ensure monitor display name is between 8-32 characters
```powershell
# Good examples (8-32 characters)
"CA Policies Monitor"
"Entra ID Security Monitor"
"Exchange Transport Rules"

# Bad examples
"Test"  # Too short (< 8 characters)
"This is a very long monitor name that exceeds thirty-two characters"  # Too long (> 32 characters)
```

### Issue: "The Resources field is required" or "The DisplayName field is required" (Baseline)
**Symptoms:** Error when creating a monitor about missing baseline fields
**Solution:** This error usually means the snapshot hasn't completed yet or doesn't contain the required information. Wait for the snapshot to complete before creating the monitor.
```powershell
# Check snapshot status
$snapshot = Get-UTCMSnapshot -SnapshotId "your-snapshot-id"
$snapshot.status  # Should be "succeeded"

# Wait if still in progress
if ($snapshot.status -eq "inProgress") {
    Write-Host "Waiting for snapshot to complete..."
    Start-Sleep -Seconds 30
}
```

### Issue: "Service principal not found"
**Solution:** Run `Initialize-UTCMServicePrincipal` first
```powershell
Initialize-UTCMServicePrincipal
```

### Issue: "Permission denied" errors
**Solution:** Ensure you've granted the correct permissions:
```powershell
Grant-UTCMPermissions -Permissions @('Policy.Read.All', 'Policy.ReadWrite.ConditionalAccess')
```

### Issue: Snapshot status shows "Failed"
**Solution:** Check that:
1. UTCM service principal has required permissions
2. Resource type names are correct (case-sensitive)
3. Resources exist in your tenant
4. You have appropriate Microsoft 365 licenses

### Issue: No drifts detected after changes
**Solution:**
- Monitors run every 6 hours; wait for next cycle
- Verify monitor is active: `Get-UTCMMonitor -MonitorId <id>`
- Check monitoring results: `Get-UTCMMonitoringResult -MonitorId <id>`
- Ensure changes were made to monitored resources

### Issue: Cannot connect to Graph
**Solution:**
```powershell
# Disconnect and reconnect
Disconnect-MgGraph
Connect-UTCM -Scopes @('ConfigurationMonitoring.ReadWrite.All', 'Directory.ReadWrite.All')
```

### Issue: Snapshot from yesterday is not visible
**Solution:** Check if UTCM service was interrupted or temporarily unavailable:
```powershell
# Try reconnecting
Disconnect-MgGraph
Connect-UTCM

# Test availability
Test-UTCMAvailability

# Try retrieving the specific snapshot by ID
Get-UTCMSnapshot -SnapshotId "your-snapshot-id"
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
- [UTCM Entra ID Resources](https://learn.microsoft.com/en-us/graph/utcm-entra-resources)
- [UTCM Exchange Resources](https://learn.microsoft.com/en-us/graph/utcm-exchange-resources)
- [UTCM Teams Resources](https://learn.microsoft.com/en-us/graph/utcm-teams-resources)
- [UTCM Schema (270+ resource types)](https://www.schemastore.org/utcm-monitor.json)
- [Microsoft Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- [UTCM API Reference - List Snapshot Jobs](https://learn.microsoft.com/en-us/graph/api/configurationmanagement-list-configurationsnapshotjobs?view=graph-rest-beta)
- [UTCM API Reference - Create Snapshot](https://learn.microsoft.com/en-us/graph/api/configurationbaseline-createsnapshot?view=graph-rest-beta)
- [Microsoft 365 DSC to UTCM Migration](https://microsoft365dsc.com/)

## Version History

### Latest Version
- ✅ **Resilient API layer** with automatic retry, exponential backoff, and Retry-After header support
- ✅ **Automatic pagination** for all Graph API list endpoints via `@odata.nextLink`
- ✅ **Structured error parsing** extracts error code, message, and request-id from Graph API responses
- ✅ **Resource type validation** against 107 verified types before snapshot creation
- ✅ **ShouldProcess support** (`-WhatIf`/`-Confirm`) on all destructive and state-changing operations
- ✅ **107 verified resource types** across 5 workloads (tested all 270 schema types)
- ✅ Added interactive menu interface for easier management
- ✅ Enhanced snapshot selection with numbered lists and color-coded status
- ✅ Smart UX for Delete Snapshot and Create Monitor operations
- ✅ Fixed API endpoint issues (using correct configurationSnapshotJobs endpoints)
- ✅ Fixed permission granting (appRoleId filter workaround)
- ✅ Fixed monitor creation to properly retrieve baseline from snapshot resourceLocation
- ✅ Added UTCM availability testing
- ✅ Improved error handling and user feedback
- ✅ Added display name validation (8-32 characters for monitors)
- ✅ Added comprehensive troubleshooting guide
- ✅ Complete resource type compatibility reference with pass/fail results

## License

This script is provided as-is for educational and operational purposes.

## Support & Feedback

For issues, questions, or feature requests:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Microsoft's official UTCM documentation
3. Test with `Test-UTCMAvailability` to ensure UTCM is enabled in your tenant

## Contributing

Feel free to extend this script with additional functionality or improve existing functions. When contributing:
- Follow PowerShell best practices
- Test with UTCM-enabled tenants
- Update documentation for new features
- Handle errors gracefully
