'use strict';

/**
 * notification service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::notification.notification', ({ strapi }) => ({
  // Send a notification to a specific user
  async sendToUser(title, message, recipientId, options = {}) {
    try {
      const {
        type = 'system',
        priority = 'medium',
        senderId = null,
        restaurantId = null,
        data = null,
        actionUrl = null,
        category = null,
        icon = null,
        expiresAt = null,
      } = options;
      
      // Create the notification
      const notification = await strapi.entityService.create('api::notification.notification', {
        data: {
          title,
          message,
          type,
          priority,
          sender: senderId,
          recipient: recipientId,
          restaurant: restaurantId,
          data,
          actionUrl,
          category,
          icon,
          expiresAt,
          status: 'unread',
        },
      });
      
      // TODO: Implement real-time notification delivery (e.g., WebSockets, Firebase Cloud Messaging)
      // This would be implemented based on the specific requirements and technologies used
      
      return notification;
    } catch (error) {
      strapi.log.error('Error sending notification:', error);
      throw error;
    }
  },
  
  // Send a notification to all users with a specific role
  async sendToRole(title, message, role, options = {}) {
    try {
      // Find all users with the specified role
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          role: {
            type: role,
          },
        },
      });
      
      // Send the notification to each user
      const notifications = await Promise.all(
        users.map(user => this.sendToUser(title, message, user.id, options))
      );
      
      return notifications;
    } catch (error) {
      strapi.log.error('Error sending notification to role:', error);
      throw error;
    }
  },
  
  // Send a notification to all users of a specific type
  async sendToUserType(title, message, userType, options = {}) {
    try {
      // Find all users with the specified type
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          userType,
        },
      });
      
      // Send the notification to each user
      const notifications = await Promise.all(
        users.map(user => this.sendToUser(title, message, user.id, options))
      );
      
      return notifications;
    } catch (error) {
      strapi.log.error('Error sending notification to user type:', error);
      throw error;
    }
  },
  
  // Send a notification to all restaurant owners
  async sendToRestaurantOwners(title, message, options = {}) {
    return this.sendToUserType(title, message, 'restaurantOwner', options);
  },
  
  // Send a notification to all customers
  async sendToCustomers(title, message, options = {}) {
    return this.sendToUserType(title, message, 'customer', options);
  },
  
  // Send a notification to all admins
  async sendToAdmins(title, message, options = {}) {
    return this.sendToUserType(title, message, 'admin', options);
  },
  
  // Send a notification to all users associated with a specific restaurant
  async sendToRestaurant(title, message, restaurantId, options = {}) {
    try {
      // Find the restaurant
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: ['owner'],
      });
      
      if (!restaurant) {
        throw new Error(`Restaurant with ID ${restaurantId} not found`);
      }
      
      // Set the restaurant ID in the options
      const notificationOptions = {
        ...options,
        restaurantId,
        type: 'restaurant',
      };
      
      // Send the notification to the restaurant owner
      const notification = await this.sendToUser(
        title,
        message,
        restaurant.owner.id,
        notificationOptions
      );
      
      return notification;
    } catch (error) {
      strapi.log.error('Error sending notification to restaurant:', error);
      throw error;
    }
  },
  
  // Send a notification to all customers of a specific restaurant
  async sendToRestaurantCustomers(title, message, restaurantId, options = {}) {
    try {
      // Find all orders for the restaurant to get the customers
      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          restaurant: restaurantId,
        },
        populate: ['customer'],
      });
      
      // Extract unique customer IDs
      const customerIds = [...new Set(
        orders
          .filter(order => order.customer)
          .map(order => order.customer.id)
      )];
      
      // Set the restaurant ID in the options
      const notificationOptions = {
        ...options,
        restaurantId,
        type: 'customer',
      };
      
      // Send the notification to each customer
      const notifications = await Promise.all(
        customerIds.map(customerId => 
          this.sendToUser(title, message, customerId, notificationOptions)
        )
      );
      
      return notifications;
    } catch (error) {
      strapi.log.error('Error sending notification to restaurant customers:', error);
      throw error;
    }
  },
}));
