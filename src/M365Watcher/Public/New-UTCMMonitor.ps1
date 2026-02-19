<#
.SYNOPSIS
    Creates a new configuration monitor
#>
function New-UTCMMonitor {
    [CmdletBinding(SupportsShouldProcess)]
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

        # Validate display name characters - API only allows alphabets, numbers, and spaces
        if ($DisplayName -notmatch '^[a-zA-Z0-9 ]+$') {
            Write-Error "Monitor display name contains invalid characters. Only alphabets, numbers, and spaces are allowed."
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
            $baselineConfig = Invoke-UTCMGraphRequest -Uri $snapshot.resourceLocation -Method GET -NoPagination
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

        if (-not $PSCmdlet.ShouldProcess("Monitor '$DisplayName'", "Create")) { return $null }
        $uri = "beta/admin/configurationManagement/configurationMonitors"
        $monitor = Invoke-UTCMGraphRequest -Uri $uri -Method POST -Body $body

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
