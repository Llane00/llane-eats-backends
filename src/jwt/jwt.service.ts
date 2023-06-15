import { Inject, Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { jwtModuleOptions } from './jwt.interfaces';
import { CONFIG_OPTIONS } from './jwt.constans';

@Injectable()
export class JwtService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: jwtModuleOptions,
  ) {}

  sign(userId: number): string {
    return jwt.sign({ id: userId }, this.options.privateKey);
  }

  verify(token: string) {
    return jwt.verify(token, this.options.privateKey);
  }
}
