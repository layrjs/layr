import {Component, method, expose} from '@layr/component';
import fetch from 'cross-fetch';

const MAILER_LITE_API_URL = 'https://connect.mailerlite.com/api/';

const mailerLiteAPIKey = process.env.MAILER_LITE_API_KEY;

const mailerLiteNewsletterSubscriptionsGroupId =
  process.env.MAILER_LITE_NEWSLETTER_SUBSCRIPTIONS_GROUP_ID;

export class Newsletter extends Component {
  @expose({call: true}) @method() static async subscribe({email}: {email: string}) {
    if (!(mailerLiteAPIKey && mailerLiteNewsletterSubscriptionsGroupId)) {
      throw new Error('MailerLite configuration is missing');
    }

    const response = await fetch(`${MAILER_LITE_API_URL}subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${mailerLiteAPIKey}`,
        'X-Version': '2023-10-02'
      },
      body: JSON.stringify({
        email,
        groups: [mailerLiteNewsletterSubscriptionsGroupId],
        status: 'active'
      })
    });

    if (!(response.status === 201 || response.status === 200)) {
      throw new Error('An error occurred while adding a subscriber to MailerLite');
    }

    const result = await response.json();

    if (!result?.data?.id) {
      throw new Error('An error occurred while adding a subscriber to MailerLite');
    }

    console.log(`[NEWSLETTER] '${email}' subscribed`);
  }
}
