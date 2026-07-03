# Check if SonarQube container is running
$container = docker ps --filter "name=sonarqube" --format "{{.Names}}"
if (-not $container) {
    Write-Host "Starting SonarQube container..." -ForegroundColor Cyan
    docker-compose -f docker-compose.sonar.yml up -d
    Write-Host "Waiting for SonarQube to start up (this may take up to a minute)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

Write-Host "Running Sonar Scanner..." -ForegroundColor Cyan
docker run --rm `
  --network="host" `
  -v "${PSScriptRoot}:/usr/src" `
  sonarsource/sonar-scanner-cli `
  "-Dsonar.host.url=http://localhost:9000" `
  "-Dsonar.login=admin" `
  "-Dsonar.password=admin"
