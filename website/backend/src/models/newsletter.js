import {Registerable, property} from '@liaison/liaison';
import fetch from 'cross-fetch';

import {MAILER_LITE_API_KEY, MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID} from '../environment';

const MAILER_LITE_API_URL = 'https://api.mailerlite.com/api/v2';

export class Newsletter extends Registerable() {
  @property({expose: {call: true}}) static async subscribe({email}) {
    if (!(MAILER_LITE_API_KEY && MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID)) {
      throw new Error('MailerLite configuration is missing');
    }

    const response = await fetch(
      `${MAILER_LITE_API_URL}/groups/${MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': MAILER_LITE_API_KEY
        },
        body: JSON.stringify({email, resubscribe: true, type: 'active'})
      }
    );

    if (response.status !== 200) {
      throw new Error('An error occurred while adding a subscriber to MailerLite');
    }

    const result = await response.json();

    if (!result.id) {
      throw new Error('An error occurred while adding a subscriber to MailerLite');
    }

    console.log(`[NEWSLETTER] '${email}' subscribed`);
  }
}
