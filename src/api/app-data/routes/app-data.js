'use strict';

/**
 * App data routes
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/app-data/:restaurantId/initial',
      handler: 'app-data.getInitialData',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/app-data/:restaurantId/category/:categoryId',
      handler: 'app-data.getCategoryItems',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/app-data/:restaurantId/search',
      handler: 'app-data.searchMenuItems',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/app-data/:restaurantId/analytics',
      handler: 'app-data.getAnalyticsData',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
