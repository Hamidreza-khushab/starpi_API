'use strict';

/**
 * Report controller
 * 
 * This controller provides endpoints for generating various reports.
 */

module.exports = {
  /**
   * Generate a sales report
   * @param {Object} ctx - Koa context
   */
  async salesReport(ctx) {
    try {
      const { restaurantId } = ctx.params;
      const { period, startDate, endDate, format, compareWithPrevious } = ctx.query;

      // Check if restaurant exists
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: {
          subscriptionPlan: true
        }
      });

      if (!restaurant) {
        return ctx.notFound('Restaurant not found');
      }

      // Check if user has permission to access this restaurant's data
      const { user } = ctx.state;
      if (!user.isAdmin && restaurant.owner?.id !== user.id) {
        return ctx.forbidden('You do not have permission to access this restaurant\'s data');
      }

      // Check if restaurant has access to advanced reports
      const hasAdvancedReports = restaurant.subscriptionPlan?.allowAdvancedReports || false;
      if (!hasAdvancedReports && (compareWithPrevious === 'true' || format === 'pdf' || format === 'excel')) {
        return ctx.forbidden('Advanced reporting features are not available in your current subscription plan');
      }

      // Generate sales report
      const salesService = strapi.service('api::services.reporting.sales');
      const report = await salesService.getSalesReport(restaurantId, {
        period,
        startDate,
        endDate,
        format: format || 'json',
        compareWithPrevious: compareWithPrevious === 'true'
      });

      // Return report
      return report;
    } catch (error) {
      strapi.log.error('Error generating sales report:', error);
      return ctx.badRequest('Error generating sales report');
    }
  },

  /**
   * Generate a customer report
   * @param {Object} ctx - Koa context
   */
  async customerReport(ctx) {
    try {
      const { restaurantId } = ctx.params;
      const { period, startDate, endDate, format } = ctx.query;

      // Check if restaurant exists
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
        populate: {
          subscriptionPlan: true
        }
      });

      if (!restaurant) {
        return ctx.notFound('Restaurant not found');
      }

      // Check if user has permission to access this restaurant's data
      const { user } = ctx.state;
      if (!user.isAdmin && restaurant.owner?.id !== user.id) {
        return ctx.forbidden('You do not have permission to access this restaurant\'s data');
      }

      // Check if restaurant has access to advanced reports
      const hasAdvancedReports = restaurant.subscriptionPlan?.allowAdvancedReports || false;
      if (!hasAdvancedReports && (format === 'pdf' || format === 'excel')) {
        return ctx.forbidden('Advanced reporting features are not available in your current subscription plan');
      }

      // Get orders for the restaurant in the date range
      const baseService = strapi.service('api::services.reporting.base');
      let { startDate: reportStartDate, endDate: reportEndDate } = startDate && endDate 
        ? { startDate: new Date(startDate), endDate: new Date(endDate) }
        : baseService.getDateRange(period || 'monthly');

      const orders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          restaurant: restaurantId,
          createdAt: {
            $gte: reportStartDate.toISOString(),
            $lte: reportEndDate.toISOString()
          },
          status: 'completed'
        },
        populate: {
          customer: true
        }
      });

      // Group orders by customer
      const customerOrders = {};
      orders.forEach(order => {
        const customerId = order.customer?.id;
        if (customerId) {
          if (!customerOrders[customerId]) {
            customerOrders[customerId] = {
              customer: {
                id: customerId,
                username: order.customer.username,
                email: order.customer.email
              },
              orders: [],
              totalSpent: 0,
              orderCount: 0
            };
          }
          
          customerOrders[customerId].orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            date: order.createdAt,
            amount: order.totalAmount
          });
          
          customerOrders[customerId].totalSpent += parseFloat(order.totalAmount || 0);
          customerOrders[customerId].orderCount += 1;
        }
      });

      // Convert to array and sort by total spent
      const customers = Object.values(customerOrders)
        .sort((a, b) => b.totalSpent - a.totalSpent);

      // Calculate average order value for each customer
      customers.forEach(customer => {
        customer.averageOrderValue = customer.orderCount > 0 
          ? customer.totalSpent / customer.orderCount 
          : 0;
      });

      // Prepare report data
      const reportData = {
        restaurantId,
        restaurantName: restaurant.name,
        period: period || 'monthly',
        startDate: reportStartDate.toISOString(),
        endDate: reportEndDate.toISOString(),
        customerCount: customers.length,
        customers: hasAdvancedReports 
          ? customers 
          : customers.map(({ customer, totalSpent, orderCount, averageOrderValue }) => ({
              customer, totalSpent, orderCount, averageOrderValue
            }))
      };

      // Format report according to requested format
      if (format === 'csv') {
        const csvRows = [
          'Customer ID,Username,Email,Total Spent,Order Count,Average Order Value'
        ];
        
        customers.forEach(({ customer, totalSpent, orderCount, averageOrderValue }) => {
          csvRows.push(`${customer.id},"${customer.username}","${customer.email}",${totalSpent},${orderCount},${averageOrderValue}`);
        });
        
        return csvRows.join('\n');
      }

      return reportData;
    } catch (error) {
      strapi.log.error('Error generating customer report:', error);
      return ctx.badRequest('Error generating customer report');
    }
  },

  /**
   * Generate a settlement report
   * @param {Object} ctx - Koa context
   */
  async settlementReport(ctx) {
    try {
      const { restaurantId } = ctx.params;
      const { startDate, endDate, format } = ctx.query;

      // Check if restaurant exists
      const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId);

      if (!restaurant) {
        return ctx.notFound('Restaurant not found');
      }

      // Check if user has permission to access this restaurant's data
      const { user } = ctx.state;
      if (!user.isAdmin && restaurant.owner?.id !== user.id) {
        return ctx.forbidden('You do not have permission to access this restaurant\'s data');
      }

      // Generate settlement report
      const paymentService = strapi.service('api::services.payment');
      const settlement = await paymentService.calculateRestaurantSettlement(restaurantId, {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      });

      // Format report according to requested format
      if (format === 'csv') {
        const csvRows = [
          'Restaurant ID,Restaurant Name,Start Date,End Date,Order Count,Total Order Amount,Platform Fee,Platform Fee Percentage,Restaurant Payout'
        ];
        
        csvRows.push(`${settlement.restaurantId},"${restaurant.name}","${settlement.period.startDate}","${settlement.period.endDate}",${settlement.orderCount},${settlement.totalOrderAmount},${settlement.platformFee},${settlement.platformFeePercentage},${settlement.restaurantPayout}`);
        
        return csvRows.join('\n');
      }

      return settlement;
    } catch (error) {
      strapi.log.error('Error generating settlement report:', error);
      return ctx.badRequest('Error generating settlement report');
    }
  }
};
