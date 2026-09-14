pipeline {
    agent {
        node {
            label 'ROBOSHOP'
        }
    }
    parameters {
        string(name: 'NAMESPACE', defaultValue: 'roboshop-dev', description: 'K8s namespace the target RoboShop deployment lives in')
        // Cluster-internal DNS (*.svc.cluster.local) isn't resolvable from this agent for
        // every namespace/environment. Leave these blank to use DNS (the historical default);
        // set them (e.g. to pod IPs) to bypass DNS entirely when it doesn't resolve.
        string(name: 'CATALOGUE_URL', defaultValue: '', description: 'Override catalogue base URL, e.g. http://<pod-ip>:8080')
        string(name: 'CART_URL', defaultValue: '', description: 'Override cart base URL')
        string(name: 'USER_URL', defaultValue: '', description: 'Override user base URL')
        string(name: 'SHIPPING_URL', defaultValue: '', description: 'Override shipping base URL')
        string(name: 'PAYMENT_URL', defaultValue: '', description: 'Override payment base URL')
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
        stage('integration-tests') {
            steps {
                sh 'npm test'
                //sh 'echo passed'
            }
        }
    }
    post {
        /* always {
            junit testResults: 'junit.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'junit.xml', allowEmptyArchive: true
        } */
        success {
            echo "Integration tests passed against ${params.NAMESPACE}"
        }
        failure {
            echo "Integration tests failed against ${params.NAMESPACE} — see junit report"
        }
    }
}