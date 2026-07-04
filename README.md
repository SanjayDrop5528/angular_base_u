# synapse

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.9.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Running SonarQube Analysis Locally

We have integrated local SonarQube static code quality analysis. To run the analysis locally:

### Prerequisites
- **Docker Desktop** must be installed and running on your system.

### How to Run

#### Windows (PowerShell)
1. Open a PowerShell terminal in the project root directory.
2. Execute:
   ```powershell
   .\run-sonar-analysis.ps1
   ```

#### macOS / Linux / Git Bash (Shell)
1. Open a terminal in the project root directory.
2. Grant execute permission:
   ```bash
   chmod +x run-sonar-analysis.sh
   ```
3. Execute:
   ```bash
   ./run-sonar-analysis.sh
   ```

*Note: On first execution, the helper script will automatically spin up a local SonarQube Community LTS container on port `9000` via Docker Compose, wait for the service to initialize, and invoke the scanner analysis.*

3. Once the scan completes, open http://localhost:9000 in your browser to view the code review dashboard.
4. Log in using the default credentials:
   - **Username**: `admin`
   - **Password**: `admin` *(you will be prompted to update this password on first login)*.

