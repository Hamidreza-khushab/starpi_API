'use strict';

/**
 * Subscription renewal cron job
 * 
 * This cron job runs daily to check for subscriptions that need renewal
 * and processes automatic renewals for eligible subscriptions.
 */

module.exports = {
  /**
   * Cron job configuration
   * Runs at 1:00 AM every day
   */
  cronTime: '0 1 * * *',
  
  /**
   * Cron job handler
   * @param {Object} strapi - Strapi instance
   */
  async handler({ strapi }) {
    try {
      strapi.log.info('Running subscription renewal cron job');
      
      // Get current date
      const now = new Date();
      
      // Find subscriptions that need renewal (renewal date is today or in the past)
      const subscriptions = await strapi.entityService.findMany('api::subscription.subscription', {
        filters: {
          isActive: true,
          autoRenew: true,
          renewalDate: {
            $lte: now.toISOString()
          }
        },
        populate: {
          restaurant: {
            populate: {
              owner: true
            }
          },
          plan: true
        }
      });
      
      strapi.log.info(`Found ${subscriptions.length} subscriptions to renew`);
      
      // Process each subscription
      for (const subscription of subscriptions) {
        try {
          strapi.log.info(`Processing renewal for subscription ${subscription.id}`);
          
          // Get payment service
          const paymentService = strapi.service('api::payment.payment');
          
          // Process renewal
          await paymentService.processSubscriptionRenewal(subscription.id);
          
          strapi.log.info(`Successfully renewed subscription ${subscription.id}`);
        } catch (error) {
          strapi.log.error(`Error renewing subscription ${subscription.id}:`, error);
          
          // Send notification to restaurant owner about failed renewal
          try {
            // In a real implementation, this would send an email
            strapi.log.info(`Sending renewal failure notification to ${subscription.restaurant?.owner?.email}`);
          } catch (notificationError) {
            strapi.log.error('Error sending renewal failure notification:', notificationError);
          }
        }
      }
      
      strapi.log.info('Subscription renewal cron job completed');
    } catch (error) {
      strapi.log.error('Error in subscription renewal cron job:', error);
    }
  }
};
