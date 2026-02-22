<#
.SYNOPSIS
    Compares UTCM snapshots across two tenants or within a single tenant.
.DESCRIPTION
    Fetches snapshot contents from two tenants and produces a structured comparison
    showing which resources differ between them. Useful for verifying configuration
    consistency across tenant environments.
.PARAMETER SourceTenantId
    The tenant ID containing the source snapshot.
.PARAMETER SourceSnapshotId
    The snapshot ID in the source tenant.
.PARAMETER TargetTenantId
    The tenant ID containing the target snapshot.
.PARAMETER TargetSnapshotId
    The snapshot ID in the target tenant.
.EXAMPLE
    Compare-UTCMSnapshot -SourceTenantId $tenantA -SourceSnapshotId $snapA -TargetTenantId $tenantB -TargetSnapshotId $snapB
    Compares two snapshots from different tenants.
#>
function Compare-UTCMSnapshot {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
        [string]$SourceTenantId,

        [Parameter(Mandatory = $true)]
        [string]$SourceSnapshotId,

        [Parameter(Mandatory = $true)]
        [ValidatePattern('^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')]
        [string]$TargetTenantId,

        [Parameter(Mandatory = $true)]
        [string]$TargetSnapshotId
    )

    $basePath = $script:UTCMBasePath
    $currentContext = Get-MgContext

    try {
        # Fetch source snapshot contents (switch context if needed)
        Write-Host "Fetching source snapshot from tenant $SourceTenantId..." -ForegroundColor Cyan
        if ($currentContext.TenantId -ne $SourceTenantId) {
            Write-Verbose "Switching Graph context to source tenant $SourceTenantId"
            Connect-MgGraph -Scopes 'ConfigurationMonitoring.ReadWrite.All' -TenantId $SourceTenantId -NoWelcome
        }
        $sourceContents = Invoke-UTCMGraphRequest -Uri "$basePath/snapshots/$SourceSnapshotId/contents" -NoPagination

        # Fetch target snapshot contents (switch context if needed)
        Write-Host "Fetching target snapshot from tenant $TargetTenantId..." -ForegroundColor Cyan
        if ($SourceTenantId -ne $TargetTenantId) {
            Write-Verbose "Switching Graph context to target tenant $TargetTenantId"
            Connect-MgGraph -Scopes 'ConfigurationMonitoring.ReadWrite.All' -TenantId $TargetTenantId -NoWelcome
        }
        $targetContents = Invoke-UTCMGraphRequest -Uri "$basePath/snapshots/$TargetSnapshotId/contents" -NoPagination
    }
    finally {
        # Always restore active tenant context, even if an error occurred
        $activeTenantId = Get-UTCMActiveTenantId
        if ($activeTenantId -and $currentContext.TenantId -ne $activeTenantId) {
            Connect-MgGraph -Scopes 'ConfigurationMonitoring.ReadWrite.All' -TenantId $activeTenantId -NoWelcome
        }
    }

    # Build comparison
    $sourceResources = @{}
    if ($sourceContents.resources) {
        foreach ($r in $sourceContents.resources) {
            $key = "$($r.resourceType)::$($r.resourceName)"
            $sourceResources[$key] = $r
        }
    }

    $targetResources = @{}
    if ($targetContents.resources) {
        foreach ($r in $targetContents.resources) {
            $key = "$($r.resourceType)::$($r.resourceName)"
            $targetResources[$key] = $r
        }
    }

    $allKeys = ($sourceResources.Keys + $targetResources.Keys) | Sort-Object -Unique

    $differences = @()
    foreach ($key in $allKeys) {
        $inSource = $sourceResources.ContainsKey($key)
        $inTarget = $targetResources.ContainsKey($key)

        if ($inSource -and -not $inTarget) {
            $differences += [PSCustomObject]@{
                ResourceKey  = $key
                Status       = "OnlyInSource"
                ResourceType = $sourceResources[$key].resourceType
                ResourceName = $sourceResources[$key].resourceName
            }
        } elseif (-not $inSource -and $inTarget) {
            $differences += [PSCustomObject]@{
                ResourceKey  = $key
                Status       = "OnlyInTarget"
                ResourceType = $targetResources[$key].resourceType
                ResourceName = $targetResources[$key].resourceName
            }
        } else {
            # Both exist — compare properties
            $sourceJson = ($sourceResources[$key].properties | ConvertTo-Json -Depth 20 -Compress)
            $targetJson = ($targetResources[$key].properties | ConvertTo-Json -Depth 20 -Compress)

            if ($sourceJson -ne $targetJson) {
                $differences += [PSCustomObject]@{
                    ResourceKey  = $key
                    Status       = "Different"
                    ResourceType = $sourceResources[$key].resourceType
                    ResourceName = $sourceResources[$key].resourceName
                }
            }
        }
    }

    # Output summary
    $totalResources = $allKeys.Count
    $identicalCount = $totalResources - $differences.Count
    $onlySource = ($differences | Where-Object { $_.Status -eq "OnlyInSource" }).Count
    $onlyTarget = ($differences | Where-Object { $_.Status -eq "OnlyInTarget" }).Count
    $different = ($differences | Where-Object { $_.Status -eq "Different" }).Count

    Write-Host "`nComparison Summary:" -ForegroundColor Cyan
    Write-Host "  Total resources: $totalResources" -ForegroundColor White
    Write-Host "  Identical: $identicalCount" -ForegroundColor Green
    Write-Host "  Different: $different" -ForegroundColor Yellow
    Write-Host "  Only in source: $onlySource" -ForegroundColor Red
    Write-Host "  Only in target: $onlyTarget" -ForegroundColor Red

    return $differences
}
