import {Component, method, expose} from '@liaison/component';
import fetch from 'cross-fetch';

const MAILER_LITE_API_URL = 'https://api.mailerlite.com/api/v2';

const mailerLiteAPIKey = process.env.MAILER_LITE_API_KEY;

const mailerLiteNewsletterSubscriptionsGroupId =
  process.env.MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID;

export class Newsletter extends Component {
  @expose({call: true}) @method() static async subscribe({email}: {email: string}) {
    if (!(mailerLiteAPIKey && mailerLiteNewsletterSubscriptionsGroupId)) {
      throw new Error('MailerLite configuration is missing');
    }

    const response = await fetch(
      `${MAILER_LITE_API_URL}/groups/${mailerLiteNewsletterSubscriptionsGroupId}/subscribers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MailerLite-ApiKey': mailerLiteAPIKey
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
