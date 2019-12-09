import {Registerable, property} from '@liaison/liaison';

export class Newsletter extends Registerable() {
  @property({expose: {call: true}}) static async subscribe({email}) {
    console.log(`[NEWSLETTER_SUBSCRIPTION] ${email}`);
  }
}
