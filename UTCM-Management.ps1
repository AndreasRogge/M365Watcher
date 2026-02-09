<#
.SYNOPSIS
    Microsoft Graph Unified Tenant Configuration Management (UTCM) PowerShell Script
    
.DESCRIPTION
    This script provides comprehensive functions to work with Microsoft Graph UTCM APIs (beta) including:
    - Setting up the UTCM service principal
    - Creating and managing configuration snapshots
    - Creating and managing configuration monitors
    - Viewing configuration drifts
    - Managing monitoring results
    
.NOTES
    Author: PowerShell Script Generator
    Version: 1.0
    Requirements:
        - Microsoft.Graph.Authentication module
        - Appropriate Microsoft Graph permissions
        - ConfigurationMonitoring.ReadWrite.All permission for delegated access
    
.LINK
    https://learn.microsoft.com/en-us/graph/api/resources/unified-tenant-configuration-management-api-overview
#>

#Requires -Modules Microsoft.Graph.Authentication

# UTCM Service Principal App ID (Microsoft-provided)
$script:UTCMAppId = "03b07b79-c5bc-4b5e-9bfa-13acf4a99998"
$script:GraphAppId = "00000003-0000-0000-c000-000000000000"

#region Connection Functions

<#
.SYNOPSIS
    Connects to Microsoft Graph with required UTCM permissions
#>
function Connect-UTCM {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$TenantId,
        
        [Parameter(Mandatory = $false)]
        [string[]]$Scopes = @('ConfigurationMonitoring.ReadWrite.All')
    )
    
    try {
        Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Cyan
        
        if ($TenantId) {
            Connect-MgGraph -Scopes $Scopes -TenantId $TenantId -NoWelcome
        } else {
            Connect-MgGraph -Scopes $Scopes -NoWelcome
        }
        
        $context = Get-MgContext
        Write-Host "Successfully connected to tenant: $($context.TenantId)" -ForegroundColor Green
        Write-Host "Account: $($context.Account)" -ForegroundColor Green
        
        return $true
    }
    catch {
        Write-Error "Failed to connect to Microsoft Graph: $_"
        return $false
    }
}

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
        $result = Invoke-MgGraphRequest -Uri $uri -Method GET -ErrorAction Stop
        
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

#endregion

#region Service Principal Setup Functions

<#
.SYNOPSIS
    Creates the UTCM service principal in the tenant
