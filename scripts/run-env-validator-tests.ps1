# Script para executar os 3 testes de validação do EnvValidator
# Execute: .\scripts\run-env-validator-tests.ps1

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $projectRoot ".env"
$envBackup = Join-Path $projectRoot ".env.bak"
$results = @()

function Restore-Env {
    if (Test-Path $envBackup) {
        Move-Item -Path $envBackup -Destination $envFile -Force
        Write-Host "  [OK] .env restaurado" -ForegroundColor Green
    }
}

function Backup-Env {
    if (Test-Path $envFile) {
        Copy-Item -Path $envFile -Destination $envBackup -Force
        Remove-Item -Path $envFile -Force
        Write-Host "  [OK] .env removido (backup em .env.bak)" -ForegroundColor Green
    }
}

function Comment-ViteSupabaseUrl {
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        $content = $content -replace '(?m)^(VITE_SUPABASE_URL=.*)$', '# $1'
        Set-Content -Path $envFile -Value $content -NoNewline
        Write-Host "  [OK] VITE_SUPABASE_URL comentado" -ForegroundColor Green
    }
}

function Uncomment-ViteSupabaseUrl {
    if (Test-Path $envFile) {
        $content = Get-Content $envFile -Raw
        $content = $content -replace '(?m)^#\s*(VITE_SUPABASE_URL=.*)$', '$1'
        Set-Content -Path $envFile -Value $content -NoNewline
        Write-Host "  [OK] VITE_SUPABASE_URL descomentado" -ForegroundColor Green
    }
}

Set-Location $projectRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  TESTES DE VALIDACAO - EnvValidator" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# === TESTE 1: Sem .env ===
Write-Host "TESTE 1: Sem arquivo .env" -ForegroundColor Yellow
try {
    if (Test-Path $envBackup) { Move-Item $envBackup $envFile -Force }
    Backup-Env
    $out = npx playwright test e2e/env-validator.spec.ts -g "Teste 1" 2>&1
    $passed1 = $LASTEXITCODE -eq 0
    $results += [PSCustomObject]@{ Test = "1"; Passed = $passed1 }
    if ($passed1) {
        Write-Host "  [PASSOU] Teste 1" -ForegroundColor Green
    } else {
        Write-Host "  [FALHOU] Teste 1" -ForegroundColor Red
        Write-Host $out
    }
} finally {
    Restore-Env
}

# === TESTE 2: .env incompleto ===
Write-Host "`nTESTE 2: .env incompleto (VITE_SUPABASE_URL comentado)" -ForegroundColor Yellow
try {
    if (-not (Test-Path $envFile)) { Restore-Env }
    Comment-ViteSupabaseUrl
    $out = npx playwright test e2e/env-validator.spec.ts -g "Teste 2" 2>&1
    $passed2 = $LASTEXITCODE -eq 0
    $results += [PSCustomObject]@{ Test = "2"; Passed = $passed2 }
    if ($passed2) {
        Write-Host "  [PASSOU] Teste 2" -ForegroundColor Green
    } else {
        Write-Host "  [FALHOU] Teste 2" -ForegroundColor Red
        Write-Host $out
    }
} finally {
    Uncomment-ViteSupabaseUrl
}

# === TESTE 3: .env valido ===
Write-Host "`nTESTE 3: .env valido" -ForegroundColor Yellow
try {
    $out = npx playwright test e2e/env-validator.spec.ts -g "Teste 3" 2>&1
    $passed3 = $LASTEXITCODE -eq 0
    $results += [PSCustomObject]@{ Test = "3"; Passed = $passed3 }
    if ($passed3) {
        Write-Host "  [PASSOU] Teste 3" -ForegroundColor Green
    } else {
        Write-Host "  [FALHOU] Teste 3" -ForegroundColor Red
        Write-Host $out
    }
} finally {
    # Garantir que .env está restaurado
    if (Test-Path $envBackup) { Restore-Env }
}

# === RESUMO ===
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESUMO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
$allPassed = ($passed1 -and $passed2 -and $passed3)
Write-Host "  Teste 1 (sem .env):        $(if($passed1){'PASSOU'}else{'FALHOU'})"
Write-Host "  Teste 2 (.env incompleto): $(if($passed2){'PASSOU'}else{'FALHOU'})"
Write-Host "  Teste 3 (.env valido):     $(if($passed3){'PASSOU'}else{'FALHOU'})"
Write-Host ""
if ($allPassed) {
    Write-Host "  TUDO OK PARA PROXIMA ETAPA!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "  ALGUNS TESTES FALHARAM" -ForegroundColor Red
    exit 1
}
