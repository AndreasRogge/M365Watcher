# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.0] - 2026-02-12

### Added
- **Pester unit tests** - 30+ tests covering resource validation, retry logic, pagination, error parsing, ShouldProcess, and parameter validation
- **Pester integration tests** - Full lifecycle tests (snapshot create/list/delete, monitor create/list/delete, drift queries) against a real tenant
- **GitHub Actions CI/CD pipeline** with 3 jobs:
  - PSScriptAnalyzer linting (runs on every push and PR)
  - Pester unit tests with code coverage (runs on every push and PR)
  - Integration tests against test tenant (runs on push to main, requires `test-tenant` environment with secrets)

## [1.2.0] - 2026-02-11

### Added
- **Resilient API layer** (`Invoke-UTCMGraphRequest`) - Central wrapper replacing all direct Graph API calls with automatic retry, exponential backoff, and Retry-After header support for HTTP 429/503/504
- **Automatic pagination** - All GET list endpoints automatically follow `@odata.nextLink` to retrieve complete result sets
- **Structured error parsing** - Graph API errors now extract `error.code`, `error.message`, and `request-id` for clearer diagnostics
- **Resource type validation** (`Test-UTCMResourceType`) - Validates resource types against 107 verified types before snapshot creation, warns about unverified types
- **ShouldProcess support** (`-WhatIf`/`-Confirm`) on `Initialize-UTCMServicePrincipal`, `Grant-UTCMPermissions`, `New-UTCMSnapshot`, `New-UTCMMonitor`, and `Update-UTCMMonitorBaseline`

## [1.1.0] - 2026-02-10

### Added
- **107 verified resource types** across 5 workloads after testing all 270 types from the UTCM schema
- **Interactive menu interface** (`Start-UTCMInteractive`) with color-coded status and organized categories
- **Smart snapshot selection** - Options 7 (Delete Snapshot) and 8 (Create Monitor) display numbered, color-coded snapshot lists
- **Resource types reference** in README with complete pass/fail results for all 270 schema types
- Links to UTCM schema and Microsoft documentation for Entra/Exchange/Teams resources

### Removed
- Unsupported Intune resource types (`deviceCompliancePolicy`, `deviceConfiguration`)
- 4 additional unsupported resource types after API validation testing

## [1.0.0] - 2026-02-09

### Added
- Core UTCM management functions: `Connect-UTCM`, `Test-UTCMAvailability`, `Initialize-UTCMServicePrincipal`, `Grant-UTCMPermissions`
- Snapshot management: `New-UTCMSnapshot`, `Get-UTCMSnapshot`, `Remove-UTCMSnapshot`
- Monitor management: `New-UTCMMonitor`, `Get-UTCMMonitor`, `Remove-UTCMMonitor`, `Update-UTCMMonitorBaseline`
- Drift detection: `Get-UTCMDrift`, `Get-UTCMDriftDetail`, `Get-UTCMMonitoringResult`
- Utilities: `Get-UTCMResourceTypes`, `Get-UTCMSummary`
- Display name validation (8-32 characters for monitors)
- Comprehensive troubleshooting guide

### Fixed
- API endpoint issues (corrected to `configurationSnapshotJobs`)
- Permission granting (`appRoleId` OData filter workaround using client-side filtering)
- Monitor creation to properly retrieve baseline from snapshot `resourceLocation`
- Unicode box-drawing characters replaced with ASCII for cross-platform compatibility

## [0.1.0] - 2026-02-08

### Added
- Initial upload with basic UTCM management script
- README documentation
