// What each commit of the invented repository changed, file by file, as unified diff lines (the "patch" GitHub returns).
// The additions and deletions shown everywhere are counted from these patches.
import { REPO_FILES } from './repo';

export type FileStatus = 'added' | 'modified' | 'removed';
export type ChangedFile = { filename: string; status: FileStatus; additions: number; deletions: number; patch: string[] };

const contentOf = (path: string) => REPO_FILES.find(f => f.path === path)?.content ?? '';
/** A new file: every line is an addition. */
const added = (filename: string, content = contentOf(filename)): ChangedFile => {
  const lines = content.replace(/\n$/, '').split('\n');
  return file(filename, 'added', [`@@ -0,0 +1,${lines.length} @@`, ...lines.map(l => `+${l}`)]);
};
const file = (filename: string, status: FileStatus, patch: string[]): ChangedFile => ({
  filename, status, patch,
  additions: patch.filter(l => l.startsWith('+')).length,
  deletions: patch.filter(l => l.startsWith('-')).length
});

const EXCEPTION = `package demo.rooms;

class InvalidSlotException extends RuntimeException {
  InvalidSlotException(String message) {
    super(message);
  }
}
`;
const REPOSITORY = `package demo.rooms;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ReservationRepository extends JpaRepository<Reservation, Long> {

  @Query("""
      select count(r) > 0 from Reservation r
      where r.roomId = :roomId
        and r.startsAt < :endsAt
        and r.endsAt > :startsAt
      """)
  boolean existsOverlap(Long roomId, LocalDateTime startsAt, LocalDateTime endsAt);
}
`;
const NEW_RESERVATION = `package demo.rooms;

import java.time.LocalDateTime;

record NewReservation(Long roomId, LocalDateTime startsAt, LocalDateTime endsAt,
    int participants, String title) {

  Reservation toReservation() {
    return new Reservation(roomId, startsAt, endsAt, participants, title);
  }
}
`;
const FORM_HTML = `<form [formGroup]="form" (ngSubmit)="submit()">
  <label>Salle
    <select formControlName="roomId">
      @for (room of rooms(); track room.id) {
        <option [value]="room.id">{{ room.name }}</option>
      }
    </select>
  </label>
  <label>Début <input type="datetime-local" formControlName="startsAt" /></label>
  <label>Fin <input type="datetime-local" formControlName="endsAt" /></label>
  <button type="submit" [disabled]="form.invalid">Réserver</button>
</form>
`;
const INITIAL_README = `# Réservation de salles

Application de réservation des salles de réunion.
`;
const INITIAL_COMPOSE = `services:
  database:
    image: postgres:16
    environment:
      POSTGRES_DB: rooms
      POSTGRES_PASSWORD: \${DB_PASSWORD}
`;

/** Indexed like the commit log of the engine, newest first. */
export const COMMIT_FILES: ChangedFile[][] = [
  // fix(reservation): refuse une fin avant le début
  [
    file('backend/src/main/java/demo/rooms/ReservationService.java', 'modified', [
      '@@ -12,6 +12,9 @@ class ReservationService {',
      '   }',
      ' ',
      '   Reservation book(NewReservation request) {',
      '+    if (!request.endsAt().isAfter(request.startsAt())) {',
      '+      throw new InvalidSlotException("La fin doit suivre le début.");',
      '+    }',
      '     boolean taken = reservations.existsOverlap(',
      '         request.roomId(), request.startsAt(), request.endsAt());',
      '     if (taken) {'
    ]),
    added('backend/src/main/java/demo/rooms/InvalidSlotException.java', EXCEPTION),
    file('backend/src/test/java/demo/rooms/ReservationServiceTest.java', 'modified', [
      '@@ -31,4 +31,13 @@ class ReservationServiceTest {',
      '     assertThatThrownBy(() -> service.book(overlapping))',
      '         .isInstanceOf(RoomTakenException.class);',
      '   }',
      '+',
      '+  @Test',
      '+  void refusesAnEndBeforeTheStart() {',
      '+    var reversed = slot(at(11, 0), at(10, 0));',
      '+',
      '+    assertThatThrownBy(() -> service.book(reversed))',
      '+        .isInstanceOf(InvalidSlotException.class);',
      '+  }',
      '+',
      ' }'
    ])
  ],
  // feat(reservation): détecte les chevauchements
  [
    file('backend/src/main/java/demo/rooms/ReservationService.java', 'modified', [
      '@@ -12,6 +12,12 @@ class ReservationService {',
      '   }',
      ' ',
      '   Reservation book(NewReservation request) {',
      '-    return reservations.save(request.toReservation());',
      '+    boolean taken = reservations.existsOverlap(',
      '+        request.roomId(), request.startsAt(), request.endsAt());',
      '+    if (taken) {',
      '+      throw new RoomTakenException(request.roomId());',
      '+    }',
      '+    return reservations.save(request.toReservation());',
      '   }',
      ' }'
    ]),
    added('backend/src/main/java/demo/rooms/ReservationRepository.java', REPOSITORY),
    added('backend/src/test/java/demo/rooms/ReservationServiceTest.java', `package demo.rooms;

class ReservationServiceTest {

  @Test
  void acceptsSlotsThatTouch() {
    service.book(slot(at(10, 0), at(11, 0)));
    service.book(slot(at(11, 0), at(12, 0)));
  }

  @Test
  void refusesAnOverlapOfOneMinute() {
    service.book(slot(at(10, 0), at(11, 0)));
    var overlapping = slot(at(10, 59), at(12, 0));

    assertThatThrownBy(() -> service.book(overlapping))
        .isInstanceOf(RoomTakenException.class);
  }
}
`)
  ],
  // feat(reservation): ajoute le contrôleur REST
  [
    added('backend/src/main/java/demo/rooms/ReservationController.java'),
    added('backend/src/main/java/demo/rooms/NewReservation.java', NEW_RESERVATION)
  ],
  // feat(front): formulaire de réservation
  [
    added('frontend/src/app/reservation/reservation-form.ts'),
    added('frontend/src/app/reservation/reservation-form.html', FORM_HTML)
  ],
  // ci: lance les tests à chaque push
  [added('.github/workflows/ci.yml')],
  // docs: précise le lancement local
  [
    file('README.md', 'modified', [
      '@@ -1,3 +1,10 @@',
      ' # Réservation de salles',
      ' ',
      ' Application de réservation des salles de réunion.',
      '+',
      '+## Lancer le projet',
      '+',
      '+    docker compose up --build',
      '+',
      '+- Application : http://localhost:4200',
      '+- API : http://localhost:8081/api/reservations'
    ])
  ],
  // build: Dockerfile backend et frontend
  [
    added('backend/Dockerfile'),
    added('frontend/Dockerfile'),
    file('docker-compose.yml', 'modified', [
      '@@ -4,3 +4,11 @@ services:',
      '     environment:',
      '       POSTGRES_DB: rooms',
      '       POSTGRES_PASSWORD: ${DB_PASSWORD}',
      '+  backend:',
      '+    build: ./backend',
      '+    depends_on: [database]',
      '+    ports: ["8081:8081"]',
      '+  frontend:',
      '+    build: ./frontend',
      '+    depends_on: [backend]',
      '+    ports: ["4200:80"]'
    ])
  ],
  // feat(db): tables des salles et des réservations
  [added('backend/src/main/resources/schema.sql')],
  // chore: structure initiale du projet
  [
    added('README.md', INITIAL_README),
    added('docker-compose.yml', INITIAL_COMPOSE),
    added('.gitignore', 'node_modules/\ntarget/\n.env\n')
  ]
];
