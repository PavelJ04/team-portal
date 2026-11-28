import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { collection, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase.client';
import { Player, PlayerProfileInput, PlayerRole } from '../models/player';
import { FirebaseAuthService } from './firebase-auth.service';

/** Soupiska týmu: kolekce `players/{uid}` sledovaná v reálném čase. */
@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly auth = inject(FirebaseAuthService);
  private readonly playersState = signal<Player[]>([]);
  private readonly initializedState = signal(false);
  private readonly errorState = signal('');
  private readonly owner = signal<string | null>(null);

  readonly initialized = computed(
    () => this.owner() === this.auth.userId() && this.initializedState(),
  );
  readonly players = computed(() => (this.initialized() ? this.playersState() : []));
  readonly errorMessage = computed(() =>
    this.owner() === this.auth.userId() ? this.errorState() : '',
  );

  /** Profil přihlášeného uživatele; null, dokud ho nemá vytvořený. */
  readonly me = computed(
    () => this.players().find((player) => player.uid === this.auth.userId()) ?? null,
  );
  readonly isCoach = computed(() => this.me()?.role === 'coach');

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.userId();
      this.owner.set(uid);
      this.playersState.set([]);
      this.initializedState.set(false);
      this.errorState.set('');

      if (uid !== null) {
        onCleanup(this.connect());
      }
    });
  }

  async createProfile(
    uid: string,
    email: string,
    profile: PlayerProfileInput,
    role: PlayerRole,
  ): Promise<void> {
    const player: Player = {
      uid,
      email,
      name: profile.name,
      number: profile.number,
      position: profile.position,
      role,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(firestore, 'players', uid), player);
  }

  /** Uloží změny profilu; chybějící profil založí s rolí hráče. */
  async saveProfile(profile: PlayerProfileInput): Promise<void> {
    const user = this.auth.user();
    if (user === null) {
      return;
    }

    if (this.me() === null) {
      await this.createProfile(user.uid, user.email ?? '', profile, 'player');
      return;
    }

    await updateDoc(doc(firestore, 'players', user.uid), {
      name: profile.name,
      number: profile.number,
      position: profile.position,
    });
  }

  /** Uloží nebo odebere profilovou fotku přihlášeného hráče. */
  async savePhoto(photo: string | null): Promise<void> {
    const uid = this.auth.userId();
    if (uid === null || this.me() === null) {
      return;
    }

    await updateDoc(doc(firestore, 'players', uid), { photo });
  }

  private connect(): () => void {
    return onSnapshot(
      collection(firestore, 'players'),
      (snapshot) => {
        const items = snapshot.docs
          .map((item) => item.data() as Player)
          .sort((a, b) => a.name.localeCompare(b.name, 'cs'));
        this.playersState.set(items);
        this.initializedState.set(true);
      },
      (error) => {
        console.error(error);
        this.errorState.set('Soupisku se nepodařilo načíst.');
        this.initializedState.set(true);
      },
    );
  }
}
