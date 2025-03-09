'use strict';

/**
 * api-token service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::api-token.api-token');
