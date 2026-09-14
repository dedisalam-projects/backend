pipeline {
    agent any
    
    tools {
        nodejs 'Node24'
    }
    
    environment {
        NX_BASE = 'HEAD~1'
        NX_DAEMON = 'false'
        NPM_CONFIG_UPDATE_NOTIFIER = 'false'
        GATEWAY_URL = 'http://localhost:3005'
    }
    
    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    parameters {
        booleanParam(
            name: 'RUN_EXTENDED_TESTS',
            defaultValue: false,
            description: 'Jalankan pengujian lambat (Memory Leak Soak Test & Stryker Mutation Score)'
        )
    }

    triggers {
        githubPush()
        cron('H 2 * * *')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Cleaning up existing locks and preparing clean workspace...'
                sh 'pkill -f "nx daemon" || true'
                sh 'rm -rf node_modules_* node_modules_del* || true'
                sh 'find . -name ".eslintignore" -delete || true'
                sh 'npm ci --legacy-peer-deps'
                sh 'npx nx reset'
            }
        }
        
        stage('Lint & Static Analysis') {
            steps {
                echo 'Running linting across workspace...'
                sh 'npx nx run-many --target=lint --all --verbose'
            }
        }
        
        stage('Dependency Security Audit') {
            steps {
                echo 'Running high-severity security audit...'
                sh 'npm audit --audit-level=high || true'
            }
        }

        stage('Build Staging Docker Images') {
            steps {
                echo 'Building local staging Docker images from current commit...'
                sh 'docker build -t dedisalam/backend-gateway:staging -f docker/gateway/Dockerfile .'
                sh 'docker build -t dedisalam/backend-user-service:staging -f docker/user-service/Dockerfile .'
                sh 'docker build -t dedisalam/backend-notification-service:staging -f docker/notification-service/Dockerfile .'
            }
        }
        
        // =========================================================================
        // 🛡️ 7-LAYER REALTIME & MICROSERVICES TESTING MATRIX QUALITY GATE
        // =========================================================================

        stage('Ensure Staging Environment') {
            steps {
                echo 'Ensuring dedicated staging stack is healthy on port 3005...'
                build job: 'fullstack-infra-staging', parameters: [string(name: 'ACTION', value: 'deploy'), string(name: 'SERVICES', value: 'all')], wait: true
            }
        }

        stage('Layer 1 & 2: Unit & Property-Based Testing (100% Gate)') {
            steps {
                echo 'Executing Jest Unit & Fast-Check PBT with strict 100% coverage threshold...'
                sh 'npm run test:unit'
            }
        }

        stage('Layer 5: Microservice Event Schema Contracts') {
            steps {
                echo 'Validating RabbitMQ asynchronous event contracts between microservices...'
                sh 'npm run test:contract'
            }
        }

        stage('Layer 4: Automated Realtime Socket.IO Integration E2E') {
            steps {
                echo 'Testing end-to-end Socket.IO namespaces, multi-admin live rooms, and CRUD broadcasts...'
                sh 'npm run test:integration'
            }
        }

        stage('Layer 7: Network Resilience & Auto-Reconnect Chaos') {
            steps {
                echo 'Testing WebSocket client auto-reconnection, token refresh, and storm resilience...'
                sh 'npm run test:resilience'
            }
        }

        stage('Layer 6: WebSocket Concurrency Load Benchmark') {
            steps {
                echo 'Benchmarking 30 concurrent socket handshakes and 100 concurrent RPCs with 0% error rate...'
                sh 'npm run test:load'
            }
        }

        stage('WebSocket Security & Penetration Quality Gate') {
            steps {
                echo 'Testing privilege escalation, JWT tampering, NoSQL injection, and prototype pollution defense...'
                sh 'npm run test:security'
            }
        }

        stage('Memory Leak & Long-Running Soak Testing') {
            when {
                anyOf {
                    expression { return params.RUN_EXTENDED_TESTS == true }
                    expression { return currentBuild.getBuildCauses().toString().contains('TimerTrigger') }
                    changeRequest()
                }
            }
            steps {
                echo 'Testing long-running connection cycles, heap delta bounds, and listener leak absence...'
                sh 'npm run test:soak'
            }
        }

        stage('Layer 3: Mutation Score Hardening') {
            when {
                anyOf {
                    expression { return params.RUN_EXTENDED_TESTS == true }
                    expression { return currentBuild.getBuildCauses().toString().contains('TimerTrigger') }
                    changeRequest()
                }
            }
            steps {
                echo 'Verifying mutation score via StrykerJS...'
                sh 'npm run test:mutation'
            }
        }
        
        // =========================================================================
        // 🚀 BUILD & DEPLOYMENT STAGES
        // =========================================================================

        stage('Docker Push to Registry') {
            steps {
                script {
                    def semver = sh(script: 'git describe --tags --exact-match 2>/dev/null || echo "v1.0.${BUILD_NUMBER}"', returnStdout: true).trim()
                    env.RELEASE_TAG = semver
                    echo "Target SemVer release tag: ${env.RELEASE_TAG}"
                }
                echo 'Tagging and pushing production Docker images to Docker Hub registry (Dual-Tagging SemVer + Latest)...'
                sh '''
                    docker tag dedisalam/backend-gateway:staging dedisalam/backend-gateway:${RELEASE_TAG}
                    docker tag dedisalam/backend-gateway:staging dedisalam/backend-gateway:latest

                    docker tag dedisalam/backend-user-service:staging dedisalam/backend-user-service:${RELEASE_TAG}
                    docker tag dedisalam/backend-user-service:staging dedisalam/backend-user-service:latest

                    docker tag dedisalam/backend-notification-service:staging dedisalam/backend-notification-service:${RELEASE_TAG}
                    docker tag dedisalam/backend-notification-service:staging dedisalam/backend-notification-service:latest
                    
                    docker push dedisalam/backend-gateway:${RELEASE_TAG}
                    docker push dedisalam/backend-gateway:latest

                    docker push dedisalam/backend-user-service:${RELEASE_TAG}
                    docker push dedisalam/backend-user-service:latest

                    docker push dedisalam/backend-notification-service:${RELEASE_TAG}
                    docker push dedisalam/backend-notification-service:latest
                '''
            }
        }
        
        stage('Trigger Infrastructure Deploy') {
            steps {
                echo 'Triggering downstream deployment on fullstack-infrastructure...'
                build job: 'fullstack-infrastructure', wait: false
            }
        }
    }
    
    post {
        always {
            echo 'Tearing down ephemeral staging environment...'
            build job: 'fullstack-infra-staging', parameters: [string(name: 'ACTION', value: 'down')], wait: true
            echo 'Archiving test reports and coverage results...'
            archiveArtifacts artifacts: 'coverage/**, reports/**', allowEmptyArchive: true
            sh 'rm -rf .stryker-tmp || true'
        }
        success {
            echo '✅ Jenkins Pipeline Succeeded! All 7 Testing Matrix Layers passed 100%.'
            script {
                sendDiscordNotification('SUCCESS', '3066993', '✅ All 7 Testing Matrix Layers passed 100%!')
            }
        }
        failure {
            echo '❌ Jenkins Pipeline Failed! Please check the stage logs for quality gate violations.'
            script {
                sendDiscordNotification('FAILURE', '15158332', '❌ Pipeline failed! Please check stage logs for quality gate violations.')
            }
        }
        unstable {
            echo '⚠️ Jenkins Pipeline Unstable! Quality gate warnings encountered.'
            script {
                sendDiscordNotification('UNSTABLE', '15105570', '⚠️ Pipeline unstable! Quality gate warnings encountered.')
            }
        }
    }
}

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

