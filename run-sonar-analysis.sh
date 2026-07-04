#!/bin/bash

# Check if SonarQube container is running
container=$(docker ps --filter "name=sonarqube" --format "{{.Names}}")
if [ -z "$container" ]; then
    echo "Starting SonarQube container..."
    docker-compose -f docker-compose.sonar.yml up -d
    echo "Waiting for SonarQube to start up (this may take up to a minute)..."
    sleep 30
fi

echo "Running Sonar Scanner..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
docker run --rm \
  --network="host" \
  -v "$SCRIPT_DIR:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dsonar.host.url=http://localhost:9000 \
  -Dsonar.login=admin \
  -Dsonar.password=admin
