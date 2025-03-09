'use strict';

/**
 * Restaurant registration routes
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/restaurants/register',
      handler: 'restaurant-registration.register',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/restaurants/:id/approve',
      handler: 'restaurant-registration.approve',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/restaurants/:id/reject',
      handler: 'restaurant-registration.reject',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
