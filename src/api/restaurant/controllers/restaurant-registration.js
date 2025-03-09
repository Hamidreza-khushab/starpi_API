'use strict';

/**
 * Restaurant registration controller
 */

const crypto = require('crypto');

module.exports = {
  /**
   * Handle restaurant registration requests from the manager website
   */
  async register(ctx) {
    try {
      const { body } = ctx.request;
      
      // Validate required fields
      const requiredFields = ['name', 'email', 'address', 'ownerFirstName', 'ownerLastName', 'ownerEmail', 'ownerPhone'];
      
      for (const field of requiredFields) {
        if (!body[field]) {
          return ctx.badRequest(`${field} is required`);
        }
      }
      
      // Check if the owner email is already registered
      const existingUser = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email: body.ownerEmail },
      });
      
      if (existingUser) {
        return ctx.badRequest('A user with this email already exists');
      }
      
      // Check if a restaurant with this email already exists
      const existingRestaurant = await strapi.db.query('api::restaurant.restaurant').findOne({
        where: { email: body.email },
      });
      
      if (existingRestaurant) {
        return ctx.badRequest('A restaurant with this email already exists');
      }
      
      // Generate a random password for the restaurant owner
      const password = crypto.randomBytes(8).toString('hex');
      
      // Create the restaurant owner user
      const user = await strapi.plugins['users-permissions'].services.user.add({
        username: body.ownerEmail.split('@')[0] + '-' + crypto.randomBytes(2).toString('hex'),
        email: body.ownerEmail,
        password,
        confirmed: true,
        blocked: false,
        firstName: body.ownerFirstName,
        lastName: body.ownerLastName,
        phoneNumber: body.ownerPhone,
        userType: 'restaurantOwner',
        isActive: true,
      });
      
      // Create the restaurant
      const restaurant = await strapi.entityService.create('api::restaurant.restaurant', {
        data: {
          name: body.name,
          email: body.email,
          address: body.address,
          phone: body.phone || null,
          website: body.website || null,
          description: body.description || null,
          isActive: false, // Pending approval
          owner: user.id,
          publishedAt: null, // Draft mode until approved
        },
      });
      
      // Generate a subdomain for the restaurant
      const subdomain = await this.generateSubdomain(body.name);
      
      // Store the subdomain in the restaurant's metadata
      await strapi.entityService.update('api::restaurant.restaurant', restaurant.id, {
        data: {
          socialMedia: {
            ...(restaurant.socialMedia || {}),
            subdomain,
          },
        },
      });
      
      // Send a notification to admins about the new restaurant registration
      await strapi.service('api::notification.notification').sendToAdmins(
        'New Restaurant Registration',
        `A new restaurant "${body.name}" has registered and is pending approval.`,
        {
          category: 'registration',
          actionUrl: `/admin/content-manager/collectionType/api::restaurant.restaurant/${restaurant.id}`,
          priority: 'high',
        }
      );
      
      // Send a welcome email to the restaurant owner with their credentials
      // TODO: Implement email sending functionality
      // This would typically use a service like SendGrid, Mailgun, etc.
      
      return {
        success: true,
        message: 'Restaurant registration successful. An admin will review your application shortly.',
        credentials: {
          email: body.ownerEmail,
          password, // Only returned once for initial setup
        },
        restaurant: {
          id: restaurant.id,
          name: restaurant.name,
          subdomain,
        },
      };
    } catch (error) {
      strapi.log.error('Restaurant registration error:', error);
      return ctx.badRequest('An error occurred during registration');
    }
  },
  
  /**
   * Generate a unique subdomain for a restaurant
   */
  async generateSubdomain(name) {
    // Convert the name to a URL-friendly string
    let subdomain = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric characters with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
      .replace(/^-|-$/g, ''); // Remove leading and trailing hyphens
    
    // Check if the subdomain is already in use
    const existingRestaurant = await strapi.db.query('api::restaurant.restaurant').findOne({
      where: {
        socialMedia: {
          $contains: { subdomain },
        },
      },
    });
    
    // If the subdomain is already in use, add a random suffix
    if (existingRestaurant) {
      const suffix = crypto.randomBytes(2).toString('hex');
      subdomain = `${subdomain}-${suffix}`;
    }
    
    return subdomain;
  },
  
  /**
   * Approve a restaurant registration
   */
  async approve(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // Check if the user is an admin
    if (!user || user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can approve restaurant registrations');
    }
    
    // Get the restaurant
    const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', id, {
      populate: ['owner'],
    });
    
    if (!restaurant) {
      return ctx.notFound('Restaurant not found');
    }
    
    // Update the restaurant status
    const updatedRestaurant = await strapi.entityService.update('api::restaurant.restaurant', id, {
      data: {
        isActive: true,
        publishedAt: new Date(),
      },
    });
    
    // Send a notification to the restaurant owner
    if (restaurant.owner) {
      await strapi.service('api::notification.notification').sendToUser(
        'Restaurant Approved',
        `Your restaurant "${restaurant.name}" has been approved and is now active.`,
        restaurant.owner.id,
        {
          category: 'registration',
          type: 'system',
          priority: 'high',
          restaurantId: restaurant.id,
        }
      );
      
      // TODO: Send an email to the restaurant owner
    }
    
    return {
      success: true,
      restaurant: updatedRestaurant,
    };
  },
  
  /**
   * Reject a restaurant registration
   */
  async reject(ctx) {
    const { id } = ctx.params;
    const { reason } = ctx.request.body;
    const user = ctx.state.user;
    
    // Check if the user is an admin
    if (!user || user.userType !== 'admin') {
      return ctx.forbidden('Only administrators can reject restaurant registrations');
    }
    
    // Get the restaurant
    const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', id, {
      populate: ['owner'],
    });
    
    if (!restaurant) {
      return ctx.notFound('Restaurant not found');
    }
    
    // Send a notification to the restaurant owner
    if (restaurant.owner) {
      await strapi.service('api::notification.notification').sendToUser(
        'Restaurant Registration Rejected',
        `Your restaurant "${restaurant.name}" registration has been rejected. Reason: ${reason || 'Not specified'}`,
        restaurant.owner.id,
        {
          category: 'registration',
          type: 'system',
          priority: 'high',
        }
      );
      
      // TODO: Send an email to the restaurant owner
    }
    
    // Delete the restaurant
    await strapi.entityService.delete('api::restaurant.restaurant', id);
    
    return {
      success: true,
      message: 'Restaurant registration rejected',
    };
  },
};
