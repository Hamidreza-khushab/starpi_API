'use strict';

/**
 * Payment webhook controller
 * 
 * This controller handles webhooks from payment gateways.
 */

module.exports = {
  /**
   * Handle PayPal webhook
   * @param {Object} ctx - Koa context
   */
  async paypal(ctx) {
    try {
      const { body } = ctx.request;
      const eventType = body.event_type;
      
      strapi.log.info(`Received PayPal webhook: ${eventType}`);
      
      // Verify webhook signature (in a real implementation)
      // const isValid = await verifyPayPalWebhookSignature(ctx.request);
      // if (!isValid) {
      //   return ctx.unauthorized('Invalid webhook signature');
      // }
      
      // Process webhook based on event type
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCompleted(body, 'paypal');
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentFailed(body, 'paypal');
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentRefunded(body, 'paypal');
          break;
        default:
          strapi.log.info(`Unhandled PayPal webhook event: ${eventType}`);
      }
      
      return { success: true };
    } catch (error) {
      strapi.log.error('Error processing PayPal webhook:', error);
      return ctx.badRequest('Error processing webhook');
    }
  },
  
  /**
   * Handle Visa webhook
   * @param {Object} ctx - Koa context
   */
  async visa(ctx) {
    try {
      const { body } = ctx.request;
      const eventType = body.type;
      
      strapi.log.info(`Received Visa webhook: ${eventType}`);
      
      // Verify webhook signature (in a real implementation)
      // const isValid = await verifyVisaWebhookSignature(ctx.request);
      // if (!isValid) {
      //   return ctx.unauthorized('Invalid webhook signature');
      // }
      
      // Process webhook based on event type
      switch (eventType) {
        case 'payment_intent.succeeded':
          await this.handlePaymentCompleted(body, 'visa');
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(body, 'visa');
          break;
        case 'charge.refunded':
          await this.handlePaymentRefunded(body, 'visa');
          break;
        default:
          strapi.log.info(`Unhandled Visa webhook event: ${eventType}`);
      }
      
      return { success: true };
    } catch (error) {
      strapi.log.error('Error processing Visa webhook:', error);
      return ctx.badRequest('Error processing webhook');
    }
  },
  
  /**
   * Handle Mastercard webhook
   * @param {Object} ctx - Koa context
   */
  async mastercard(ctx) {
    try {
      const { body } = ctx.request;
      const eventType = body.type;
      
      strapi.log.info(`Received Mastercard webhook: ${eventType}`);
      
      // Verify webhook signature (in a real implementation)
      // const isValid = await verifyMastercardWebhookSignature(ctx.request);
      // if (!isValid) {
      //   return ctx.unauthorized('Invalid webhook signature');
      // }
      
      // Process webhook based on event type
      switch (eventType) {
        case 'payment.completed':
          await this.handlePaymentCompleted(body, 'mastercard');
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(body, 'mastercard');
          break;
        case 'payment.refunded':
          await this.handlePaymentRefunded(body, 'mastercard');
          break;
        default:
          strapi.log.info(`Unhandled Mastercard webhook event: ${eventType}`);
      }
      
      return { success: true };
    } catch (error) {
      strapi.log.error('Error processing Mastercard webhook:', error);
      return ctx.badRequest('Error processing webhook');
    }
  },
  
  /**
   * Handle payment completed webhook
   * @param {Object} data - Webhook data
   * @param {String} gateway - Payment gateway
   */
  async handlePaymentCompleted(data, gateway) {
    try {
      // Extract transaction ID based on gateway
      let transactionId;
      let metadata = {};
      
      switch (gateway) {
        case 'paypal':
          transactionId = data.resource.id;
          metadata = data.resource.custom_id ? JSON.parse(data.resource.custom_id) : {};
          break;
        case 'visa':
          transactionId = data.data.object.id;
          metadata = data.data.object.metadata || {};
          break;
        case 'mastercard':
          transactionId = data.id;
          metadata = data.metadata || {};
          break;
      }
      
      if (!transactionId) {
        throw new Error('Transaction ID not found in webhook data');
      }
      
      // Find transaction in database
      const transaction = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: {
          transactionId
        }
      });
      
      if (transaction && transaction.length > 0) {
        // Update transaction status
        await strapi.entityService.update('api::transaction.transaction', transaction[0].id, {
          data: {
            status: 'completed'
          }
        });
        
        // Update order or subscription based on metadata
        if (metadata.orderId) {
          await this.updateOrderPaymentStatus(metadata.orderId, 'paid');
        } else if (metadata.subscriptionId) {
          await this.updateSubscriptionPaymentStatus(metadata.subscriptionId, 'paid');
        }
      } else {
        strapi.log.warn(`Transaction not found for ID: ${transactionId}`);
      }
    } catch (error) {
      strapi.log.error('Error handling payment completed webhook:', error);
      throw error;
    }
  },
  
  /**
   * Handle payment failed webhook
   * @param {Object} data - Webhook data
   * @param {String} gateway - Payment gateway
   */
  async handlePaymentFailed(data, gateway) {
    try {
      // Extract transaction ID based on gateway
      let transactionId;
      let metadata = {};
      
      switch (gateway) {
        case 'paypal':
          transactionId = data.resource.id;
          metadata = data.resource.custom_id ? JSON.parse(data.resource.custom_id) : {};
          break;
        case 'visa':
          transactionId = data.data.object.id;
          metadata = data.data.object.metadata || {};
          break;
        case 'mastercard':
          transactionId = data.id;
          metadata = data.metadata || {};
          break;
      }
      
      if (!transactionId) {
        throw new Error('Transaction ID not found in webhook data');
      }
      
      // Find transaction in database
      const transaction = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: {
          transactionId
        }
      });
      
      if (transaction && transaction.length > 0) {
        // Update transaction status
        await strapi.entityService.update('api::transaction.transaction', transaction[0].id, {
          data: {
            status: 'failed'
          }
        });
        
        // Update order or subscription based on metadata
        if (metadata.orderId) {
          await this.updateOrderPaymentStatus(metadata.orderId, 'failed');
        } else if (metadata.subscriptionId) {
          await this.updateSubscriptionPaymentStatus(metadata.subscriptionId, 'failed');
        }
      } else {
        strapi.log.warn(`Transaction not found for ID: ${transactionId}`);
      }
    } catch (error) {
      strapi.log.error('Error handling payment failed webhook:', error);
      throw error;
    }
  },
  
  /**
   * Handle payment refunded webhook
   * @param {Object} data - Webhook data
   * @param {String} gateway - Payment gateway
   */
  async handlePaymentRefunded(data, gateway) {
    try {
      // Extract transaction ID based on gateway
      let transactionId;
      let metadata = {};
      
      switch (gateway) {
        case 'paypal':
          transactionId = data.resource.id;
          metadata = data.resource.custom_id ? JSON.parse(data.resource.custom_id) : {};
          break;
        case 'visa':
          transactionId = data.data.object.id;
          metadata = data.data.object.metadata || {};
          break;
        case 'mastercard':
          transactionId = data.id;
          metadata = data.metadata || {};
          break;
      }
      
      if (!transactionId) {
        throw new Error('Transaction ID not found in webhook data');
      }
      
      // Find transaction in database
      const transaction = await strapi.entityService.findMany('api::transaction.transaction', {
        filters: {
          transactionId
        }
      });
      
      if (transaction && transaction.length > 0) {
        // Update transaction status
        await strapi.entityService.update('api::transaction.transaction', transaction[0].id, {
          data: {
            status: 'refunded'
          }
        });
        
        // Update order or subscription based on metadata
        if (metadata.orderId) {
          await this.updateOrderPaymentStatus(metadata.orderId, 'refunded');
        }
      } else {
        strapi.log.warn(`Transaction not found for ID: ${transactionId}`);
      }
    } catch (error) {
      strapi.log.error('Error handling payment refunded webhook:', error);
      throw error;
    }
  },
  
  /**
   * Update order payment status
   * @param {Number} orderId - Order ID
   * @param {String} status - Payment status
   */
  async updateOrderPaymentStatus(orderId, status) {
    try {
      await strapi.entityService.update('api::order.order', orderId, {
        data: {
          paymentStatus: status
        }
      });
      
      // If payment is successful, generate invoice
      if (status === 'paid') {
        const order = await strapi.entityService.findOne('api::order.order', orderId, {
          populate: {
            restaurant: true,
            customer: true
          }
        });
        
        if (order) {
          const paymentService = strapi.service('api::payment.payment');
          await paymentService.generateInvoice({
            restaurantId: order.restaurant?.id,
            orderId: order.id,
            amount: order.totalAmount,
            items: order.items.map(item => ({
              description: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              total: item.quantity * item.price
            })),
            customer: {
              name: order.customer?.username || 'Customer',
              email: order.customer?.email,
              address: order.deliveryAddress
            }
          });
        }
      }
    } catch (error) {
      strapi.log.error(`Error updating order payment status: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Update subscription payment status
   * @param {Number} subscriptionId - Subscription ID
   * @param {String} status - Payment status
   */
  async updateSubscriptionPaymentStatus(subscriptionId, status) {
    try {
      const subscription = await strapi.entityService.findOne('api::subscription.subscription', subscriptionId, {
        populate: {
          restaurant: {
            populate: {
              owner: true
            }
          },
          plan: true
        }
      });
      
      if (!subscription) {
        throw new Error(`Subscription not found: ${subscriptionId}`);
      }
      
      // Update subscription payment status
      await strapi.entityService.update('api::subscription.subscription', subscriptionId, {
        data: {
          paymentStatus: status,
          paymentHistory: [
            ...(subscription.paymentHistory || []),
            {
              date: new Date(),
              amount: subscription.amount,
              status
            }
          ]
        }
      });
      
      // If payment is successful, generate invoice
      if (status === 'paid') {
        const paymentService = strapi.service('api::payment.payment');
        await paymentService.generateInvoice({
          restaurantId: subscription.restaurant?.id,
          subscriptionId: subscription.id,
          amount: subscription.amount,
          items: [
            {
              description: `Subscription: ${subscription.plan?.name || 'plan'}`,
              quantity: 1,
              unitPrice: subscription.amount,
              total: subscription.amount
            }
          ],
          customer: {
            name: subscription.restaurant?.name || 'Restaurant',
            email: subscription.restaurant?.owner?.email,
            address: subscription.restaurant?.address
          }
        });
      }
    } catch (error) {
      strapi.log.error(`Error updating subscription payment status: ${error.message}`);
      throw error;
    }
  }
};
