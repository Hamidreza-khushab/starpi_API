'use strict';

/**
 * Custom routes for restaurant-app
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/restaurant-apps/my-restaurant/:restaurantId',
      handler: 'restaurant-app.getMyRestaurantApp',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/restaurant-apps/public/:restaurantId',
      handler: 'restaurant-app.getPublicAppInfo',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
  ],
};
