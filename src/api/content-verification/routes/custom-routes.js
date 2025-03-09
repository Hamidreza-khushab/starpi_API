'use strict';

/**
 * Custom routes for content-verification
 */

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/content-verifications/:id/approve',
      handler: 'content-verification.approve',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/content-verifications/:id/reject',
      handler: 'content-verification.reject',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/content-verifications/pending-count',
      handler: 'content-verification.getPendingCount',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
