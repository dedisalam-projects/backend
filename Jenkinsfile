pipeline {
    agent {
        docker {
            image 'node:20-alpine'
            args '-u root'
        }
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
                echo 'Installing dependencies...'
                sh 'npm ci'
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
