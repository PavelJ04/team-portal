import { Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';

/** Krátké zprávy pro uživatele (ion-toast). */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly toastController = inject(ToastController);

  async success(message: string): Promise<void> {
    await this.show(message, 'success');
  }

  async error(message: string): Promise<void> {
    await this.show(message, 'danger');
  }

  private async show(message: string, color: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2500,
      position: 'bottom',
    });

    await toast.present();
  }
}
