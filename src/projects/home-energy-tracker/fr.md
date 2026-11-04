Plateforme de suivi de la consommation énergétique des appareils connectés d'une maison, en microservices Spring Boot. Les relevés arrivent en continu par Kafka, sont stockés dans InfluxDB et agrégés par utilisateur ; un dépassement de seuil déclenche une alerte e-mail.

Un service d'IA locale (Ollama) analyse la consommation et propose des conseils d'économie. Gateway sécurisée par Keycloak, supervision Prometheus et Grafana.
