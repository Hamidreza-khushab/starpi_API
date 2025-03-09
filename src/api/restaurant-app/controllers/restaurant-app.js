'use strict';

/**
 * restaurant-app controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::restaurant-app.restaurant-app', ({ strapi }) => ({
  // Extend the default create controller to associate the restaurant app with the authenticated restaurant owner
  async create(ctx) {
    // Get the authenticated user
    const user = ctx.state.user;
    
    // Check if the user is authenticated and is a restaurant owner
    if (!user || user.userType !== 'restaurantOwner') {
      return ctx.unauthorized('Only restaurant owners can create restaurant apps');
    }
    
    // Get the restaurant ID from the request body
    const { restaurant } = ctx.request.body.data;
    
    // Check if the restaurant exists and belongs to the authenticated user
    const restaurantEntity = await strapi.entityService.findOne('api::restaurant.restaurant', restaurant, {
      populate: ['owner'],
    });
    
    if (!restaurantEntity || restaurantEntity.owner.id !== user.id) {
      return ctx.unauthorized('You can only create apps for your own restaurants');
    }
    
    // Create the restaurant app
    const response = await super.create(ctx);
    
    return response;
  },
  
  // Extend the default update controller to ensure only the restaurant owner can update the app
  async update(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is authenticated and is a restaurant owner
    if (!user || user.userType !== 'restaurantOwner') {
      return ctx.unauthorized('Only restaurant owners can update restaurant apps');
    }
    
    // Check if the restaurant app exists and belongs to the authenticated user
    const restaurantApp = await strapi.entityService.findOne('api::restaurant-app.restaurant-app', id, {
      populate: ['restaurant.owner'],
    });
    
    if (!restaurantApp || restaurantApp.restaurant.owner.id !== user.id) {
      return ctx.unauthorized('You can only update apps for your own restaurants');
    }
    
    // Update the restaurant app
    const response = await super.update(ctx);
    
    return response;
  },
  
  // Custom controller to get the restaurant app for the authenticated user's restaurant
  async getMyRestaurantApp(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated and is a restaurant owner
    if (!user || user.userType !== 'restaurantOwner') {
      return ctx.unauthorized('Only restaurant owners can access restaurant apps');
    }
    
    // Get the restaurant ID from the query parameters
    const { restaurantId } = ctx.query;
    
    if (!restaurantId) {
      return ctx.badRequest('Restaurant ID is required');
    }
    
    // Check if the restaurant exists and belongs to the authenticated user
    const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
      populate: ['owner'],
    });
    
    if (!restaurant || restaurant.owner.id !== user.id) {
      return ctx.unauthorized('You can only access apps for your own restaurants');
    }
    
    // Get the restaurant app for the restaurant
    const restaurantApp = await strapi.entityService.findMany('api::restaurant-app.restaurant-app', {
      filters: {
        restaurant: restaurantId,
      },
      populate: ['appIcon', 'splashScreen', 'appScreenshots'],
    });
    
    return { data: restaurantApp };
  },
  
  // Custom controller to get the public information of a restaurant app
  async getPublicAppInfo(ctx) {
    const { restaurantId } = ctx.params;
    
    if (!restaurantId) {
      return ctx.badRequest('Restaurant ID is required');
    }
    
    // Get the restaurant app for the restaurant
    const restaurantApp = await strapi.entityService.findMany('api::restaurant-app.restaurant-app', {
      filters: {
        restaurant: restaurantId,
        isActive: true,
      },
      populate: ['appIcon', 'splashScreen'],
      fields: [
        'androidVersion', 
        'iosVersion', 
        'androidDownloadLink', 
        'iosDownloadLink', 
        'appDescription',
        'appFeatures',
        'minimumOsVersion',
        'brandingInfo'
      ],
    });
    
    if (!restaurantApp || restaurantApp.length === 0) {
      return ctx.notFound('Restaurant app not found or not active');
    }
    
    return { data: restaurantApp[0] };
  }
}));
