import { Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore } from '../firebase.client';
import { Payment, PaymentInput, PaymentStatus, paymentStatus } from '../models/payment';
import { Player } from '../models/player';
import { localDateIso } from '../models/team-event';
import { FirebaseAuthService } from './firebase-auth.service';
import { PlayerService } from './player.service';

export interface MyPayment {
  payment: Payment;
  status: PaymentStatus;
}

/** Platby týmu: kolekce `payments/{paymentId}` sledovaná v reálném čase, seřazená podle splatnosti. */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly auth = inject(FirebaseAuthService);
  private readonly playerService = inject(PlayerService);
  private readonly paymentsState = signal<Payment[]>([]);
  private readonly initializedState = signal(false);
  private readonly errorState = signal('');
  private readonly owner = signal<string | null>(null);

  readonly initialized = computed(
    () => this.owner() === this.auth.userId() && this.initializedState(),
  );
  readonly payments = computed(() => (this.initialized() ? this.paymentsState() : []));
  readonly errorMessage = computed(() =>
    this.owner() === this.auth.userId() ? this.errorState() : '',
  );

  /** Hráči, kterým se platby předepisují (trenéři neplatí). */
  readonly payers = computed<Player[]>(() =>
    this.playerService.players().filter((player) => player.role === 'player'),
  );

  /** Platby přihlášeného hráče se stavem; trenér dostane prázdný seznam. */
  readonly mine = computed<MyPayment[]>(() => {
    const uid = this.auth.userId();
    if (uid === null || this.playerService.isCoach()) {
      return [];
    }

    const today = localDateIso(new Date());
    return this.payments().map((payment) => ({
      payment,
      status: paymentStatus(payment, uid, today),
    }));
  });

  /** Součet nezaplacených částek přihlášeného hráče. */
  readonly myDebt = computed(() =>
    this.mine()
      .filter((item) => item.status !== 'paid')
      .reduce((sum, item) => sum + item.payment.amount, 0),
  );

  constructor() {
    effect((onCleanup) => {
      const uid = this.auth.userId();
      this.owner.set(uid);
      this.paymentsState.set([]);
      this.initializedState.set(false);
      this.errorState.set('');

      if (uid !== null) {
        onCleanup(this.connect());
      }
    });
  }

  /** Počet hráčů, kteří danou platbu zaplatili. */
  paidCount(payment: Payment): number {
    return this.payers().filter((player) => player.uid in payment.paid).length;
  }

  create(input: PaymentInput): { id: string; saved: Promise<void> } {
    const uid = this.auth.userId();
    if (uid === null) {
      throw new Error('Uživatel není přihlášený.');
    }

    const payment: Payment = {
      ...input,
      id: crypto.randomUUID(),
      createdBy: uid,
      createdAt: new Date().toISOString(),
      paid: {},
    };

    return { id: payment.id, saved: setDoc(doc(firestore, 'payments', payment.id), payment) };
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(firestore, 'payments', id));
  }

  /** Trenér označí platbu hráče jako zaplacenou nebo to zruší. */
  async setPaid(paymentId: string, player: Player, paid: boolean): Promise<void> {
    await updateDoc(doc(firestore, 'payments', paymentId), {
      [`paid.${player.uid}`]: paid
        ? { name: player.name, paidAt: new Date().toISOString() }
        : deleteField(),
    });
  }

  private connect(): () => void {
    const paymentsQuery = query(collection(firestore, 'payments'), orderBy('dueDate', 'asc'));

    return onSnapshot(
      paymentsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((item) => {
          const data = item.data() as Payment;
          return { ...data, paid: data.paid ?? {} };
        });
        this.paymentsState.set(items);
        this.initializedState.set(true);
      },
      (error) => {
        console.error(error);
        this.errorState.set('Platby se nepodařilo načíst.');
        this.initializedState.set(true);
      },
    );
  }
}
