import { Module } from '@nestjs/common';
import { PaymentResolver } from './payments.resolver';
import { PaymentService } from './payments.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Restaurant])],
  providers: [PaymentResolver, PaymentService],
})
export class PaymentsModule {}
