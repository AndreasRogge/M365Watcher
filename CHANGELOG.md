# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **OAuth user login for the web dashboard** via Authorization Code + PKCE flow using MSAL Browser, allowing users to authenticate with their own Microsoft 365 identity instead of relying solely on app credentials
  - `AUTH_MODE` environment variable (`app` / `user` / `dual`) controls which authentication modes are available. Defaults to `dual`.
  - `AZURE_CLIENT_SECRET` is now optional when `AUTH_MODE` is set to `user`, since the OAuth PKCE flow does not require a client secret
  - JWT validation middleware on the server uses JWKS to verify user-issued tokens from Microsoft Entra ID
  - `AsyncLocalStorage`-based request context propagates user bearer tokens through the Graph client transparently, with no changes required to existing service files
  - New server endpoints: `GET /api/auth/config` (public, returns tenant ID and client ID for MSAL initialization) and `GET /api/auth/status` (returns current auth mode and session info)
  - MSAL Browser integration on the React frontend with popup-based login
  - `AuthProvider` React context manages login, logout, and silent token acquisition
  - Axios interceptor automatically attaches bearer tokens to all API requests when running in user mode
  - New **Login page** with "Sign in with Microsoft" and "Use App Credentials" options presented according to the configured `AUTH_MODE`
  - New **Settings page** showing the active authentication mode, signed-in user info, and a toggle to switch between user and app modes in `dual` configuration
  - **Sidebar** updated with a Settings navigation item and a footer area showing the signed-in user's avatar (user mode) or an app credentials badge (app mode)

### Changed
- Extracted the 107 verified UTCM resource types from three previously duplicated locations into a single shared JSON catalog at `data/resourceTypes.json` (repo root). This file is now the single source of truth for all resource type data across the PowerShell module and the web dashboard.
  - `src/M365Watcher/Private/Constants.ps1` — replaced the hardcoded `$script:VerifiedResourceTypes` flat array with a JSON loader that reads `data/resourceTypes.json` at module import time. Both `$script:ResourceTypeCatalog` (structured, by workload) and `$script:VerifiedResourceTypes` (flat array) are still available; no breaking change to callers.
  - `src/M365Watcher/Public/Get-UTCMResourceTypes.ps1` — replaced 130 lines of hardcoded `Write-Host` statements with a dynamic loop that renders from `$script:ResourceTypeCatalog`. Output is identical.
  - `dashboard/server/src/services/resourceTypeService.ts` — updated import path to reference `data/resourceTypes.json` at the repo root.
  - `dashboard/server/src/data/resourceTypes.json` — removed (superseded by `data/resourceTypes.json` at repo root).
- `dashboard/Dockerfile` — changed build context to the repo root so the multi-stage build can reference paths under both `dashboard/` and `data/`. Added `COPY data/ ./data/` to include the shared resource type catalog in the image.
- `dashboard/docker-compose.yml` — updated `build` from a simple `build: .` to an explicit `context: ..` / `dockerfile: dashboard/Dockerfile` form so Docker Compose uses the repo root as the build context.
- Added `.dockerignore` at the repo root to exclude `.git`, `node_modules`, test files, and other non-essential paths from the Docker build context.

### Fixed
- **Dashboard server crash on startup in Docker** — after PR #2 moved `resourceTypes.json` to the repo root, the Docker image no longer contained the file (the old per-directory copy was removed but the image was never updated to pull from the new location). The server exited immediately with a module-not-found error on the first request to `/api/resource-types`. Resolved by:
  - Copying `data/resourceTypes.json` into the image via `COPY data/ ./data/` in `dashboard/Dockerfile`.
  - Updating `dashboard/server/src/services/resourceTypeService.ts` to probe multiple candidate paths at startup (`/app/data/resourceTypes.json` for Docker, then relative paths walking up the directory tree for local development), so the service resolves the catalog file correctly in both environments without requiring environment-specific configuration.

