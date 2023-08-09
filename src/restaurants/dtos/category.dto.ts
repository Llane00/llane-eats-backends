import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Category } from '../entities/category.entity';
import {
  PaginationInput,
  PaginationOutput,
} from 'src/common/dtos/pagination.dto';
import { Restaurant } from '../entities/restaurant.entity';

@InputType()
export class CategoryInput extends PaginationInput {
  @Field((type) => String)
  slug: string;
}

@ObjectType()
export class CategoryOutput extends PaginationOutput {
  @Field((type) => Category, { nullable: true })
  category?: Category;

  @Field((type) => [Restaurant], { nullable: true, defaultValue: [] })
  restaurants?: Restaurant[];
}
