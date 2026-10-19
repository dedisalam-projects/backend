param (
    [string]$Scope = "backend"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SonarQube Scanner (Docker Runner)" -ForegroundColor Cyan
Write-Host "Scope: $Scope" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($Scope -eq "root") {
    $targetPath = (Resolve-Path "$PSScriptRoot\..\..").Path
} else {
    $targetPath = (Resolve-Path "$PSScriptRoot\..").Path
}

# Normalize path for Docker volume mounting on Windows
$dockerPath = $targetPath.Replace('\', '/')

Write-Host "Scanning directory: $dockerPath" -ForegroundColor Yellow

docker run --rm `
    --network infrastructure_sonar_network `
    -e SONAR_HOST_URL="http://sonarqube:9000" `
    -v "${dockerPath}:/usr/src" `
    sonarsource/sonar-scanner-cli
