pipeline {
    agent {
        node {
            label 'ROBOSHOP'
        }
    }

    parameters {
        string(name: 'NAMESPACE',
               defaultValue: 'roboshop-dev',
               description: 'K8s namespace')

        string(name: 'CATALOGUE_URL',
               defaultValue: '',
               description: 'Override catalogue URL')

        string(name: 'CART_URL',
               defaultValue: '',
               description: 'Override cart URL')

        string(name: 'USER_URL',
               defaultValue: '',
               description: 'Override user URL')

        string(name: 'SHIPPING_URL',
               defaultValue: '',
               description: 'Override shipping URL')

        string(name: 'PAYMENT_URL',
               defaultValue: '',
               description: 'Override payment URL')
    }

    environment {
        CATALOGUE_URL = "${params.CATALOGUE_URL?.trim() ?: "http://catalogue.${params.NAMESPACE}.svc.cluster.local:8080"}"
        CART_URL      = "${params.CART_URL?.trim() ?: "http://cart.${params.NAMESPACE}.svc.cluster.local:8080"}"
        USER_URL      = "${params.USER_URL?.trim() ?: "http://user.${params.NAMESPACE}.svc.cluster.local:8080"}"
        SHIPPING_URL  = "${params.SHIPPING_URL?.trim() ?: "http://shipping.${params.NAMESPACE}.svc.cluster.local:8080"}"
        PAYMENT_URL   = "${params.PAYMENT_URL?.trim() ?: "http://payment.${params.NAMESPACE}.svc.cluster.local:8080"}"
    }

    options {
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
    }

    stages {

        stage('install-dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('show-test-urls') {
            steps {
                sh '''
                    echo "NAMESPACE=${NAMESPACE}"
                    echo "CATALOGUE_URL=${CATALOGUE_URL}"
                    echo "CART_URL=${CART_URL}"
                    echo "USER_URL=${USER_URL}"
                    echo "SHIPPING_URL=${SHIPPING_URL}"
                    echo "PAYMENT_URL=${PAYMENT_URL}"
                '''
            }
        }

        stage('integration-tests') {
            steps {
                sh 'npm test'
            }
        }
    }

    post {
        success {
            echo "Integration tests passed against ${params.NAMESPACE}"
        }

        failure {
            echo "Integration tests failed against ${params.NAMESPACE}"
        }
    }
}