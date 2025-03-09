'use strict';

/**
 * App data controller
 * 
 * This controller provides combined data for the customer app,
 * optimizing data transfer by bundling multiple API calls into one.
 */

module.exports = {
  /**
   * Get all necessary data for the customer app's initial load
   * This reduces the number of API calls needed by the app
   */
  async getInitialData(ctx) {
    try {
      const { restaurantId } = ctx.params;
      
      if (!restaurantId) {
        return ctx.badRequest('Restaurant ID is required');
      }
      
      // Get the restaurant
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: ['logo', 'images'],
      });
      
      if (!restaurant) {
        return ctx.notFound('Restaurant not found');
      }
      
      if (!restaurant.isActive) {
        return ctx.forbidden('This restaurant is not active');
      }
      
      // Get the restaurant app information
      const restaurantApps = await strapi.entityService.findMany('api::restaurant-app.restaurant-app', {
        filters: {
          restaurant: restaurantId,
          isActive: true,
        },
        populate: ['appIcon', 'splashScreen'],
      });
      
      const restaurantApp = restaurantApps.length > 0 ? restaurantApps[0] : null;
      
      // Get the menu categories
      const menuCategories = await strapi.entityService.findMany('api::menu-category.menu-category', {
        filters: {
          restaurant: restaurantId,
          isActive: true,
        },
        sort: { order: 'asc' },
      });
      
      // Get featured menu items
      const featuredMenuItems = await strapi.entityService.findMany('api::menu-item.menu-item', {
        filters: {
          restaurant: restaurantId,
          isFeatured: true,
          isActive: true,
        },
        populate: ['images', 'category'],
        limit: 10,
      });
      
      // Get active discounts
      const now = new Date();
      const discounts = await strapi.entityService.findMany('api::discount.discount', {
        filters: {
          restaurant: restaurantId,
          isActive: true,
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
      });
      
      // Get restaurant information pages
      const pages = await strapi.entityService.findMany('api::page.page', {
        filters: {
          restaurant: restaurantId,
          isActive: true,
        },
        fields: ['id', 'title', 'slug', 'order'],
        sort: { order: 'asc' },
      });
      
      // Record this app access for analytics
      await this.recordAppAccess(restaurantId, ctx);
      
      // Return the combined data
      return {
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          description: restaurant.description,
          address: restaurant.address,
          phone: restaurant.phone,
          email: restaurant.email,
          website: restaurant.website,
          openingHours: restaurant.openingHours,
          logo: restaurant.logo,
          images: restaurant.images,
          location: restaurant.location,
        },
        app: restaurantApp ? {
          brandingInfo: restaurantApp.brandingInfo,
          androidVersion: restaurantApp.androidVersion,
          iosVersion: restaurantApp.iosVersion,
          appIcon: restaurantApp.appIcon,
          splashScreen: restaurantApp.splashScreen,
        } : null,
        menuCategories,
        featuredItems: featuredMenuItems,
        discounts,
        pages,
      };
    } catch (error) {
      strapi.log.error('Error fetching initial app data:', error);
      return ctx.badRequest('An error occurred while fetching data');
    }
  },
  
  /**
   * Get menu items for a specific category
   */
  async getCategoryItems(ctx) {
    try {
      const { restaurantId, categoryId } = ctx.params;
      const { page = 1, pageSize = 20 } = ctx.query;
      
      if (!restaurantId || !categoryId) {
        return ctx.badRequest('Restaurant ID and category ID are required');
      }
      
      // Get the menu items
      const menuItems = await strapi.entityService.findMany('api::menu-item.menu-item', {
        filters: {
          restaurant: restaurantId,
          category: categoryId,
          isActive: true,
        },
        populate: ['images'],
        sort: { order: 'asc' },
        start: (page - 1) * pageSize,
        limit: pageSize,
      });
      
      // Get the total count
      const total = await strapi.db.query('api::menu-item.menu-item').count({
        where: {
          restaurant: restaurantId,
          category: categoryId,
          isActive: true,
        },
      });
      
      return {
        data: menuItems,
        meta: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching category items:', error);
      return ctx.badRequest('An error occurred while fetching data');
    }
  },
  
  /**
   * Search menu items
   */
  async searchMenuItems(ctx) {
    try {
      const { restaurantId } = ctx.params;
      const { query, page = 1, pageSize = 20 } = ctx.query;
      
      if (!restaurantId || !query) {
        return ctx.badRequest('Restaurant ID and search query are required');
      }
      
      // Search the menu items
      const menuItems = await strapi.entityService.findMany('api::menu-item.menu-item', {
        filters: {
          restaurant: restaurantId,
          isActive: true,
          $or: [
            { name: { $containsi: query } },
            { description: { $containsi: query } },
          ],
        },
        populate: ['images', 'category'],
        start: (page - 1) * pageSize,
        limit: pageSize,
      });
      
      // Get the total count
      const total = await strapi.db.query('api::menu-item.menu-item').count({
        where: {
          restaurant: restaurantId,
          isActive: true,
          $or: [
            { name: { $containsi: query } },
            { description: { $containsi: query } },
          ],
        },
      });
      
      return {
        data: menuItems,
        meta: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    } catch (error) {
      strapi.log.error('Error searching menu items:', error);
      return ctx.badRequest('An error occurred while searching');
    }
  },
  
  /**
   * Get analytics data for the restaurant dashboard
   */
  async getAnalyticsData(ctx) {
    try {
      const { restaurantId } = ctx.params;
      const user = ctx.state.user;
      
      // Check if the user is authenticated and has access to this restaurant
      if (!user) {
        return ctx.unauthorized('You must be logged in to access analytics data');
      }
      
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: ['owner'],
      });
      
      if (!restaurant) {
        return ctx.notFound('Restaurant not found');
      }
      
      const isAdmin = user.userType === 'admin';
      const isOwner = restaurant.owner && restaurant.owner.id === user.id;
      
      if (!isAdmin && !isOwner) {
        return ctx.forbidden('You do not have access to this restaurant\'s analytics');
      }
      
      // Get the date range from the query parameters
      const { startDate, endDate } = ctx.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
      const end = endDate ? new Date(endDate) : new Date();
      
      // Get the analytics data from the reporting service
      const analyticsData = await strapi.service('api::reporting.reporting').getRestaurantAnalytics(
        restaurantId,
        start,
        end
      );
      
      return analyticsData;
    } catch (error) {
      strapi.log.error('Error fetching analytics data:', error);
      return ctx.badRequest('An error occurred while fetching analytics data');
    }
  },
  
  /**
   * Record app access for analytics
   * @private
   */
  async recordAppAccess(restaurantId, ctx) {
    try {
      // Get client information
      const userAgent = ctx.request.header['user-agent'] || 'Unknown';
      const ip = ctx.request.ip;
      const platform = this.detectPlatform(userAgent);
      
      // Record the access in the database
      // This could be a separate collection or a more sophisticated analytics system
      // For now, we'll just log it
      strapi.log.info(`App access: Restaurant ${restaurantId}, Platform: ${platform}, IP: ${ip}`);
      
      // In a real implementation, you would store this data for analytics
      // await strapi.entityService.create('api::app-access.app-access', {
      //   data: {
      //     restaurant: restaurantId,
      //     userAgent,
      //     ip,
      //     platform,
      //     accessTime: new Date(),
      //   },
      // });
    } catch (error) {
      // Just log the error, don't interrupt the main flow
      strapi.log.error('Error recording app access:', error);
    }
  },
  
  /**
   * Detect the platform from the user agent
   * @private
   */
  detectPlatform(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Android')) {
      return 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) {
      return 'iOS';
    } else if (userAgent.includes('Windows')) {
      return 'Windows';
    } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
      return 'Mac';
    } else if (userAgent.includes('Linux')) {
      return 'Linux';
    } else {
      return 'Other';
    }
  },
};
