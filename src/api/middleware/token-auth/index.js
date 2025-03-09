'use strict';

/**
 * Token authentication middleware
 * 
 * This middleware validates API tokens for protected routes.
 * It checks if a valid API token is provided in the request headers
 * and sets the appropriate context based on the token type.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Skip if the route is not protected by this middleware
    if (ctx.request.route.config && ctx.request.route.config.auth === false) {
      return next();
    }
    
    // Check if the token is provided in the headers
    const token = ctx.request.header['x-api-token'];
    
    if (!token) {
      // No token provided, continue to the next middleware
      // This allows routes to be protected by either JWT or API token
      return next();
    }
    
    try {
      // Validate the token
      const tokens = await strapi.entityService.findMany('api::api-token.api-token', {
        filters: {
          token,
          isActive: true,
        },
        populate: ['restaurant', 'restaurant.owner'],
      });
      
      if (!tokens || tokens.length === 0) {
        return ctx.unauthorized('Invalid or inactive API token');
      }
      
      const apiToken = tokens[0];
      
      // Check if the token has expired
      if (apiToken.expiresAt && new Date(apiToken.expiresAt) < new Date()) {
        // Deactivate the expired token
        await strapi.entityService.update('api::api-token.api-token', apiToken.id, {
          data: {
            isActive: false,
          },
        });
        
        return ctx.unauthorized('API token has expired');
      }
      
      // Check IP restrictions if any
      if (apiToken.ipRestrictions && apiToken.ipRestrictions.length > 0) {
        const clientIp = ctx.request.ip;
        
        if (!apiToken.ipRestrictions.includes(clientIp)) {
          return ctx.forbidden('IP address not allowed for this API token');
        }
      }
      
      // Update the lastUsed timestamp
      await strapi.entityService.update('api::api-token.api-token', apiToken.id, {
        data: {
          lastUsed: new Date(),
        },
      });
      
      // Set the token context based on the token type
      ctx.state.token = {
        id: apiToken.id,
        type: apiToken.type,
        permissions: apiToken.permissions || {},
      };
      
      // Set the restaurant context if applicable
      if (apiToken.restaurant) {
        ctx.state.restaurant = apiToken.restaurant;
      }
      
      // For restaurant and customer tokens, set a virtual user context
      if (apiToken.type === 'restaurant' && apiToken.restaurant && apiToken.restaurant.owner) {
        ctx.state.user = apiToken.restaurant.owner;
      } else if (apiToken.type === 'admin') {
        // For admin tokens, set a virtual admin user context
        // This is a simplified approach; in a real-world scenario, you might want to
        // associate admin tokens with specific admin users
        ctx.state.user = {
          id: 0,
          username: 'api-admin',
          email: 'api-admin@system',
          userType: 'admin',
        };
      }
      
      // Continue to the next middleware
      return next();
    } catch (error) {
      strapi.log.error('API token validation error:', error);
      return ctx.unauthorized('API token validation failed');
    }
  };
};
