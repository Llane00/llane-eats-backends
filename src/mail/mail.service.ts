import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { MailModuleOptions } from './mail.interface';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {
    // this.sendEmail('testing', 'this is a test.', 'bluetinestyle@126.com');
  }

  private async sendEmail(subject: string, content: string, to: string) {
    const form = new FormData();
    form.append('from', `Excited User <mailgun@${this.options.domain}>`);
    form.append('to', to);
    form.append('subject', subject);
    form.append('text', content);
    try {
      const response = await got(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          body: form,
        },
      );
      console.log(response.body);
    } catch (error) {
      console.log(error);
    }
  }
}