## [2.0.0] - 2026-02-19

### Changed
- Refactored monolithic `UTCM-Management.ps1` (1,573 lines) into a proper PowerShell module at `src/M365Watcher/` with `Public/` and `Private/` folder structure, module manifest (`.psd1`), and root module (`.psm1`)
- `UTCM-Management.ps1` replaced with a thin deprecated wrapper that imports the module for backwards compatibility
- Unit tests updated to use `Import-Module`/`InModuleScope`/module-scoped mocks (41 tests passing)
- Integration tests updated to use `Import-Module`
- CI/CD pipeline updated for module paths (PSScriptAnalyzer `-Recurse` on `src/M365Watcher/`, CodeCoverage paths updated)
- README updated with module import syntax

### Added
- Module manifest (`M365Watcher.psd1`) for PSGallery publishing readiness
- `Start-Interactive.ps1` launcher script at repo root
- Proper function encapsulation: 18 public functions exported, 2 private functions and module constants hidden from callers

## [1.5.0] - 2026-02-19

### Added
- **Snapshot Contents Viewer** - Browse the full captured configuration of any succeeded snapshot directly in the dashboard
  - New "Snapshot Contents" tab on snapshot detail page (lazy-loaded, only fetches when activated)
  - Resources grouped by workload (Entra ID, Exchange, Intune, Security & Compliance, Teams) with color-coded borders
  - Expandable resource cards showing all captured properties in a table
  - Full-text search across resource types, names, IDs, and property values
  - Copy JSON button on each resource for quick export
  - 5-minute client-side cache to avoid redundant API calls
- **Backend endpoint** `GET /api/snapshots/:id/contents` - Fetches the full configuration data from a snapshot's `resourceLocation`

### Fixed
- **Delete snapshot/monitor bug** - The delete confirmation dialog now properly handles async operations. Previously clicking "Delete" had no visible effect because the async callback wasn't being awaited correctly. The dialog now shows a loading spinner during deletion and displays inline error messages if the operation fails.
- **ConfirmDialog component** - Refactored to manage its own loading and error state internally, properly awaiting async `onConfirm` callbacks with try/catch error handling. Cancel and close buttons are disabled during operations to prevent state corruption.

## [1.4.0] - 2026-02-18

### Added
- **Web Dashboard** - Full React + Node.js web UI for UTCM monitoring (`/dashboard`)
  - **Overview page** with summary cards (snapshots, monitors, active drifts, last run), recent drifts table, and monitor status
  - **Snapshot management** - Create snapshots with resource type picker (107 types grouped by workload with search and select-all), view details, delete
  - **Monitor management** - Create monitors from succeeded snapshots, update baseline (with drift deletion warning), view details with baseline resources, delete
  - **Drift viewer** - List with filtering by monitor and status, detail view with side-by-side JSON diff showing property-level changes (expected vs detected values)
  - **Monitoring results** - Timeline of monitoring runs with status, drift detection, and completion time
  - **Resource types reference** - Searchable, color-coded listing of all 107 types grouped by workload
- **Backend API** (Express.js + TypeScript)
  - REST endpoints for all UTCM operations (`/api/snapshots`, `/api/monitors`, `/api/drifts`, `/api/monitoring-results`, `/api/resource-types`, `/api/summary`)
  - Microsoft Graph client credentials auth via MSAL Node
  - Retry logic with exponential backoff for 429/503/504 (faithful port of `Invoke-UTCMGraphRequest`)
  - Automatic `@odata.nextLink` pagination
  - Structured error handling with Graph API error extraction
- **Docker deployment** - Multi-stage Dockerfile and docker-compose.yml for containerized hosting
- **Proxmox LXC guide** - Step-by-step deployment guide for self-hosting on Proxmox (`PROXMOX-SETUP.md`)
- **`.gitignore`** - Standard ignores for Node.js, IDE files, secrets, and build artifacts

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