#>
function Initialize-UTCMServicePrincipal {
    [CmdletBinding()]
    param()
    
    try {
        Write-Host "Checking if UTCM service principal exists..." -ForegroundColor Cyan
        
        # Check if service principal already exists
        $uri = "v1.0/servicePrincipals?`$filter=appId eq '$script:UTCMAppId'"
        $existingSP = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
        
        if ($existingSP.value.Count -gt 0) {
            Write-Host "UTCM service principal already exists." -ForegroundColor Yellow
            Write-Host "Object ID: $($existingSP.value[0].id)" -ForegroundColor Green
            return $existingSP.value[0]
        }
        
        Write-Host "Creating UTCM service principal..." -ForegroundColor Cyan
        
        $body = @{
            appId = $script:UTCMAppId
        }
        
        $newSP = Invoke-MgGraphRequest -Uri "v1.0/servicePrincipals" -Method POST -Body $body -OutputType PSObject
        
        Write-Host "UTCM service principal created successfully!" -ForegroundColor Green
        Write-Host "Display Name: $($newSP.displayName)" -ForegroundColor Green
        Write-Host "Object ID: $($newSP.id)" -ForegroundColor Green
        Write-Host "App ID: $($newSP.appId)" -ForegroundColor Green
        
        return $newSP
    }
    catch {
        Write-Error "Failed to create UTCM service principal: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Grants permissions to the UTCM service principal
#>
function Grant-UTCMPermissions {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Permissions
    )
    
    try {
        Write-Host "Granting permissions to UTCM service principal..." -ForegroundColor Cyan
        
        # Get Graph service principal
        $graphUri = "v1.0/servicePrincipals?`$filter=appId eq '$script:GraphAppId'"
        $graph = Invoke-MgGraphRequest -Uri $graphUri -Method GET -OutputType PSObject | Select-Object -ExpandProperty value
        
        if (-not $graph) {
            throw "Microsoft Graph service principal not found"
        }
        
        # Get UTCM service principal
        $utcmUri = "v1.0/servicePrincipals?`$filter=appId eq '$script:UTCMAppId'"
        $utcm = Invoke-MgGraphRequest -Uri $utcmUri -Method GET -OutputType PSObject | Select-Object -ExpandProperty value
        
        if (-not $utcm) {
            throw "UTCM service principal not found. Run Initialize-UTCMServicePrincipal first."
        }
        
        foreach ($permission in $Permissions) {
            Write-Host "  Granting permission: $permission" -ForegroundColor Cyan
            
            # Find the app role
            $appRole = $graph.appRoles | Where-Object { $_.value -eq $permission }
            
            if (-not $appRole) {
                Write-Warning "Permission '$permission' not found in Graph API"
                continue
            }
            
            # Check if permission already granted
            $existingUri = "v1.0/servicePrincipals/$($utcm.id)/appRoleAssignments"
            $existing = Invoke-MgGraphRequest -Uri $existingUri -Method GET -OutputType PSObject

            # Filter in PowerShell since appRoleId doesn't support OData filters
            $alreadyGranted = $existing.value | Where-Object { $_.appRoleId -eq $appRole.id }

            if ($alreadyGranted) {
                Write-Host "    Permission already granted" -ForegroundColor Yellow
                continue
            }
            
            # Grant the permission
            $body = @{
                appRoleId = $appRole.id
                resourceId = $graph.id
                principalId = $utcm.id
            }
            
            $assignUri = "v1.0/servicePrincipals/$($utcm.id)/appRoleAssignments"
            Invoke-MgGraphRequest -Uri $assignUri -Method POST -Body $body | Out-Null
            
            Write-Host "    Permission granted successfully" -ForegroundColor Green
        }
        
        Write-Host "`nAll permissions granted successfully!" -ForegroundColor Green
    }
    catch {
        Write-Error "Failed to grant permissions: $_"
    }
}

#endregion

#region Snapshot Functions

<#
.SYNOPSIS
    Creates a new configuration snapshot
#>
function New-UTCMSnapshot {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DisplayName,
        
        [Parameter(Mandatory = $false)]
        [string]$Description,
        
        [Parameter(Mandatory = $true)]
        [string[]]$Resources
    )
    
    try {
        Write-Host "Creating configuration snapshot: $DisplayName" -ForegroundColor Cyan
        
        $body = @{
            displayName = $DisplayName
            description = $Description
            resources = $Resources
        }
        
        $uri = "beta/admin/configurationManagement/configurationSnapshots/createSnapshot"
        $snapshot = Invoke-MgGraphRequest -Uri $uri -Method POST -Body $body -OutputType PSObject
        
        Write-Host "Snapshot created successfully!" -ForegroundColor Green
        Write-Host "Job ID: $($snapshot.id)" -ForegroundColor Green
        Write-Host "Status: $($snapshot.status)" -ForegroundColor Green
        
        return $snapshot
    }
    catch {
        Write-Error "Failed to create snapshot: $_"
        return $null
    }
}

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
        
        $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
        
        if ($SnapshotId) {
            return $result
        } else {
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve snapshots: $_"
        return $null
    }
}

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
            Invoke-MgGraphRequest -Uri $uri -Method DELETE
            
            Write-Host "Snapshot deleted successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Error "Failed to delete snapshot: $_"
    }
}

#endregion

#region Monitor Functions

<#
.SYNOPSIS
    Creates a new configuration monitor
