# UTCM Service Principal App ID (Microsoft-provided)
$script:UTCMAppId = "03b07b79-c5bc-4b5e-9bfa-13acf4a99998"
$script:GraphAppId = "00000003-0000-0000-c000-000000000000"

# Load resource type catalog from shared JSON data file (single source of truth)
$script:ResourceTypeCatalogPath = Join-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) 'data' 'resourceTypes.json'
$script:ResourceTypeCatalog = Get-Content $script:ResourceTypeCatalogPath -Raw | ConvertFrom-Json
$script:VerifiedResourceTypes = @()
foreach ($workload in $script:ResourceTypeCatalog.PSObject.Properties) {
    $script:VerifiedResourceTypes += $workload.Value.types
}
