import got from 'got';
import * as FormData from 'form-data';
import { Inject, Injectable } from '@nestjs/common';
import { EmailVar, MailModuleOptions } from './mail.interface';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModuleOptions,
  ) {}

  async sendEmail(data: {
    to: string;
    subject: string;
    template?: string;
    emailVars?: EmailVar[];
  }): Promise<boolean> {
    const { subject, to, template, emailVars } = data;
    const form = new FormData();
    form.append(
      'from',
      `Support from bigfish <mailgun@${this.options.domain}>`,
    );
    form.append('to', to);
    form.append('subject', subject);
    form.append('template', template);
    emailVars &&
      emailVars.forEach((eVar) => form.append(`v:${eVar.key}`, eVar.value));
    try {
      const response = await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`,
            ).toString('base64')}`,
          },
          body: form,
        },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail({
      to: email,
      subject: '账户邮箱验证',
      template: '账户邮箱验证',
      emailVars: [
        { key: 'username', value: email },
        { key: 'code', value: code },
      ],
    });
  }
}
