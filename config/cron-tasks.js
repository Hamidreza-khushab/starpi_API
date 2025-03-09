'use strict';

/**
 * Cron tasks configuration
 * 
 * This file registers all cron jobs for the application.
 */

const subscriptionRenewal = require('../src/api/cron/subscription-renewal');
const invoiceReminder = require('../src/api/cron/invoice-reminder');

module.exports = {
  /**
   * Subscription renewal cron job
   * Runs at 1:00 AM every day
   */
  subscriptionRenewal: {
    task: subscriptionRenewal.handler,
    options: {
      rule: subscriptionRenewal.cronTime
    }
  },
  
  /**
   * Invoice reminder cron job
   * Runs at 2:00 AM every day
   */
  invoiceReminder: {
    task: invoiceReminder.handler,
    options: {
      rule: invoiceReminder.cronTime
    }
  }
};
