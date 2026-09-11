---
name: jenkins-api-orchestration
description: "Use when managing, diagnosing, or triggering remote Jenkins pipelines via REST API, or when enforcing zero-manual autonomous Jenkins operations -- authenticate with API tokens, create/update jobs via API, trigger parameterized builds, stream console logs, and manage production credentials"
tier: local
target-stacks: ["jenkins", "docker-compose", "devops", "bash", "powershell"]
metadata:
  origin: auto-extracted
---

# Jenkins API Orchestration & Infrastructure Deployment Automation

**Extracted:** 2026-09-11  
**Context:** Remote Jenkins server automation (behind Cloudflare / reverse proxies), autonomous agent CI/CD execution, and continuous deployment orchestration for Docker Compose infrastructure (`fullstack-infrastructure`).

---

## Problem

1. **Remote Jenkins Interaction**: Interacting with a remote Jenkins instance without browser access requires secure API authentication, CSRF handling, build triggering, queue inspection, and log streaming.
2. **Windows PowerShell Alias Collision**: On Windows systems, PowerShell aliases `curl` to `Invoke-WebRequest`, causing commands with standard flags (e.g. `-u`, `-s`, `-X`) to fail with parameter ambiguity errors.
3. **Deployment Pipeline & Secret Isolation**: Production `.env` secrets must never be committed to Git or leaked into build logs, requiring dynamic injection from Jenkins Credentials Store (`Secret file`) during deployment.
4. **Parameterized Service Deployment**: Deploying infrastructure should support updating specific microservices (e.g. `gateway user-service notification-service`) without unnecessarily restarting healthy stateful datastores (MongoDB, Redis, RabbitMQ).
5. **Eliminating Manual User Tasks (Zero-Manual-Jenkins Policy)**: Relying on users to manually navigate web dashboards, create jobs, paste configurations, or trigger pipelines in the Jenkins UI creates human error, friction, and delays.

---

## Solution

### 1. Remote Jenkins REST API Pattern

#### Windows Global Environment Scope Resolution (Process vs User)
On Windows systems, PowerShell `$env:VARIABLE` only inspects process-level variables inherited at shell startup. If credentials are set globally in Windows User or System Environment Settings (e.g. via `setx` or GUI), `$env:` will return empty.
Always resolve credentials with a fallback to `[Environment]::GetEnvironmentVariable`:

```powershell
# Auto-load persistent User environment credentials into session if missing
if (-not $env:JENKINS_API_TOKEN) {
    $env:JENKINS_USER = [Environment]::GetEnvironmentVariable("JENKINS_USER", "User")
    $env:JENKINS_API_TOKEN = [Environment]::GetEnvironmentVariable("JENKINS_API_TOKEN", "User")
    $env:JENKINS_URL = [Environment]::GetEnvironmentVariable("JENKINS_URL", "User")
}
```

#### Authentication & PowerShell Safety
Always invoke `curl.exe` explicitly on Windows PowerShell to bypass the `Invoke-WebRequest` alias. Authenticate using HTTP Basic Authentication with your Jenkins Username and API Token:

```bash
# Verify credentials and identity
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/whoAmI/api/json"
```

#### Inspecting Job and Build Status
```bash
# Query job metadata and last build number
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/api/json"

# Check status of specific build
curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/<BUILD_NUMBER>/api/json"
```

#### Triggering Builds & Tracking Queue Items
1. Trigger standard build:
   ```bash
   curl.exe -X POST -i -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/build"
   ```

2. Trigger parameterized deployment (e.g. specific services):
   ```bash
   curl.exe -X POST -i -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/fullstack-infrastructure/buildWithParameters?SERVICES=gateway%20user-service%20notification-service"
   ```
   *Response header `Location: <JENKINS_URL>/queue/item/<QUEUE_ID>/` indicates successful enqueueing.*

3. Track queue item to retrieve the assigned build number:
   ```bash
   curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/queue/item/<QUEUE_ID>/api/json"
   ```

