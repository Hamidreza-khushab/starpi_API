'use strict';

/**
 * Plan restrictions middleware
 * 
 * This middleware checks if the restaurant has the necessary permissions
 * based on its subscription plan before allowing certain operations.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Skip if it's an admin request
    if (ctx.state.isAuthenticatedAdmin) {
      return await next();
    }

    // Get the restaurant ID from the request
    const restaurantId = ctx.request.body?.data?.restaurant || 
                         ctx.params?.restaurant || 
                         ctx.query?.restaurant;

    if (!restaurantId) {
      return await next();
    }

    try {
      // Get the restaurant with its subscription plan
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: {
          subscriptionPlan: true,
          menuItems: {
            fields: ['id']
          },
          images: {
            fields: ['id']
          },
          videos: {
            fields: ['id']
          }
        }
      });

      if (!restaurant || !restaurant.subscriptionPlan) {
        return ctx.badRequest('Restaurant or subscription plan not found');
      }

      const plan = restaurant.subscriptionPlan;
      const path = ctx.request.path;
      const method = ctx.request.method;

      // Check menu items limit
      if (path.includes('/menu-items') && method === 'POST') {
        const currentMenuItemsCount = restaurant.menuItems?.length || 0;
        if (currentMenuItemsCount >= plan.maxMenuItems) {
          return ctx.badRequest(`You have reached the maximum number of menu items (${plan.maxMenuItems}) allowed in your subscription plan.`);
        }
      }

      // Check images limit
      if (path.includes('/upload') && ctx.request.files?.files) {
        const files = Array.isArray(ctx.request.files.files) 
          ? ctx.request.files.files 
          : [ctx.request.files.files];
        
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length > 0) {
          const currentImagesCount = restaurant.images?.length || 0;
          if (currentImagesCount + imageFiles.length > plan.maxImages) {
            return ctx.badRequest(`You have reached the maximum number of images (${plan.maxImages}) allowed in your subscription plan.`);
          }
        }
      }

      // Check videos limit
      if (path.includes('/upload') && ctx.request.files?.files) {
        const files = Array.isArray(ctx.request.files.files) 
          ? ctx.request.files.files 
          : [ctx.request.files.files];
        
        const videoFiles = files.filter(file => file.type.startsWith('video/'));
        
        if (videoFiles.length > 0) {
          const currentVideosCount = restaurant.videos?.length || 0;
          if (currentVideosCount + videoFiles.length > plan.maxVideos) {
            return ctx.badRequest(`You have reached the maximum number of videos (${plan.maxVideos}) allowed in your subscription plan.`);
          }
        }
      }

      // Check description length
      if ((path.includes('/restaurants') || path.includes('/menu-items')) && 
          (method === 'POST' || method === 'PUT') && 
          ctx.request.body?.data?.description) {
        
        const description = ctx.request.body.data.description;
        // Remove HTML tags for accurate character count
        const plainText = description.replace(/<[^>]*>/g, '');
        
        if (plainText.length > plan.maxDescriptionLength) {
          return ctx.badRequest(`Description exceeds the maximum length (${plan.maxDescriptionLength} characters) allowed in your subscription plan.`);
        }
      }

      // Check feature permissions
      
      // Reviews
      if (path.includes('/reviews') && method === 'POST' && !plan.allowReviews) {
        return ctx.forbidden('Reviews are not available in your current subscription plan.');
      }

      // Discounts
      if (path.includes('/discounts') && !plan.allowDiscounts) {
        return ctx.forbidden('Discounts are not available in your current subscription plan.');
      }

      // Live Chat
      if (path.includes('/chats') && !plan.allowLiveChat) {
        return ctx.forbidden('Live chat is not available in your current subscription plan.');
      }

      // Additional Languages
      if ((path.includes('/restaurants') || path.includes('/menu-items')) && 
          (method === 'POST' || method === 'PUT') && 
          ctx.request.body?.data?.locale && 
          ctx.request.body.data.locale !== 'en' && 
          !plan.allowAdditionalLanguages) {
        return ctx.forbidden('Additional languages are not available in your current subscription plan.');
      }

      // Continue to the next middleware or controller
      return await next();
    } catch (error) {
      strapi.log.error('Error in plan restrictions middleware:', error);
      return ctx.badRequest('An error occurred while checking plan restrictions');
    }
  };
};
