'use strict';

/**
 * notification controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::notification.notification', ({ strapi }) => ({
  // Override the default find method to only return notifications for the authenticated user
  async find(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to access notifications');
    }
    
    // Add a filter to only return notifications for the authenticated user
    ctx.query.filters = {
      ...(ctx.query.filters || {}),
      recipient: user.id,
    };
    
    // Call the default find method with the modified query
    const response = await super.find(ctx);
    
    return response;
  },
  
  // Custom method to mark a notification as read
  async markAsRead(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to mark notifications as read');
    }
    
    // Get the notification
    const notification = await strapi.entityService.findOne('api::notification.notification', id, {
      populate: ['recipient'],
    });
    
    // Check if the notification exists and belongs to the authenticated user
    if (!notification || notification.recipient?.id !== user.id) {
      return ctx.forbidden('You can only mark your own notifications as read');
    }
    
    // Update the notification
    const updatedNotification = await strapi.entityService.update('api::notification.notification', id, {
      data: {
        status: 'read',
        readAt: new Date(),
      },
    });
    
    return { data: updatedNotification };
  },
  
  // Custom method to mark all notifications as read
  async markAllAsRead(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to mark notifications as read');
    }
    
    // Get all unread notifications for the user
    const notifications = await strapi.entityService.findMany('api::notification.notification', {
      filters: {
        recipient: user.id,
        status: 'unread',
      },
    });
    
    // Update all notifications
    const now = new Date();
    const updatePromises = notifications.map(notification => 
      strapi.entityService.update('api::notification.notification', notification.id, {
        data: {
          status: 'read',
          readAt: now,
        },
      })
    );
    
    await Promise.all(updatePromises);
    
    return { message: `Marked ${notifications.length} notifications as read` };
  },
  
  // Custom method to archive a notification
  async archive(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to archive notifications');
    }
    
    // Get the notification
    const notification = await strapi.entityService.findOne('api::notification.notification', id, {
      populate: ['recipient'],
    });
    
    // Check if the notification exists and belongs to the authenticated user
    if (!notification || notification.recipient?.id !== user.id) {
      return ctx.forbidden('You can only archive your own notifications');
    }
    
    // Update the notification
    const updatedNotification = await strapi.entityService.update('api::notification.notification', id, {
      data: {
        status: 'archived',
      },
    });
    
    return { data: updatedNotification };
  },
  
  // Custom method to get unread notification count
  async getUnreadCount(ctx) {
    const user = ctx.state.user;
    
    // Check if the user is authenticated
    if (!user) {
      return ctx.unauthorized('You must be logged in to access notifications');
    }
    
    // Count unread notifications
    const count = await strapi.db.query('api::notification.notification').count({
      where: {
        recipient: user.id,
        status: 'unread',
      },
    });
    
    return { count };
  },
}));
