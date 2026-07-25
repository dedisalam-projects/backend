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
        
        stage('Deploy') {
            steps {
                echo 'Deploying to remote server via SSH...'
                // Menarik image terbaru dari Docker Hub dan me-restart container
                sh 'ssh -o StrictHostKeyChecking=no dedisalam@172.16.254.2 "cd ~/fullstack/backend && docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d"'
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
