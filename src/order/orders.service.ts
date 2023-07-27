import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from 'src/restaurants/entities/restaurant.entity';
import { CreateOrderInput, CreateOrderOutput } from './dtos/create-order.dto';
import { User, UserRole } from 'src/users/entities/user.entity';
import { OrderItem } from './entities/order-item.entity';
import { Dish } from 'src/restaurants/entities/dish.entity';
import { GetOrdersInput, GetOrdersOutput } from './dtos/get-orders.dto';
import { GetOrderInput, GetOrderOutput } from './dtos/get-order.dto';
import { EditOrderInput, EditOrderOutput } from './dtos/edit-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { PubSub } from 'graphql-subscriptions';
import {
  NEW_COOKED_ORDER,
  NEW_ORDER_UPDATE,
  NEW_PENDING_ORDER,
  PUB_SUB,
} from 'src/common/common.constants';
import { TakeOrderInput, TakeOrderOutput } from './dtos/take-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
    @InjectRepository(Dish)
    private readonly dishes: Repository<Dish>,
    @Inject(PUB_SUB)
    private readonly pubSub: PubSub,
  ) {}

  async createOrder(
    customer: User,
    { restaurantId, items }: CreateOrderInput,
  ): Promise<CreateOrderOutput> {
    try {
      const restaurant = await this.restaurants.findOne(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          error: '未查询到该餐厅',
        };
      }
      let orderFinalPrice = 0;
      const orderItems: OrderItem[] = [];
      for (const item of items) {
        const dish = await this.dishes.findOne(item.dishId);
        if (!dish) {
          return {
            ok: false,
            error: '未查询到该菜品',
          };
        }
        let dishFinalPrice = dish.price;
        for (const itemOption of item?.options) {
          const dishOption = dish.options.find(
            (dishOption) => dishOption.name === itemOption.name,
          );
          if (dishOption) {
            if (dishOption.extra) {
              dishFinalPrice += dishOption.extra;
            }
            const dishOptionChoice = dishOption.choices.find(
              (optionChoice) => optionChoice.name === itemOption.choice,
            );
            if (dishOptionChoice?.extra) {
              dishFinalPrice += dishOptionChoice.extra;
            }
          }
        }
        orderFinalPrice += dishFinalPrice;
        const orderItem = await this.orderItems.save(
          this.orderItems.create({
            dish,
            options: item.options,
          }),
        );
        orderItems.push(orderItem);
      }
      const order = await this.orders.save(
        this.orders.create({
          customer,
          restaurant,
          total: orderFinalPrice,
          items: orderItems,
        }),
      );
      await this.pubSub.publish(NEW_PENDING_ORDER, {
        pendingOrders: { order },
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: '订单创建失败',
      };
    }
  }

  async getOrders(
    user: User,
    { status }: GetOrdersInput,
  ): Promise<GetOrdersOutput> {
    try {
      let orders: Order[];
      if (user.role === UserRole.Client) {
        orders = await this.orders.find({
          where: {
            customer: user,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Delivery) {
        orders = await this.orders.find({
          where: {
            driver: user,
            ...(status && { status }),
          },
        });
      } else if (user.role === UserRole.Owner) {
        const restaurants = await this.restaurants.find({
          where: {
            owner: user,
          },
          relations: ['orders'],
        });
        orders = restaurants.map((restaurant) => restaurant.orders).flat(1);
        if (status) {
          orders = orders.filter((order) => order.status === status);
        }
      }
      return {
        ok: true,
        orders,
      };
    } catch (error) {
      return {
        ok: false,
        error: '订单查询失败',
      };
    }
  }

  canSeeOrder(user: User, order: Order): boolean {
    let canSee = true;
    if (user.role === UserRole.Client && order.customerId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Delivery && order.driverId !== user.id) {
      canSee = false;
    }
    if (user.role === UserRole.Owner && order.restaurant.ownerId !== user.id) {
      canSee = false;
    }
    return canSee;
  }

  canEditOrder(user: User, status): boolean {
    let canEdit = true;
    if (user.role === UserRole.Client) {
      canEdit = false;
    }
    if (user.role === UserRole.Owner) {
      if (status !== OrderStatus.Cooking && status !== OrderStatus.Cooked) {
        canEdit = false;
      }
    }
    if (user.role === UserRole.Delivery) {
      if (status !== OrderStatus.PickedUp && status !== OrderStatus.Delivered) {
        canEdit = false;
      }
    }
    return canEdit;
  }

  async getOrder(
    user: User,
    { id: orderId }: GetOrderInput,
  ): Promise<GetOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) {
        return {
          ok: false,
          error: '未查询到该订单',
        };
      }
      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: '暂无权限',
        };
      }
      return {
        ok: true,
        order,
      };
    } catch (error) {
      return {
        ok: false,
        error: '订单查询失败',
      };
    }
  }

  async editOrder(
    user: User,
    { id: orderId, status }: EditOrderInput,
  ): Promise<EditOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId, {
        relations: ['restaurant'],
      });
      if (!order) {
        return {
          ok: false,
          error: '未查询到该订单',
        };
      }
      if (!this.canSeeOrder(user, order)) {
        return {
          ok: false,
          error: '暂无权限',
        };
      }
      const canEdit = this.canEditOrder(user, status);
      if (!canEdit) {
        return {
          ok: false,
          error: '暂无权限',
        };
      }
      await this.orders.save({
        id: orderId,
        status,
      });
      const newOrder = { ...order, status };
      if (user.role === UserRole.Owner) {
        if (status === OrderStatus.Cooked) {
          await this.pubSub.publish(NEW_COOKED_ORDER, {
            cookedOrders: newOrder,
          });
        }
      }
      await this.pubSub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: newOrder,
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: '订单修改失败',
      };
    }
  }

  async takeOrder(
    driver: User,
    { id: orderId }: TakeOrderInput,
  ): Promise<TakeOrderOutput> {
    try {
      const order = await this.orders.findOne(orderId);
      if (!order) {
        return {
          ok: false,
          error: '未查询到该订单',
        };
      }
      if (order.driver) {
        return {
          ok: false,
          error: '该订单已被接单',
        };
      }
      await this.orders.save({
        id: orderId,
        driver,
      });
      await this.pubSub.publish(NEW_ORDER_UPDATE, {
        orderUpdates: { ...order, driver },
      });
      return {
        ok: true,
      };
    } catch (error) {
      return {
        ok: false,
        error: '接单失败',
      };
    }
  }
}