4. Stream live console output:
   ```bash
   curl.exe -s -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/<BUILD_NUMBER>/consoleText"
   ```

---

### 2. Autonomous Agent Execution Standard (Zero-Manual-Jenkins Policy)

#### Mandatory Agent-Led Operations
- **Zero Delegated UI Clicks**: The agent must NEVER instruct or ask the user to manually click around, configure pipelines, create jobs, or click build buttons in the Jenkins Web UI.
- **Autonomous API/CLI Execution**: All Jenkins operations (connectivity checks, job provisioning, XML configuration updates, credential uploads, build triggering, console streaming, and status polling) must be executed directly by the agent using `curl.exe` or terminal scripts.
- **Minimal Credential Ingestion**: The agent prompts the user *only* when an initial secret or token is missing from the environment (e.g. asking for API Token or raw production `.env` contents). As soon as the credential is provided, the agent takes over completely and performs all Jenkins actions autonomously.

#### Autonomous Job Creation & Update Pattern
Before triggering builds, check and ensure the job exists on the remote Jenkins server:
```bash
# 1. Check if job exists (HTTP 200 vs HTTP 404)
curl.exe -s -o NUL -w "%{http_code}" -u "<USER>:<API_TOKEN>" "<JENKINS_URL>/job/<JOB_NAME>/api/json"

# 2. If 404: Create job from job-config.xml
curl.exe -X POST -u "<USER>:<API_TOKEN>" \
  -H "Content-Type: application/xml" \
  --data-binary "@jenkins/job-config.xml" \
  "<JENKINS_URL>/createItem?name=<JOB_NAME>"

# 3. If 200: Update existing job configuration
curl.exe -X POST -u "<USER>:<API_TOKEN>" \
  -H "Content-Type: application/xml" \
  --data-binary "@jenkins/job-config.xml" \
  "<JENKINS_URL>/job/<JOB_NAME>/config.xml"
```

#### Autonomous Credential Provisioning via API
Upload production `.env` files directly into Jenkins Credentials Store without requiring manual upload in the browser:
```bash
curl.exe -X POST -u "<USER>:<API_TOKEN>" \
  -H "Content-Type: application/xml" \
  --data-binary "@jenkins/credentials-infra-prod-env.xml" \
  "<JENKINS_URL>/credentials/store/system/domain/_/createCredentials"
```

---

### 3. Infrastructure Deployment Pipeline Pattern

#### Secret Injection Pattern via Jenkins Credentials
Inject production secrets securely into `.env` at build runtime and purge immediately after:

```groovy
stage('Inject Production Secrets (.env)') {
    steps {
        withCredentials([file(credentialsId: 'infra-prod-env', variable: 'PROD_ENV_FILE')]) {
            sh '''
                cp "$PROD_ENV_FILE" .env
                chmod 600 .env
            '''
        }
    }
}
```

#### Selective Service Update Pattern
Update application containers with `--no-deps` to protect running datastores:

```groovy
stage('Deploy Containers') {
    steps {
        sh '''
            if [ "${SERVICES}" = "all" ] || [ -z "${SERVICES}" ]; then
                docker compose -f docker-compose.prod.yml up -d --remove-orphans
            else
                docker compose -f docker-compose.prod.yml up -d --no-deps --remove-orphans ${SERVICES}
            fi
        '''
    }
}
```

#### Automated Post-Deploy Hygiene
Purge the injected `.env` and clean dangling images:

```groovy
post {
    always {
        sh 'rm -f .env || true'
    }
    success {
        sh 'docker image prune -f || true'
    }
}
```

---

## When to Use

- When authenticating, triggering, or streaming logs from a remote Jenkins server via terminal or automation agent.
- When creating, updating, or configuring Jenkins jobs autonomously without manual GUI steps.
- When triggering or checking the status of `fullstack-infrastructure` deployments.
- When configuring credentials, secret files, or pipeline steps in `infrastructure/Jenkinsfile`.
- When `curl` fails with ambiguous parameter errors in PowerShell.