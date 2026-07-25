pipeline {
    agent any
    
    tools {
        nodejs 'Node22'
    }
    
    environment {
        NX_BASE = 'HEAD~1'
        NX_DAEMON = 'false'
        NPM_CONFIG_UPDATE_NOTIFIER = 'false'
    }
    
    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo 'Cleaning up existing node_modules to avoid permission locks...'
                sh 'rm -rf node_modules || true'
                echo 'Installing dependencies...'
                sh 'npm ci --legacy-peer-deps'
            }
        }
        
        stage('Lint') {
            steps {
                echo 'Running linting for affected projects...'
                sh 'npx nx affected -t lint'
            }
        }
        
        stage('Test') {
            steps {
                echo 'Running unit tests for affected projects...'
                sh 'npx nx affected -t test'
            }
        }
        
        stage('Build') {
            steps {
                echo 'Building affected projects...'
                sh 'npx nx affected -t build'
            }
        }
        
        stage('Docker Build & Push') {
            steps {
                echo 'Building and pushing backend images...'
                sh 'docker build -t dedisalam/backend-gateway:latest -f docker/gateway/Dockerfile .'
                sh 'docker build -t dedisalam/backend-user-service:latest -f docker/user-service/Dockerfile .'
                sh 'docker build -t dedisalam/backend-notification-service:latest -f docker/notification-service/Dockerfile .'
                
                sh 'docker push dedisalam/backend-gateway:latest'
                sh 'docker push dedisalam/backend-user-service:latest'
                sh 'docker push dedisalam/backend-notification-service:latest'
            }
        }
        
        stage('Deploy') {
            steps {
                echo 'Deploying to local Docker host...'
                // Menarik image terbaru dan me-restart container menggunakan file compose di workspace
                sh 'docker compose -p fullstack -f docker-compose.prod.yml pull gateway user-service notification-service'
                sh 'docker compose -p fullstack -f docker-compose.prod.yml up -d gateway user-service notification-service'
            }
        }
    }
    
    post {
        always {
            echo 'Pipeline finished.'
        }
        success {
            echo 'Pipeline succeeded!'
        }
        failure {
            echo 'Pipeline failed. Please check the logs.'
        }
    }
}
