<#
.SYNOPSIS
    Creates a new configuration snapshot
#>
function New-UTCMSnapshot {
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory = $true)]
        [string]$DisplayName,

        [Parameter(Mandatory = $false)]
        [string]$Description,

        [Parameter(Mandatory = $true)]
        [string[]]$Resources
    )

    try {
        # Validate display name - API only allows alphabets, numbers, and spaces
        if ($DisplayName -notmatch '^[a-zA-Z0-9 ]+$') {
            Write-Error "Snapshot display name contains invalid characters. Only alphabets, numbers, and spaces are allowed."
            return $null
        }

        # Validate resource types
        foreach ($rt in $Resources) {
            Test-UTCMResourceType -ResourceType $rt | Out-Null
        }

        Write-Host "Creating configuration snapshot: $DisplayName" -ForegroundColor Cyan

        $body = @{
            displayName = $DisplayName
            resources = @($Resources)
        }
        if ($Description) {
            $body['description'] = $Description
        }

        if (-not $PSCmdlet.ShouldProcess("Snapshot '$DisplayName'", "Create")) { return $null }
        $uri = "beta/admin/configurationManagement/configurationSnapshots/createSnapshot"
        $snapshot = Invoke-UTCMGraphRequest -Uri $uri -Method POST -Body $body

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
