import { Test } from '@nestjs/testing';
import got from 'got';
import * as FormData from 'form-data';
import { MailService } from './mail.service';
import { throwError } from 'rxjs';

jest.mock('got');
jest.mock('form-data');

const TEST_DOMAIN = 'test-domain';

describe('mail', () => {
  let service: MailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: 'CONFIG_OPTIONS',
          useValue: {
            apiKey: 'test-apiKey',
            domain: TEST_DOMAIN,
            fromEmail: 'test-fromEamil',
          },
        },
      ],
    }).compile();
    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should call sendEmail', () => {
      const sendVerificationEmailArgs = {
        email: 'email',
        code: 'code',
      };
      jest.spyOn(service, 'sendEmail').mockImplementation(async () => true);
      service.sendVerificationEmail(
        sendVerificationEmailArgs.email,
        sendVerificationEmailArgs.code,
      );
      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith({
        to: sendVerificationEmailArgs.email,
        subject: '账户邮箱验证',
        template: '账户邮箱验证',
        emailVars: [
          { key: 'username', value: sendVerificationEmailArgs.email },
          { key: 'code', value: sendVerificationEmailArgs.code },
        ],
      });
    });
  });

  describe('sendEmail', () => {
    it('sends email', async () => {
      const ok = await service.sendEmail({
        to: 'user1@mail.com',
        subject: 'test',
        template: '账户邮箱验证',
        emailVars: [
          { key: 'username', value: '' },
          { key: 'code', value: '' },
        ],
      });
      const formSpy = jest.spyOn(FormData.prototype, 'append');
      expect(formSpy).toHaveBeenCalledTimes(6);
      expect(got.post).toHaveBeenCalledTimes(1);
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object),
      );
      expect(ok).toEqual(true);
    });

    it('fails on error', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error();
      });
      const ok = await service.sendEmail({
        to: 'user1@mail.com',
        subject: 'test',
        template: '账户邮箱验证',
        emailVars: [
          { key: 'username', value: '' },
          { key: 'code', value: '' },
        ],
      });
      expect(ok).toEqual(false);
    });
  });
});
