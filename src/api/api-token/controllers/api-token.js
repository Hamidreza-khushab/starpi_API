'use strict';

/**
 * api-token controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreController('api::api-token.api-token', ({ strapi }) => ({
  // Override the default create method to generate a secure token
  async create(ctx) {
    // Get the authenticated user
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to create API tokens');
    }
    
    // Check if the user has permission to create tokens of the specified type
    const { type, restaurant } = ctx.request.body.data;
    
    if (type === 'admin' && user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can create admin tokens');
    }
    
    if ((type === 'restaurant' || type === 'customer') && !restaurant) {
      return ctx.badRequest('Restaurant ID is required for restaurant and customer tokens');
    }
    
    // If creating a restaurant or customer token, check if the user owns the restaurant
    if ((type === 'restaurant' || type === 'customer') && user.userType !== 'admin') {
      const restaurantEntity = await strapi.entityService.findOne('api::restaurant.restaurant', restaurant, {
        populate: ['owner'],
      });
      
      if (!restaurantEntity || restaurantEntity.owner.id !== user.id) {
        return ctx.forbidden('You can only create tokens for your own restaurants');
      }
    }
    
    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Add the token and creator to the request body
    ctx.request.body.data.token = token;
    ctx.request.body.data.createdBy = user.id;
    
    // Create the token
    const response = await super.create(ctx);
    
    // Return the token value in the response (this is the only time it will be visible)
    return {
      ...response,
      token,
    };
  },
  
  // Custom method to revoke a token (set isActive to false)
  async revoke(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to revoke API tokens');
    }
    
    // Get the token
    const token = await strapi.entityService.findOne('api::api-token.api-token', id, {
      populate: ['createdBy', 'restaurant.owner'],
    });
    
    // Check if the token exists
    if (!token) {
      return ctx.notFound('Token not found');
    }
    
    // Check if the user has permission to revoke the token
    const canRevoke = 
      user.userType === 'admin' || 
      token.createdBy?.id === user.id || 
      (token.restaurant?.owner?.id === user.id);
    
    if (!canRevoke) {
      return ctx.forbidden('You do not have permission to revoke this token');
    }
    
    // Revoke the token
    await strapi.entityService.update('api::api-token.api-token', id, {
      data: {
        isActive: false,
      },
    });
    
    return { message: 'Token revoked successfully' };
  },
  
  // Custom method to validate a token
  async validate(ctx) {
    const { token } = ctx.request.body;
    
    if (!token) {
      return ctx.badRequest('Token is required');
    }
    
    // Find the token
    const tokens = await strapi.entityService.findMany('api::api-token.api-token', {
      filters: {
        token,
        isActive: true,
      },
      populate: ['restaurant'],
    });
    
    if (!tokens || tokens.length === 0) {
      return ctx.unauthorized('Invalid or inactive token');
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
      
      return ctx.unauthorized('Token has expired');
    }
    
    // Check IP restrictions if any
    if (apiToken.ipRestrictions && apiToken.ipRestrictions.length > 0) {
      const clientIp = ctx.request.ip;
      
      if (!apiToken.ipRestrictions.includes(clientIp)) {
        return ctx.forbidden('IP address not allowed');
      }
    }
    
    // Update the lastUsed timestamp
    await strapi.entityService.update('api::api-token.api-token', apiToken.id, {
      data: {
        lastUsed: new Date(),
      },
    });
    
    // Return token information (without the actual token value)
    return {
      valid: true,
      type: apiToken.type,
      restaurant: apiToken.restaurant ? apiToken.restaurant.id : null,
      permissions: apiToken.permissions,
    };
  },
  
  // Custom method to list tokens for the authenticated user
  async listMyTokens(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to list your API tokens');
    }
    
    // Get the user's tokens
    let filters = {
      createdBy: user.id,
    };
    
    // If the user is a restaurant owner, also include tokens for their restaurants
    if (user.userType === 'restaurantOwner') {
      // Get the user's restaurants
      const restaurants = await strapi.entityService.findMany('api::restaurant.restaurant', {
        filters: {
          owner: user.id,
        },
      });
      
      const restaurantIds = restaurants.map(restaurant => restaurant.id);
      
      if (restaurantIds.length > 0) {
        filters = {
          $or: [
            { createdBy: user.id },
            { restaurant: { $in: restaurantIds } },
          ],
        };
      }
    }
    
    // Get the tokens
    const tokens = await strapi.entityService.findMany('api::api-token.api-token', {
      filters,
      populate: ['restaurant'],
      fields: ['id', 'name', 'type', 'expiresAt', 'lastUsed', 'isActive', 'description'],
    });
    
    return { data: tokens };
  },
}));
