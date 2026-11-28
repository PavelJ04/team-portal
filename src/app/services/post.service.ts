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
import { Post, PostInput } from '../models/post';
import { FirebaseAuthService } from './firebase-auth.service';
import { PlayerService } from './player.service';

/** Nástěnka: kolekce `posts/{postId}` sledovaná v reálném čase, nejnovější příspěvky první. */
@Injectable({ providedIn: 'root' })
export class PostService {
  private readonly auth = inject(FirebaseAuthService);
  private readonly playerService = inject(PlayerService);
  private readonly postsState = signal<Post[]>([]);
  private readonly initializedState = signal(false);
  private readonly errorState = signal('');
  private readonly owner = signal<string | null>(null);

  readonly initialized = computed(
    () => this.owner() === this.auth.userId() && this.initializedState(),
  );
  readonly posts = computed(() => (this.initialized() ? this.postsState() : []));
  readonly errorMessage = computed(() =>
    this.owner() === this.auth.userId() ? this.errorState() : '',
  );

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.userId();
      this.owner.set(uid);
      this.postsState.set([]);
      this.initializedState.set(false);
      this.errorState.set('');

      if (uid !== null) {
        onCleanup(this.connect());
      }
    });
  }

  /** Založí příspěvek; vrací se hned, `saved` se splní po potvrzení serverem. */
  create(input: PostInput): { id: string; saved: Promise<void> } {
    const uid = this.auth.userId();
    if (uid === null) {
      throw new Error('Uživatel není přihlášený.');
    }

    const post: Post = {
      ...input,
      options: input.type === 'poll' ? input.options : [],
      id: crypto.randomUUID(),
      votes: {},
      authorName: this.playerService.me()?.name || 'Trenér',
      createdBy: uid,
      createdAt: new Date().toISOString(),
    };

    return { id: post.id, saved: setDoc(doc(firestore, 'posts', post.id), post) };
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'posts', id));
  }

  /** Zapíše hlas přihlášeného hráče; mění pouze jeho klíč v mapě `votes`. */
  async vote(postId: string, optionIndex: number): Promise<void> {
    const uid = this.auth.userId();
    if (uid === null) {
      return;
    }

    await updateDoc(doc(firestore, 'posts', postId), { [`votes.${uid}`]: optionIndex });
  }

  private connect(): () => void {
    const postsQuery = query(collection(firestore, 'posts'), orderBy('createdAt', 'desc'));

    return onSnapshot(
      postsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((item) => {
          const data = item.data() as Post;
          return { ...data, options: data.options ?? [], votes: data.votes ?? {} };
        });
        this.postsState.set(items);
        this.initializedState.set(true);
      },
      (error) => {
        console.error(error);
        this.errorState.set('Nástěnku se nepodařilo načíst.');
        this.initializedState.set(true);
      },
    );
  }
}
