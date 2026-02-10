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

# Script parameters for interactive mode
param(
    [Parameter(Mandatory = $false)]
    [switch]$Interactive
)

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
        # Validate displayName length
        if ($DisplayName.Length -lt 8 -or $DisplayName.Length -gt 32) {
            Write-Error "Monitor display name must be between 8 and 32 characters. Current length: $($DisplayName.Length)"
            return $null
        }

        Write-Host "Retrieving snapshot baseline information..." -ForegroundColor Cyan

        # Get the snapshot job details
        $snapshot = Get-UTCMSnapshot -SnapshotId $BaselineSnapshotId

        if (-not $snapshot) {
            Write-Error "Snapshot not found with ID: $BaselineSnapshotId"
            return $null
        }

        # Check if snapshot job has completed
        if ($snapshot.status -ne "succeeded") {
            Write-Error "Snapshot job has not completed successfully. Current status: $($snapshot.status)"
            Write-Host "Please wait for the snapshot to complete before creating a monitor." -ForegroundColor Yellow
            return $null
        }

        # Check for resourceLocation property where the actual baseline is stored
        if (-not $snapshot.resourceLocation) {
            Write-Error "Snapshot does not contain resourceLocation property. Cannot retrieve baseline configuration."
            return $null
        }

        Write-Host "Retrieving baseline configuration from snapshot..." -ForegroundColor Cyan

        # Fetch the actual baseline configuration from the resource location
        try {
            $baselineConfig = Invoke-MgGraphRequest -Uri $snapshot.resourceLocation -Method GET -OutputType PSObject
        }
        catch {
            Write-Error "Failed to retrieve baseline configuration from resourceLocation: $_"
            return $null
        }

        if (-not $baselineConfig -or -not $baselineConfig.resources) {
            Write-Error "Baseline configuration does not contain required resources"
            return $null
        }

        Write-Host "Creating configuration monitor: $DisplayName" -ForegroundColor Cyan

        # Construct baseline object with the retrieved configuration
        $body = @{
            displayName = $DisplayName
            description = $Description
            baseline = @{
                displayName = if ($baselineConfig.displayName) { $baselineConfig.displayName } else { $snapshot.displayName }
                description = if ($baselineConfig.description) { $baselineConfig.description } else { $snapshot.description }
                resources = $baselineConfig.resources
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
    
    Write-Host "`nTeams:" -ForegroundColor Yellow
    Write-Host "  - microsoft.teams.meetingPolicy"
    Write-Host "  - microsoft.teams.messagingPolicy"
        
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

        Write-Host "`nConnected to: $($context.TenantId)" -ForegroundColor Green
        Write-Host "Account: $($context.Account)`n" -ForegroundColor Green

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
                    Write-Host "  - microsoft.entra.conditionalaccesspolicy" -ForegroundColor Gray
                    Write-Host "  - microsoft.entra.authenticationmethodpolicy" -ForegroundColor Gray
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
                    $results | Format-Table -AutoSize id, status, completedDateTime
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

#endregion

# Export module members (if used as module)
# Export-ModuleMember -Function *-UTCM*

# Display help message when script is loaded (unless in interactive mode)
if (-not $Interactive) {
    Write-Host @"

---------------------------------------------------------------------------------
|          Microsoft Graph UTCM PowerShell Script                               |
|          Unified Tenant Configuration Management                              |
---------------------------------------------------------------------------------

Interactive Mode:
  .\UTCM-Management.ps1 -Interactive    - Launch interactive menu interface
  Start-UTCMInteractive                  - Start interactive mode from PowerShell

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
}

# Launch interactive mode if parameter is specified
if ($Interactive) {
    Start-UTCMInteractive
}
