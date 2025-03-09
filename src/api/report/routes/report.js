'use strict';

/**
 * Report router
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/reports/sales/:restaurantId',
      handler: 'report.salesReport',
      config: {
        policies: [],
        description: 'Generate a sales report for a restaurant',
        tag: {
          plugin: 'reports',
          name: 'Sales Report'
        }
      }
    },
    {
      method: 'GET',
      path: '/reports/customers/:restaurantId',
      handler: 'report.customerReport',
      config: {
        policies: [],
        description: 'Generate a customer report for a restaurant',
        tag: {
          plugin: 'reports',
          name: 'Customer Report'
        }
      }
    },
    {
      method: 'GET',
      path: '/reports/settlement/:restaurantId',
      handler: 'report.settlementReport',
      config: {
        policies: [],
        description: 'Generate a settlement report for a restaurant',
        tag: {
          plugin: 'reports',
          name: 'Settlement Report'
        }
      }
    }
  ]
};
