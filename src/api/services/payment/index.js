'use strict';

/**
 * Payment service
 * 
 * This service provides functionality for managing payments.
 */

module.exports = ({ strapi }) => ({
  /**
   * Process a payment
   * @param {Object} paymentData - Payment data
   * @param {String} gateway - Payment gateway (paypal, visa, mastercard)
   * @returns {Promise<Object>} - Payment result
   */
  async processPayment(paymentData, gateway = 'paypal') {
    try {
      // Validate payment data
      this.validatePaymentData(paymentData);
      
      // Process payment based on gateway
      let result;
      switch (gateway.toLowerCase()) {
        case 'paypal':
          result = await this.processPaypalPayment(paymentData);
          break;
        case 'visa':
          result = await this.processVisaPayment(paymentData);
          break;
        case 'mastercard':
          result = await this.processMastercardPayment(paymentData);
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${gateway}`);
      }
      
      // Record transaction
      await this.recordTransaction({
        ...paymentData,
        gateway,
        status: result.success ? 'completed' : 'failed',
        transactionId: result.transactionId,
        response: result
      });
      
      return result;
    } catch (error) {
      strapi.log.error('Payment processing error:', error);
      
      // Record failed transaction
      await this.recordTransaction({
        ...paymentData,
        gateway,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  },
  
  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   */
  validatePaymentData(paymentData) {
    const { amount, currency, description } = paymentData;
    
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      throw new Error('Invalid payment amount');
    }
    
    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      throw new Error('Invalid currency code');
    }
    
    if (!description || typeof description !== 'string') {
      throw new Error('Payment description is required');
    }
  },
  
  /**
   * Process PayPal payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment result
   */
  async processPaypalPayment(paymentData) {
    // In a real implementation, this would use the PayPal SDK
    // This is a placeholder for demonstration
    
    const { amount, currency, description } = paymentData;
    
    // Get PayPal API credentials from environment variables
    const apiKey = process.env.PAYPAL_API_KEY;
    const apiSecret = process.env.PAYPAL_API_SECRET;
    
    if (!apiKey || !apiSecret) {
      throw new Error('PayPal API credentials not configured');
    }
    
    // Simulate API call to PayPal
    // In a real implementation, this would use the PayPal SDK
    strapi.log.info(`Processing PayPal payment: ${amount} ${currency} for "${description}"`);
    
    // Simulate successful payment
    return {
      success: true,
      transactionId: `PP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString(),
      amount,
      currency,
      fee: (parseFloat(amount) * 0.029 + 0.30).toFixed(2), // PayPal standard fee
      details: {
        status: 'COMPLETED',
        paymentMethod: 'paypal',
        payerEmail: paymentData.email || 'customer@example.com'
      }
    };
  },
  
  /**
   * Process Visa payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment result
   */
  async processVisaPayment(paymentData) {
    // In a real implementation, this would use a payment processor SDK
    // This is a placeholder for demonstration
    
    const { amount, currency, description } = paymentData;
    
    // Get Visa API credentials from environment variables
    const apiKey = process.env.VISA_API_KEY;
    
    if (!apiKey) {
      throw new Error('Visa API credentials not configured');
    }
    
    // Simulate API call to Visa
    strapi.log.info(`Processing Visa payment: ${amount} ${currency} for "${description}"`);
    
    // Simulate successful payment
    return {
      success: true,
      transactionId: `VISA-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString(),
      amount,
      currency,
      fee: (parseFloat(amount) * 0.025 + 0.25).toFixed(2), // Example fee
      details: {
        status: 'approved',
        paymentMethod: 'visa',
        last4: paymentData.cardLast4 || '4242'
      }
    };
  },
  
  /**
   * Process Mastercard payment
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} - Payment result
   */
  async processMastercardPayment(paymentData) {
    // In a real implementation, this would use a payment processor SDK
    // This is a placeholder for demonstration
    
    const { amount, currency, description } = paymentData;
    
    // Get Mastercard API credentials from environment variables
    const apiKey = process.env.MASTERCARD_API_KEY;
    
    if (!apiKey) {
      throw new Error('Mastercard API credentials not configured');
    }
    
    // Simulate API call to Mastercard
    strapi.log.info(`Processing Mastercard payment: ${amount} ${currency} for "${description}"`);
    
    // Simulate successful payment
    return {
      success: true,
      transactionId: `MC-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString(),
      amount,
      currency,
      fee: (parseFloat(amount) * 0.027 + 0.30).toFixed(2), // Example fee
      details: {
        status: 'approved',
        paymentMethod: 'mastercard',
        last4: paymentData.cardLast4 || '5555'
      }
    };
  },
  
  /**
   * Record a transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Recorded transaction
   */
  async recordTransaction(transactionData) {
    try {
      // Create transaction record
      const transaction = await strapi.entityService.create('api::transaction.transaction', {
        data: {
          amount: transactionData.amount,
          currency: transactionData.currency,
          status: transactionData.status,
          gateway: transactionData.gateway,
          transactionId: transactionData.transactionId || null,
          description: transactionData.description,
          metadata: {
            response: transactionData.response || null,
            error: transactionData.error || null
          },
          restaurant: transactionData.restaurantId || null,
          subscription: transactionData.subscriptionId || null,
          order: transactionData.orderId || null,
          publishedAt: new Date()
        }
      });
      
      return transaction;
    } catch (error) {
      strapi.log.error('Error recording transaction:', error);
      // Don't throw here, as this is a secondary operation
      return null;
    }
  },
  
  /**
   * Generate an invoice
   * @param {Object} data - Invoice data
   * @returns {Promise<Object>} - Generated invoice
   */
  async generateInvoice(data) {
    try {
      const { 
        restaurantId, 
        subscriptionId, 
        orderId, 
        amount, 
        items = [], 
        customer = {} 
      } = data;
      
      // Generate invoice number
      const invoiceNumber = this.generateInvoiceNumber();
      
      // Create invoice record
      const invoice = await strapi.entityService.create('api::invoice.invoice', {
        data: {
          invoiceNumber,
          amount,
          status: 'issued',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          items,
          customer,
          restaurant: restaurantId || null,
          subscription: subscriptionId || null,
          order: orderId || null,
          publishedAt: new Date()
        }
      });
      
      // Send invoice email (in a real implementation)
      // await this.sendInvoiceEmail(invoice);
      
      return invoice;
    } catch (error) {
      strapi.log.error('Error generating invoice:', error);
      throw error;
    }
  },
  
  /**
   * Generate a unique invoice number
   * @returns {String} - Invoice number
   */
  generateInvoiceNumber() {
    const prefix = 'INV';
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp.substr(-6)}-${random}`;
  },
  
  /**
   * Process subscription renewal
   * @param {Number} subscriptionId - Subscription ID
   * @returns {Promise<Object>} - Renewal result
   */
  async processSubscriptionRenewal(subscriptionId) {
    try {
      // Get subscription
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
      
      if (!subscription.autoRenew) {
        throw new Error(`Subscription ${subscriptionId} is not set for auto-renewal`);
      }
      
      // Check if subscription is active
      if (!subscription.isActive) {
        throw new Error(`Cannot renew inactive subscription: ${subscriptionId}`);
      }
      
      // Get payment method
      const paymentMethod = subscription.paymentMethod;
      
      // Process payment
      const paymentResult = await this.processPayment({
        amount: subscription.amount,
        currency: 'USD', // Assuming USD as default
        description: `Subscription renewal for ${subscription.restaurant?.name || 'restaurant'} - ${subscription.plan?.name || 'plan'}`,
        restaurantId: subscription.restaurant?.id,
        subscriptionId: subscription.id,
        email: subscription.restaurant?.owner?.email
      }, paymentMethod);
      
      if (!paymentResult.success) {
        throw new Error(`Payment failed for subscription renewal: ${subscriptionId}`);
      }
      
      // Calculate new dates
      const currentEndDate = new Date(subscription.endDate);
      const newStartDate = new Date(currentEndDate);
      newStartDate.setDate(newStartDate.getDate() + 1);
      
      const newEndDate = new Date(newStartDate);
      newEndDate.setMonth(newEndDate.getMonth() + 1); // Assuming monthly subscription
      
      const newRenewalDate = new Date(newEndDate);
      newRenewalDate.setDate(newRenewalDate.getDate() - 7); // 7 days before end date
      
      // Update subscription
      const updatedSubscription = await strapi.entityService.update('api::subscription.subscription', subscriptionId, {
        data: {
          startDate: newStartDate,
          endDate: newEndDate,
          renewalDate: newRenewalDate,
          paymentStatus: 'paid',
          paymentHistory: [
            ...(subscription.paymentHistory || []),
            {
              date: new Date(),
              amount: subscription.amount,
              transactionId: paymentResult.transactionId,
              status: 'paid'
            }
          ]
        }
      });
      
      // Generate invoice
      await this.generateInvoice({
        restaurantId: subscription.restaurant?.id,
        subscriptionId: subscription.id,
        amount: subscription.amount,
        items: [
          {
            description: `Subscription renewal: ${subscription.plan?.name || 'plan'}`,
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
      
      return {
        success: true,
        subscription: updatedSubscription,
        payment: paymentResult
      };
    } catch (error) {
      strapi.log.error('Subscription renewal error:', error);
      
      // Update subscription status if payment failed
      if (error.message.includes('Payment failed')) {
        try {
          const failedSubscription = await strapi.entityService.findOne('api::subscription.subscription', subscriptionId);
          
          if (failedSubscription) {
            await strapi.entityService.update('api::subscription.subscription', subscriptionId, {
              data: {
                paymentStatus: 'failed',
                paymentHistory: [
                  ...(failedSubscription.paymentHistory || []),
                  {
                    date: new Date(),
                    amount: failedSubscription.amount,
                    status: 'failed',
                    error: error.message
                  }
                ]
              }
            });
          }
        } catch (updateError) {
          strapi.log.error('Error updating subscription after payment failure:', updateError);
        }
      }
      
      throw error;
    }
  },
  
  /**
   * Calculate restaurant settlement
   * @param {Number} restaurantId - Restaurant ID
   * @param {Object} options - Options
   * @returns {Promise<Object>} - Settlement calculation
   */
  async calculateRestaurantSettlement(restaurantId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      platformFeePercentage = 0.15 // 15% platform fee
    } = options;
    
    try {
      // Get completed orders for the restaurant in the date range
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          restaurant: restaurantId,
          createdAt: {
            $gte: startDate.toISOString(),
            $lte: endDate.toISOString()
          },
          status: 'completed',
          paymentStatus: 'paid'
        }
      });
      
      // Calculate total order amount
      const totalOrderAmount = orders.reduce((sum, order) => sum + parseFloat(order.totalAmount || 0), 0);
      
      // Calculate platform fee
      const platformFee = totalOrderAmount * platformFeePercentage;
      
      // Calculate restaurant payout
      const restaurantPayout = totalOrderAmount - platformFee;
      
      return {
        restaurantId,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        orderCount: orders.length,
        totalOrderAmount,
        platformFee,
        platformFeePercentage,
        restaurantPayout,
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          date: order.createdAt,
          amount: order.totalAmount
        }))
      };
    } catch (error) {
      strapi.log.error('Error calculating restaurant settlement:', error);
      throw error;
    }
  }
});
