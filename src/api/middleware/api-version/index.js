'use strict';

/**
 * API version middleware
 * 
 * This middleware handles API versioning to ensure backward compatibility
 * with different versions of mobile apps and admin panels.
 * 
 * It reads the version from the X-API-Version header and adjusts the response
 * based on the requested version.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Get the requested API version from the header
    const requestedVersion = ctx.request.header['x-api-version'];
    
    // If no version is specified, use the latest version
    if (!requestedVersion) {
      // Store the current version in the context for later use
      ctx.state.apiVersion = 'latest';
      return next();
    }
    
    // Store the requested version in the context for later use
    ctx.state.apiVersion = requestedVersion;
    
    // Continue to the next middleware
    await next();
    
    // After the response is generated, transform it if needed based on the version
    if (ctx.body && ctx.body.data) {
      try {
        // Apply version-specific transformations to the response
        ctx.body.data = transformResponseForVersion(ctx.body.data, requestedVersion, ctx.request.url);
      } catch (error) {
        strapi.log.error('Error transforming response for version:', error);
      }
    }
  };
};

/**
 * Transform the response data based on the requested API version
 * 
 * @param {Object} data - The response data
 * @param {String} version - The requested API version
 * @param {String} url - The request URL
 * @returns {Object} - The transformed response data
 */
function transformResponseForVersion(data, version, url) {
  // Handle array responses
  if (Array.isArray(data)) {
    return data.map(item => transformResponseForVersion(item, version, url));
  }
  
  // Skip transformation for non-object data
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Clone the data to avoid modifying the original
  const transformedData = { ...data };
  
  // Apply version-specific transformations
  switch (version) {
    case '1.0':
      // Example: In version 1.0, some fields might have different names or formats
      if (url.includes('/menu-items')) {
        // Rename 'price' to 'cost' for backward compatibility
        if ('price' in transformedData) {
          transformedData.cost = transformedData.price;
          delete transformedData.price;
        }
        
        // Remove fields that didn't exist in version 1.0
        delete transformedData.allergens;
        delete transformedData.nutritionalInfo;
      }
      
      if (url.includes('/restaurants')) {
        // Remove fields that didn't exist in version 1.0
        delete transformedData.socialMedia;
        delete transformedData.termsAndConditions;
      }
      break;
      
    case '1.1':
      // Example: In version 1.1, some fields might have different formats
      if (url.includes('/orders')) {
        // Convert new status format to old format for backward compatibility
        if (transformedData.status === 'preparing') {
          transformedData.status = 'in_progress';
        }
      }
      break;
      
    // Add more version cases as needed
    
    default:
      // For the latest version or unknown versions, return the data as is
      break;
  }
  
  return transformedData;
}
