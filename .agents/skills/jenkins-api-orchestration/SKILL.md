---
name: jenkins-api-orchestration
description: "Use when managing, diagnosing, or triggering remote Jenkins pipelines via REST API, or when enforcing zero-manual autonomous Jenkins operations -- authenticate with API tokens, configure zero-plugin Discord webhook notifications, create/update jobs via API, trigger parameterized builds, stream console logs, and manage production credentials"
tier: local
target-stacks: ["jenkins", "docker-compose", "discord", "devops", "bash", "groovy", "powershell"]
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
6. **Pipeline Visibility & Realtime Alerts**: Developers need instant feedback on pipeline outcomes (commit SHA, author, branch, duration, build status) in team channels (e.g., Discord) without installing unmaintained third-party Jenkins plugins that cause dependency conflicts or server crashes.

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
    # Direct LAN endpoint on production host (bypasses Cloudflare when on local network):
    $env:JENKINS_LOCAL_URL = [Environment]::GetEnvironmentVariable("JENKINS_LOCAL_URL", "User")
}
```

#### Quick PowerShell Diagnostic One-Liners
Quickly test connectivity and list existing jobs with color statuses without manual browser navigation:
```powershell
# 1. Verify identity and credentials
curl.exe -s -u "$([Environment]::GetEnvironmentVariable('JENKINS_USER','User')):$([Environment]::GetEnvironmentVariable('JENKINS_API_TOKEN','User'))" "$([Environment]::GetEnvironmentVariable('JENKINS_URL','User'))/whoAmI/api/json"

# 2. List all jobs and status color (blue=success, red=failed)
curl.exe -s -u "$([Environment]::GetEnvironmentVariable('JENKINS_USER','User')):$([Environment]::GetEnvironmentVariable('JENKINS_API_TOKEN','User'))" "$([Environment]::GetEnvironmentVariable('JENKINS_URL','User'))/api/json" | ConvertFrom-Json | Select-Object -ExpandProperty jobs | Select-Object name, color
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

### 4. Zero-Plugin Discord Pipeline Notification Pattern

#### Autonomous Credential Provisioning via REST API
Upload the Discord Webhook URL into the Jenkins Credentials Store as a `Secret text` credential (`discord-webhook-url`) autonomously without navigating the web UI:

```powershell
# 1. Generate XML credential definition for plain secret string
$discordCredXml = @"
<org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl plugin="plain-credentials">
  <scope>GLOBAL</scope>
  <id>discord-webhook-url</id>
  <description>Discord Webhook URL for CI/CD pipeline notifications</description>
  <secret>$DISCORD_WEBHOOK_URL</secret>
</org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl>
"@
$discordCredXml | Set-Content -Path "jenkins/credentials-discord-webhook.xml" -Encoding UTF8

# 2. Upload to Jenkins Credentials Store via curl.exe
curl.exe -X POST -u "$([Environment]::GetEnvironmentVariable('JENKINS_USER','User')):$([Environment]::GetEnvironmentVariable('JENKINS_API_TOKEN','User'))" `
  -H "Content-Type: application/xml" `
  --data-binary "@jenkins/credentials-discord-webhook.xml" `
  "$([Environment]::GetEnvironmentVariable('JENKINS_URL','User'))/credentials/store/system/domain/_/createCredentials"
```

#### Robust Declarative Pipeline Notification Helper (`Jenkinsfile`)
Define a reusable notification helper method outside the `pipeline { ... }` block with sandbox-safe ISO-8601 timestamps, sanitization of Git commit messages, and non-blocking `try/catch` fault tolerance:

```groovy
def sendDiscordNotification(String status, String color, String summary) {
    try {
        withCredentials([string(credentialsId: 'discord-webhook-url', variable: 'DISCORD_WEBHOOK')]) {
            def commitHash = sh(script: "git rev-parse --short HEAD 2>/dev/null || echo 'N/A'", returnStdout: true).trim()
            def commitAuthor = sh(script: "git log -1 --pretty=format:'%an' 2>/dev/null || echo 'Jenkins'", returnStdout: true).trim()
            def rawMsg = sh(script: "git log -1 --pretty=format:'%s' 2>/dev/null || echo 'No message'", returnStdout: true).trim()
            def commitMsg = rawMsg.replace('\\', '\\\\').replace('"', '\\"').replace('\r', '').replace('\n', ' ')
            def branch = env.BRANCH_NAME ?: env.GIT_BRANCH ?: 'master'
            def buildDuration = currentBuild.durationString.replace(' and counting', '')
            def timestamp = java.time.Instant.now().toString()

            def payload = """{
  "embeds": [{
    "title": "Jenkins Pipeline: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
    "url": "${env.BUILD_URL}",
    "color": ${color},
    "description": "${summary}",
    "fields": [
      { "name": "Status", "value": "${status}", "inline": true },
      { "name": "Branch", "value": "`${branch}`", "inline": true },
      { "name": "Duration", "value": "${buildDuration}", "inline": true },
      { "name": "Author", "value": "${commitAuthor}", "inline": true },
      { "name": "Commit", "value": "`${commitHash}`: ${commitMsg}", "inline": false }
    ],
    "footer": { "text": "Jenkins CI/CD Automation • Pure Realtime Backend" },
    "timestamp": "${timestamp}"
  }]
}"""

            sh(script: """
                curl -s -f -X POST -H "Content-Type: application/json" -d '${payload}' "\$DISCORD_WEBHOOK" >/dev/null || true
            """, returnStatus: true)
        }
    } catch (Exception e) {
        echo "⚠️ Discord notification skipped or failed: ${e.message}"
    }
}
```

#### Pipeline `post` Hooks Execution
Integrate into the Declarative `post` block with color indicators (Green `3066993` for SUCCESS, Red `15158332` for FAILURE, Yellow `15105570` for UNSTABLE):

```groovy
post {
    always {
        // Ephemeral cleanup & artifact archiving
    }
    success {
        echo '✅ Jenkins Pipeline Succeeded!'
        script {
            sendDiscordNotification('SUCCESS', '3066993', '✅ All Testing Matrix Layers passed 100%!')
        }
    }
    failure {
        echo '❌ Jenkins Pipeline Failed!'
        script {
            sendDiscordNotification('FAILURE', '15158332', '❌ Pipeline failed! Please check stage logs for quality gate violations.')
        }
    }
    unstable {
        echo '⚠️ Jenkins Pipeline Unstable!'
        script {
            sendDiscordNotification('UNSTABLE', '15105570', '⚠️ Pipeline unstable! Quality gate warnings encountered.')
        }
    }
}
```

---

## When to Use

- When authenticating, triggering, or streaming logs from a remote Jenkins server via terminal or automation agent.
- When creating, updating, or configuring Jenkins jobs autonomously without manual GUI steps.
- When triggering or checking the status of `fullstack-infrastructure` deployments.
- When configuring credentials, secret files, or pipeline steps in `Jenkinsfile`.
- When integrating Discord or webhook-based notifications into Jenkins declarative pipelines without third-party plugins.
- When `curl` fails with ambiguous parameter errors in PowerShell.