#>
function New-UTCMMonitor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DisplayName,
        
        [Parameter(Mandatory = $false)]
        [string]$Description,
        
        [Parameter(Mandatory = $true)]
        [string]$BaselineSnapshotId
    )
    
    try {
        Write-Host "Creating configuration monitor: $DisplayName" -ForegroundColor Cyan
        
        $body = @{
            displayName = $DisplayName
            description = $Description
            baselineSnapshot = @{
                id = $BaselineSnapshotId
            }
        }
        
        $uri = "beta/admin/configurationManagement/configurationMonitors"
        $monitor = Invoke-MgGraphRequest -Uri $uri -Method POST -Body $body -OutputType PSObject
        
        Write-Host "Monitor created successfully!" -ForegroundColor Green
        Write-Host "Monitor ID: $($monitor.id)" -ForegroundColor Green
        Write-Host "Display Name: $($monitor.displayName)" -ForegroundColor Green
        
        return $monitor
    }
    catch {
        Write-Error "Failed to create monitor: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Gets all configuration monitors or a specific monitor
#>
function Get-UTCMMonitor {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$MonitorId,
        
        [Parameter(Mandatory = $false)]
        [string]$DisplayName
    )
    
    try {
        if ($MonitorId) {
            $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
            Write-Host "Retrieving monitor: $MonitorId" -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result
        }
        elseif ($DisplayName) {
            $uri = "beta/admin/configurationManagement/configurationMonitors/?`$filter=displayName eq '$DisplayName'"
            Write-Host "Retrieving monitor by name: $DisplayName" -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result.value
        }
        else {
            $uri = "beta/admin/configurationManagement/configurationMonitors"
            Write-Host "Retrieving all monitors..." -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve monitors: $_"
        return $null
    }
}

<#
.SYNOPSIS
    Removes a configuration monitor
#>
function Remove-UTCMMonitor {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorId
    )
    
    try {
        if ($PSCmdlet.ShouldProcess($MonitorId, "Delete monitor")) {
            Write-Host "Deleting monitor: $MonitorId" -ForegroundColor Cyan
            
            $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
            Invoke-MgGraphRequest -Uri $uri -Method DELETE
            
            Write-Host "Monitor deleted successfully!" -ForegroundColor Green
        }
    }
    catch {
        Write-Error "Failed to delete monitor: $_"
    }
}

<#
.SYNOPSIS
    Updates a configuration monitor's baseline
#>
function Update-UTCMMonitorBaseline {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$MonitorId,
        
        [Parameter(Mandatory = $true)]
        [string]$NewBaselineSnapshotId
    )
    
    try {
        Write-Host "Updating monitor baseline..." -ForegroundColor Cyan
        Write-Warning "Note: Updating baseline will delete all previous monitoring results and drifts for this monitor."
        
        $body = @{
            baselineSnapshot = @{
                id = $NewBaselineSnapshotId
            }
        }
        
        $uri = "beta/admin/configurationManagement/configurationMonitors/$MonitorId"
        $result = Invoke-MgGraphRequest -Uri $uri -Method PATCH -Body $body -OutputType PSObject
        
        Write-Host "Monitor baseline updated successfully!" -ForegroundColor Green
        return $result
    }
    catch {
        Write-Error "Failed to update monitor baseline: $_"
        return $null
    }
}

#endregion

#region Drift Functions

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
        
        $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
        
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
        $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
        
        return $result
    }
    catch {
        Write-Error "Failed to retrieve drift details: $_"
        return $null
    }
}

#endregion

#region Monitoring Results Functions

<#
.SYNOPSIS
    Gets monitoring results for a specific monitor
#>
function Get-UTCMMonitoringResult {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$MonitorId,
        
        [Parameter(Mandatory = $false)]
        [string]$ResultId
    )
    
    try {
        if ($ResultId) {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults/$ResultId"
            Write-Host "Retrieving monitoring result: $ResultId" -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result
        }
        elseif ($MonitorId) {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults?`$filter=monitorId eq '$MonitorId'"
            Write-Host "Retrieving monitoring results for monitor: $MonitorId" -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result.value
        }
        else {
            $uri = "beta/admin/configurationManagement/configurationMonitoringResults"
            Write-Host "Retrieving all monitoring results..." -ForegroundColor Cyan
            $result = Invoke-MgGraphRequest -Uri $uri -Method GET -OutputType PSObject
            return $result.value
        }
    }
    catch {
        Write-Error "Failed to retrieve monitoring results: $_"
        return $null
    }
}

#endregion

#region Helper Functions

<#
.SYNOPSIS
    Displays a summary of UTCM configuration
#>
function Get-UTCMSummary {
    [CmdletBinding()]
    param()
    
    try {
        Write-Host "`n=== UTCM Configuration Summary ===" -ForegroundColor Cyan
        
        # Get snapshots
        $snapshots = Get-UTCMSnapshot
        Write-Host "`nSnapshots: $($snapshots.Count)" -ForegroundColor Yellow
        
        # Get monitors
        $monitors = Get-UTCMMonitor
        Write-Host "Monitors: $($monitors.Count)" -ForegroundColor Yellow
        
        # Get active drifts
        $activeDrifts = Get-UTCMDrift -Status Active
        Write-Host "Active Drifts: $($activeDrifts.Count)" -ForegroundColor $(if ($activeDrifts.Count -gt 0) { 'Red' } else { 'Green' })
        
        Write-Host "`n==================================" -ForegroundColor Cyan
        
        return @{
            Snapshots = $snapshots
            Monitors = $monitors
            ActiveDrifts = $activeDrifts
        }
    }
    catch {
        Write-Error "Failed to retrieve UTCM summary: $_"
    }
}

