# UTCM Service Principal App ID (Microsoft-provided)
$script:UTCMAppId = "03b07b79-c5bc-4b5e-9bfa-13acf4a99998"
$script:GraphAppId = "00000003-0000-0000-c000-000000000000"

# Load resource type catalog from shared JSON data file (single source of truth)
$script:ResourceTypeCatalogPath = Join-Path (Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent) 'data' 'resourceTypes.json'

if (-not (Test-Path -LiteralPath $script:ResourceTypeCatalogPath -PathType Leaf)) {
    throw "Resource type catalog not found at expected path: $script:ResourceTypeCatalogPath"
}

try {
    $script:ResourceTypeCatalog = Get-Content -LiteralPath $script:ResourceTypeCatalogPath -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
} catch {
    throw "Failed to load resource type catalog from '$script:ResourceTypeCatalogPath'. Verify the file is valid JSON. Error: $_"
}

$script:VerifiedResourceTypes = @()
foreach ($workload in $script:ResourceTypeCatalog.PSObject.Properties) {
    $script:VerifiedResourceTypes += $workload.Value.types
}
