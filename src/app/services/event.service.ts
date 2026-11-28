import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '../firebase.client';
import {
  AttendanceResponse,
  AttendanceStatus,
  TeamEvent,
  TeamEventInput,
  isUpcoming,
} from '../models/team-event';
import { FirebaseAuthService } from './firebase-auth.service';
import { PlayerService } from './player.service';

/** Akce týmu: kolekce `events/{eventId}` sledovaná v reálném čase. */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly auth = inject(FirebaseAuthService);
  private readonly playerService = inject(PlayerService);
  private readonly eventsState = signal<TeamEvent[]>([]);
  private readonly initializedState = signal(false);
  private readonly errorState = signal('');
  private readonly owner = signal<string | null>(null);

  readonly initialized = computed(
    () => this.owner() === this.auth.userId() && this.initializedState(),
  );
  /** Všechny akce seřazené od nejstarší. */
  readonly events = computed(() => (this.initialized() ? this.eventsState() : []));
  readonly errorMessage = computed(() =>
    this.owner() === this.auth.userId() ? this.errorState() : '',
  );

  /** Nadcházející akce od nejbližší. */
  readonly upcoming = computed(() => this.events().filter((event) => isUpcoming(event)));
  /** Proběhlé akce od nejnovější. */
  readonly past = computed(() =>
    this.events()
      .filter((event) => !isUpcoming(event))
      .reverse(),
  );

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.userId();
      this.owner.set(uid);
      this.eventsState.set([]);
      this.initializedState.set(false);
      this.errorState.set('');

      if (uid !== null) {
        onCleanup(this.connect());
      }
    });
  }

  /**
   * Založí novou akci. ID vzniká v zařízení, takže stránka může hned přejít na detail.
   * `saved` se splní po potvrzení serverem; bez připojení až po jeho obnovení.
   */
  create(input: TeamEventInput): { id: string; saved: Promise<void> } {
    const uid = this.auth.userId();
    if (uid === null) {
      throw new Error('Uživatel není přihlášený.');
    }

    const event: TeamEvent = {
      ...input,
      id: crypto.randomUUID(),
      createdBy: uid,
      createdAt: new Date().toISOString(),
      responses: {},
    };

    return { id: event.id, saved: setDoc(doc(firestore, 'events', event.id), event) };
  }

  /** Upraví údaje akce; odpovědi hráčů zůstávají beze změny. */
  async update(id: string, input: TeamEventInput): Promise<void> {
    await updateDoc(doc(firestore, 'events', id), {
      type: input.type,
      title: input.title,
      place: input.place,
      city: input.city,
      startsAt: input.startsAt,
      note: input.note,
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'events', id));
  }

  /** Zapíše odpověď přihlášeného hráče; mění pouze jeho klíč v mapě `responses`. */
  async respond(eventId: string, status: AttendanceStatus): Promise<void> {
    const user = this.auth.user();
    if (user === null) {
      return;
    }

    const response: AttendanceResponse = {
      status,
      name: this.playerService.me()?.name || user.email || 'Hráč',
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(doc(firestore, 'events', eventId), {
      [`responses.${user.uid}`]: response,
    });
  }

  private connect(): () => void {
    const eventsQuery = query(collection(firestore, 'events'), orderBy('startsAt', 'asc'));

    return onSnapshot(
      eventsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((item) => {
          const data = item.data() as TeamEvent;
          return { ...data, responses: data.responses ?? {} };
        });
        this.eventsState.set(items);
        this.initializedState.set(true);
      },
      (error) => {
        console.error(error);
        this.errorState.set('Akce se nepodařilo načíst.');
        this.initializedState.set(true);
      },
    );
  }
}
