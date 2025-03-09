'use strict';

/**
 * content-verification service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::content-verification.content-verification');