<#
.SYNOPSIS
    Gets available resource types for UTCM
#>
function Get-UTCMResourceTypes {
    [CmdletBinding()]
    param()
    
    Write-Host "Common UTCM Resource Types:" -ForegroundColor Cyan
    Write-Host "`nEntra ID:" -ForegroundColor Yellow
    Write-Host "  - microsoft.entra.conditionalaccesspolicy"
    Write-Host "  - microsoft.entra.authenticationmethodpolicy"
    Write-Host "  - microsoft.entra.authorizationpolicy"
    
    Write-Host "`nExchange Online:" -ForegroundColor Yellow
    Write-Host "  - microsoft.exchange.casMailboxPlan"
    Write-Host "  - microsoft.exchange.transportRule"
    Write-Host "  - microsoft.exchange.mailboxPlan"
    
    Write-Host "`nIntune:" -ForegroundColor Yellow
    Write-Host "  - microsoft.intune.deviceCompliancePolicy"
    Write-Host "  - microsoft.intune.deviceConfiguration"
    
    Write-Host "`nTeams:" -ForegroundColor Yellow
    Write-Host "  - microsoft.teams.meetingPolicy"
    Write-Host "  - microsoft.teams.messagingPolicy"
    
    Write-Host "`nDefender:" -ForegroundColor Yellow
    Write-Host "  - microsoft.security.alertPolicy"
    
    Write-Host "`nPurview:" -ForegroundColor Yellow
    Write-Host "  - microsoft.purview.retentionPolicy"
    Write-Host "  - microsoft.purview.sensitivityLabel"
    
    Write-Host "`nNote: This is not an exhaustive list. Refer to Microsoft documentation for complete resource types." -ForegroundColor Gray
}

#endregion

#region Example Workflows

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
        -DisplayName "Conditional Access Baseline $(Get-Date -Format 'yyyy-MM-dd')" `
        -Description "Baseline for CA policies" `
        -Resources @('microsoft.entra.conditionalaccesspolicy')
    
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

#endregion

# Export module members (if used as module)
# Export-ModuleMember -Function *-UTCM*

# Display help message when script is loaded
Write-Host @"

---------------------------------------------------------------------------------
|          Microsoft Graph UTCM PowerShell Script                               |
|          Unified Tenant Configuration Management                              |
---------------------------------------------------------------------------------

Available Functions:

Connection:
  Connect-UTCM                    - Connect to Microsoft Graph with UTCM permissions
  Test-UTCMAvailability          - Test if UTCM is available in tenant

Setup:
  Initialize-UTCMServicePrincipal - Create UTCM service principal
  Grant-UTCMPermissions          - Grant permissions to UTCM service principal

Snapshots:
  New-UTCMSnapshot               - Create a configuration snapshot
  Get-UTCMSnapshot               - Get snapshots
  Remove-UTCMSnapshot            - Delete a snapshot

Monitors:
  New-UTCMMonitor                - Create a configuration monitor
  Get-UTCMMonitor                - Get monitors
  Remove-UTCMMonitor             - Delete a monitor
  Update-UTCMMonitorBaseline     - Update monitor baseline

Drift Management:
  Get-UTCMDrift                  - Get configuration drifts
  Get-UTCMDriftDetail            - Get detailed drift information

Results:
  Get-UTCMMonitoringResult       - Get monitoring results

Utilities:
  Get-UTCMSummary                - Display UTCM configuration summary
  Get-UTCMResourceTypes          - Show available resource types
  Start-UTCMExample              - Run example workflow

Quick Start:
  1. Connect-UTCM
  2. Initialize-UTCMServicePrincipal
  3. Grant-UTCMPermissions -Permissions @('Policy.Read.All')
  4. Get-UTCMResourceTypes
  5. New-UTCMSnapshot -DisplayName "My Baseline" -Resources @('microsoft.entra.conditionalaccesspolicy')

For detailed help on any function, use: Get-Help <Function-Name> -Detailed

"@ -ForegroundColor Green
