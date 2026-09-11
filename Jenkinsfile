pipeline {
    agent any
    
    tools {
        nodejs 'Node24'
    }
    
    environment {
        NX_BASE = 'HEAD~1'
        NX_DAEMON = 'false'
        NPM_CONFIG_UPDATE_NOTIFIER = 'false'
        GATEWAY_URL = 'http://localhost:3000'
    }
    
    options {
        timeout(time: 45, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    triggers {
        githubPush()
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
                sh 'npm ci --legacy-peer-deps'
                sh 'npx nx reset'
            }
        }
        
        stage('Lint & Static Analysis') {
            steps {
                echo 'Running linting across workspace...'
                sh 'npx nx run-many --target=lint --all'
            }
        }
        
        stage('Dependency Security Audit') {
            steps {
                echo 'Running high-severity security audit...'
                sh 'npm audit --audit-level=high || true'
            }
        }
        
        // =========================================================================
        // 🛡️ 7-LAYER REALTIME & MICROSERVICES TESTING MATRIX QUALITY GATE
        // =========================================================================

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
            steps {
                echo 'Testing long-running connection cycles, heap delta bounds, and listener leak absence...'
                sh 'npm run test:soak'
            }
        }

        stage('Layer 3: Mutation Score Hardening') {
            steps {
                echo 'Verifying mutation score via StrykerJS...'
                sh 'npm run test:mutation'
            }
        }
        
        // =========================================================================
        // 🚀 BUILD & DEPLOYMENT STAGES
        // =========================================================================

        stage('Build Microservices & Gateway') {
            steps {
                echo 'Building all backend applications...'
                sh 'npx nx run-many --target=build --all'
            }
        }
        
        stage('Docker Build & Push') {
            when {
                branch 'main'
            }
            steps {
                echo 'Building production Docker images...'
                sh 'docker build -t dedisalam/backend-gateway:latest -f docker/gateway/Dockerfile .'
                sh 'docker build -t dedisalam/backend-user-service:latest -f docker/user-service/Dockerfile .'
                sh 'docker build -t dedisalam/backend-notification-service:latest -f docker/notification-service/Dockerfile .'
                
                echo 'Pushing Docker images to Docker Hub registry...'
                sh 'docker push dedisalam/backend-gateway:latest'
                sh 'docker push dedisalam/backend-user-service:latest'
                sh 'docker push dedisalam/backend-notification-service:latest'
            }
        }
        
        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying to infrastructure...'
                sh 'docker compose -f ../infrastructure/docker-compose.prod.yml pull gateway user-service notification-service || true'
                sh 'docker compose -f ../infrastructure/docker-compose.prod.yml up -d gateway user-service notification-service || true'
            }
        }
    }
    
    post {
        always {
            echo 'Archiving test reports and coverage results...'
            archiveArtifacts artifacts: 'coverage/**, reports/**', allowEmptyArchive: true
            sh 'rm -rf .stryker-tmp || true'
        }
        success {
            echo '✅ Jenkins Pipeline Succeeded! All 7 Testing Matrix Layers passed 100%.'
        }
        failure {
            echo '❌ Jenkins Pipeline Failed! Please check the stage logs for quality gate violations.'
        }
    }
}
