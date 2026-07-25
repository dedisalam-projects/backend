pipeline {
    agent any
    
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
                sh 'docker build -t dedisalam/fullstack-gateway:latest -f docker/gateway/Dockerfile .'
                sh 'docker build -t dedisalam/fullstack-user-service:latest -f docker/user-service/Dockerfile .'
                sh 'docker build -t dedisalam/fullstack-notification-service:latest -f docker/notification-service/Dockerfile .'
                
                sh 'docker push dedisalam/fullstack-gateway:latest'
                sh 'docker push dedisalam/fullstack-user-service:latest'
                sh 'docker push dedisalam/fullstack-notification-service:latest'
            }
        }
        
        stage('Deploy (Webhook)') {
            steps {
                echo 'Triggering deployment webhook on remote server...'
                // Pastikan environment variable WEBHOOK_URL_BACKEND diisi di setting Jenkins jika ada URL spesifik
                sh 'curl -X POST ${WEBHOOK_URL_BACKEND} || echo "No webhook triggered"'
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
