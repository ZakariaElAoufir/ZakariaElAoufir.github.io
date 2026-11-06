// The repository the team browses in the GitHub section: a small invented room-booking project, written for the demo.
export type RepoFile = { path: string; branches: string[]; message: string; content: string };

const ALL = ['main', 'develop', 'feature/reservations-api'];
const DEV = ['develop', 'feature/reservations-api'];
const FEATURE = ['feature/reservations-api'];

export const REPO_FILES: RepoFile[] = [
  {
    path: 'README.md', branches: DEV, message: 'docs: précise le lancement local',
    content: `# Réservation de salles

Application de réservation des salles de réunion.

## Lancer le projet

    docker compose up --build

- Application : http://localhost:4200
- API : http://localhost:8081/api/reservations
`
  },
  {
    path: 'docker-compose.yml', branches: ALL, message: 'build: Dockerfile backend et frontend',
    content: `services:
  database:
    image: postgres:16
    environment:
      POSTGRES_DB: rooms
      POSTGRES_PASSWORD: \${DB_PASSWORD}
  backend:
    build: ./backend
    depends_on: [database]
    ports: ["8081:8081"]
  frontend:
    build: ./frontend
    depends_on: [backend]
    ports: ["4200:80"]
`
  },
  {
    path: '.github/workflows/ci.yml', branches: DEV, message: 'ci: lance les tests à chaque push',
    content: `name: ci
on: [push]
jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: ./mvnw -B verify
        working-directory: backend
`
  },
  {
    path: 'backend/Dockerfile', branches: ALL, message: 'build: Dockerfile backend et frontend',
    content: `FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn -B package -DskipTests

FROM eclipse-temurin:21-jre
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
`
  },
  {
    path: 'backend/src/main/resources/schema.sql', branches: ALL, message: 'feat(db): tables des salles et des réservations',
    content: `CREATE TABLE room (
  id       BIGSERIAL PRIMARY KEY,
  name     VARCHAR(80) NOT NULL UNIQUE,
  capacity INT NOT NULL CHECK (capacity > 0)
);

CREATE TABLE reservation (
  id        BIGSERIAL PRIMARY KEY,
  room_id   BIGINT NOT NULL REFERENCES room (id),
  booked_by VARCHAR(120) NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at   TIMESTAMP NOT NULL,
  CHECK (ends_at > starts_at)
);
`
  },
  {
    path: 'backend/src/main/java/demo/rooms/ReservationController.java', branches: FEATURE, message: 'feat(reservation): ajoute le contrôleur REST',
    content: `package demo.rooms;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reservations")
class ReservationController {
  private final ReservationService service;

  ReservationController(ReservationService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  Reservation create(@RequestBody NewReservation request) {
    return service.book(request);
  }
}
`
  },
  {
    path: 'backend/src/main/java/demo/rooms/ReservationService.java', branches: FEATURE, message: 'fix(reservation): refuse une fin avant le début',
    content: `package demo.rooms;

import org.springframework.stereotype.Service;

@Service
class ReservationService {
  private final ReservationRepository reservations;

  ReservationService(ReservationRepository reservations) {
    this.reservations = reservations;
  }

  Reservation book(NewReservation request) {
    if (!request.endsAt().isAfter(request.startsAt())) {
      throw new InvalidSlotException("La fin doit suivre le début.");
    }
    boolean taken = reservations.existsOverlap(
        request.roomId(), request.startsAt(), request.endsAt());
    if (taken) {
      throw new RoomTakenException(request.roomId());
    }
    return reservations.save(request.toReservation());
  }
}
`
  },
  {
    path: 'frontend/Dockerfile', branches: ALL, message: 'build: Dockerfile backend et frontend',
    content: `FROM node:22 AS build
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM nginx:alpine
COPY --from=build /app/dist/rooms/browser /usr/share/nginx/html
`
  },
  {
    path: 'frontend/src/app/reservation/reservation-form.ts', branches: DEV, message: 'feat(front): formulaire de réservation',
    content: `import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReservationApi } from './reservation-api';

@Component({
  selector: 'app-reservation-form',
  imports: [ReactiveFormsModule],
  templateUrl: './reservation-form.html'
})
export class ReservationForm {
  private readonly api = inject(ReservationApi);

  readonly form = inject(FormBuilder).nonNullable.group({
    roomId: [0, Validators.min(1)],
    startsAt: ['', Validators.required],
    endsAt: ['', Validators.required]
  });

  submit() {
    if (this.form.valid) this.api.book(this.form.getRawValue()).subscribe();
  }
}
`
  }
];
