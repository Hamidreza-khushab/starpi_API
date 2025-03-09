'use strict';

/**
 * Custom routes for api-token
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/api-tokens/validate',
      handler: 'api-token.validate',
      config: {
        auth: false, // Public route, no authentication required
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/api-tokens/my-tokens',
      handler: 'api-token.listMyTokens',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/api-tokens/:id/revoke',
      handler: 'api-token.revoke',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
