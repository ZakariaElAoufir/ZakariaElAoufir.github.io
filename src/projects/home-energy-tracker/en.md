A platform that tracks the energy consumption of a home's connected devices, built as Spring Boot microservices. Readings stream in through Kafka, are stored in InfluxDB and aggregated per user; crossing a threshold triggers an e-mail alert.

A local AI service (Ollama) analyses consumption and suggests ways to save energy. Gateway secured by Keycloak, monitoring with Prometheus and Grafana.
