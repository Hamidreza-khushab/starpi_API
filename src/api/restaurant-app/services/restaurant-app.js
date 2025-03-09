'use strict';

/**
 * restaurant-app service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::restaurant-app.restaurant-app');
