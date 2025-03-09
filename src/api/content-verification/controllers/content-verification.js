'use strict';

/**
 * content-verification controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::content-verification.content-verification', ({ strapi }) => ({
  // Override the default create method to set the submitter and restaurant
  async create(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to submit content for verification');
    }
    
    // Get the restaurant ID from the request body
    const { restaurant: restaurantId, contentType, contentId } = ctx.request.body.data;
    
    if (!restaurantId || !contentType || !contentId) {
      return ctx.badRequest('Restaurant ID, content type, and content ID are required');
    }
    
    // Check if the user has permission to submit content for this restaurant
    const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
      populate: ['owner'],
    });
    
    if (!restaurant) {
      return ctx.notFound('Restaurant not found');
    }
    
    const isAdmin = user.userType === 'admin';
    const isOwner = restaurant.owner && restaurant.owner.id === user.id;
    
    if (!isAdmin && !isOwner) {
      return ctx.forbidden('You can only submit content for your own restaurants');
    }
    
    // Get the content to create a snapshot
    let contentSnapshot = null;
    
    try {
      switch (contentType) {
        case 'menu-item':
          const menuItem = await strapi.entityService.findOne('api::menu-item.menu-item', contentId);
          if (!menuItem) {
            return ctx.notFound('Menu item not found');
          }
          contentSnapshot = menuItem;
          break;
        case 'restaurant-info':
          contentSnapshot = restaurant;
          break;
        // Add more content types as needed
        default:
          return ctx.badRequest(`Unsupported content type: ${contentType}`);
      }
    } catch (error) {
      return ctx.badRequest(`Error fetching content: ${error.message}`);
    }
    
    // Set the submitter and content snapshot
    ctx.request.body.data.submittedBy = user.id;
    ctx.request.body.data.contentSnapshot = contentSnapshot;
    ctx.request.body.data.status = 'pending';
    
    // Create the verification request
    const response = await super.create(ctx);
    
    // Send a notification to admins about the new verification request
    await strapi.service('api::notification.notification').sendToAdmins(
      'New Content Verification Request',
      `A new ${contentType} verification request has been submitted for restaurant "${restaurant.name}".`,
      {
        category: 'content-verification',
        actionUrl: `/admin/content-manager/collectionType/api::content-verification.content-verification/${response.data.id}`,
        priority: 'medium',
      }
    );
    
    return response;
  },
  
  // Override the default find method to filter by user's restaurants
  async find(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to access verification requests');
    }
    
    // If the user is an admin, they can see all verification requests
    if (user.userType === 'admin') {
      return super.find(ctx);
    }
    
    // For restaurant owners, only show their own verification requests
    // Get the user's restaurants
    const restaurants = await strapi.entityService.findMany('api::restaurant.restaurant', {
      filters: {
        owner: user.id,
      },
    });
    
    const restaurantIds = restaurants.map(restaurant => restaurant.id);
    
    // Add a filter to only return verification requests for the user's restaurants
    ctx.query.filters = {
      ...(ctx.query.filters || {}),
      restaurant: {
        $in: restaurantIds,
      },
    };
    
    // Call the default find method with the modified query
    const response = await super.find(ctx);
    
    return response;
  },
  
  // Custom method to approve a verification request
  async approve(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is an admin
    if (!user || user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can approve verification requests');
    }
    
    // Get the verification request
    const verification = await strapi.entityService.findOne('api::content-verification.content-verification', id, {
      populate: ['restaurant', 'restaurant.owner', 'submittedBy'],
    });
    
    if (!verification) {
      return ctx.notFound('Verification request not found');
    }
    
    if (verification.status !== 'pending') {
      return ctx.badRequest('This verification request has already been processed');
    }
    
    // Update the content based on the content type
    try {
      switch (verification.contentType) {
        case 'menu-item':
          // Publish the menu item
          await strapi.entityService.update('api::menu-item.menu-item', verification.contentId, {
            data: {
              publishedAt: new Date(),
            },
          });
          break;
        case 'restaurant-info':
          // No action needed for restaurant info, as it's already updated
          break;
        // Add more content types as needed
      }
    } catch (error) {
      return ctx.badRequest(`Error updating content: ${error.message}`);
    }
    
    // Update the verification request
    const updatedVerification = await strapi.entityService.update('api::content-verification.content-verification', id, {
      data: {
        status: 'approved',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
    
    // Send a notification to the submitter
    if (verification.submittedBy) {
      await strapi.service('api::notification.notification').sendToUser(
        'Content Verification Approved',
        `Your ${verification.contentType} verification request for restaurant "${verification.restaurant.name}" has been approved.`,
        verification.submittedBy.id,
        {
          category: 'content-verification',
          type: 'system',
          priority: 'medium',
          restaurantId: verification.restaurant.id,
        }
      );
    }
    
    return {
      data: updatedVerification,
    };
  },
  
  // Custom method to reject a verification request
  async reject(ctx) {
    const { id } = ctx.params;
    const { rejectionReason } = ctx.request.body;
    const user = ctx.state.user;
    
    // Check if the user is an admin
    if (!user || user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can reject verification requests');
    }
    
    // Get the verification request
    const verification = await strapi.entityService.findOne('api::content-verification.content-verification', id, {
      populate: ['restaurant', 'restaurant.owner', 'submittedBy'],
    });
    
    if (!verification) {
      return ctx.notFound('Verification request not found');
    }
    
    if (verification.status !== 'pending') {
      return ctx.badRequest('This verification request has already been processed');
    }
    
    // Update the verification request
    const updatedVerification = await strapi.entityService.update('api::content-verification.content-verification', id, {
      data: {
        status: 'rejected',
        reviewedBy: user.id,
        reviewedAt: new Date(),
        rejectionReason: rejectionReason || 'No reason provided',
      },
    });
    
    // Send a notification to the submitter
    if (verification.submittedBy) {
      await strapi.service('api::notification.notification').sendToUser(
        'Content Verification Rejected',
        `Your ${verification.contentType} verification request for restaurant "${verification.restaurant.name}" has been rejected. Reason: ${rejectionReason || 'No reason provided'}`,
        verification.submittedBy.id,
        {
          category: 'content-verification',
          type: 'system',
          priority: 'high',
          restaurantId: verification.restaurant.id,
        }
      );
    }
    
    return {
      data: updatedVerification,
    };
  },
  
  // Custom method to get pending verification requests count
  async getPendingCount(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is an admin
    if (!user || user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can access this endpoint');
    }
    
    // Count pending verification requests
    const count = await strapi.db.query('api::content-verification.content-verification').count({
      where: {
        status: 'pending',
      },
    });
    
    return { count };
  },
}));
