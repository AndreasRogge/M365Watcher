# CLAUDE.md - Project Instructions for Claude Code

## Project Overview

M365Watcher is a Microsoft 365 Unified Tenant Configuration Management (UTCM) toolkit consisting of:
- **PowerShell module** (`src/M365Watcher/`) - 18 exported functions for UTCM management
- **Web dashboard** (`dashboard/`) - React + Node.js UI for visual monitoring
- **CI/CD** (`.github/workflows/ci.yml`) - PSScriptAnalyzer, Pester tests, integration tests

## Key Paths

- `src/M365Watcher/` - PowerShell module (Public/, Private/, .psd1, .psm1)
- `dashboard/client/` - React frontend (Vite + TypeScript)
- `dashboard/server/` - Express.js backend (TypeScript)
- `tests/` - Pester unit and integration tests
- `CHANGELOG.md` - Keep a Changelog format
- `README.md` - Project documentation

## Module Structure

```
src/M365Watcher/
├── M365Watcher.psd1          (module manifest)
├── M365Watcher.psm1          (root module - dot-sources all .ps1 files)
├── Private/                  (not exported)
│   ├── Constants.ps1
│   ├── Invoke-UTCMGraphRequest.ps1
│   └── Test-UTCMResourceType.ps1
└── Public/                   (18 exported functions)
    ├── Connect-UTCM.ps1
    ├── Get-UTCMDrift.ps1
    ├── Get-UTCMDriftDetail.ps1
    └── ... (one function per file)
```

## Testing

```powershell
# Unit tests (no tenant required)
Invoke-Pester ./tests/UTCM-Management.Tests.ps1 -Output Detailed

# Module load verification
Import-Module ./src/M365Watcher -Force
Get-Command -Module M365Watcher
```

Tests use `InModuleScope M365Watcher` for private functions and `Mock -ModuleName M365Watcher` for module-scoped mocks.

## Mandatory Workflow Rules

### Documentation Updates (REQUIRED)

After completing any task that adds features, changes behavior, or modifies the codebase structure:

1. **Always invoke the `docs-writer` agent** to update:
   - `CHANGELOG.md` - Add entry under the appropriate version following Keep a Changelog format
   - `README.md` - Update any affected sections (commands, examples, features list)
2. This is NOT optional. Documentation must be updated in the same commit or as an immediate follow-up commit.

### Notion Roadmap Sync

After completing any task from the Notion roadmap:
- Invoke the `m365-coordinator` agent to update the task status to "Done" in Notion.

### Testing

After modifying PowerShell code:
- Run unit tests: `Invoke-Pester ./tests/UTCM-Management.Tests.ps1`
- Verify module loads: `Import-Module ./src/M365Watcher -Force; (Get-Command -Module M365Watcher).Count` should return 18
