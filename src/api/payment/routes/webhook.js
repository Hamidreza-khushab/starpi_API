'use strict';

/**
 * Payment webhook router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/payment/webhooks/paypal',
      handler: 'webhook.paypal',
      config: {
        auth: false, // No authentication for webhooks
        description: 'Handle PayPal webhook',
        tag: {
          plugin: 'payment',
          name: 'PayPal Webhook'
        }
      }
    },
    {
      method: 'POST',
      path: '/payment/webhooks/visa',
      handler: 'webhook.visa',
      config: {
        auth: false, // No authentication for webhooks
        description: 'Handle Visa webhook',
        tag: {
          plugin: 'payment',
          name: 'Visa Webhook'
        }
      }
    },
    {
      method: 'POST',
      path: '/payment/webhooks/mastercard',
      handler: 'webhook.mastercard',
      config: {
        auth: false, // No authentication for webhooks
        description: 'Handle Mastercard webhook',
        tag: {
          plugin: 'payment',
          name: 'Mastercard Webhook'
        }
      }
    }
  ]
};
