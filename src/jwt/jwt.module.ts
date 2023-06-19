import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { jwtModuleOptions } from './jwt.interfaces';
import { CONFIG_OPTIONS } from 'src/common/common.constants';

@Module({})
@Global()
export class JwtModule {
  static forRoot(options: jwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      providers: [
        {
          provide: CONFIG_OPTIONS,
          useValue: options,
        },
        JwtService,
      ],
      exports: [JwtService],
    };
  }
}
