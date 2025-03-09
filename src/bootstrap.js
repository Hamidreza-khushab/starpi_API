'use strict';

const seed = require('./seeds/seed');

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://docs.strapi.io/dev-docs/configurations/functions#bootstrap
 */

module.exports = async ({ strapi }) => {
  // Run the seed script
  await seed.seed(strapi);
};
