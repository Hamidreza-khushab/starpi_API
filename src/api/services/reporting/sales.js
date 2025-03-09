'use strict';

/**
 * Sales reporting service
 * 
 * This service provides functionality for generating sales reports.
 */

const baseService = require('./base');

module.exports = ({ strapi }) => ({
  ...baseService({ strapi }),

  /**
   * Get sales report for a restaurant
   * @param {Number} restaurantId - The restaurant ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} - Sales report
   */
  async getSalesReport(restaurantId, options = {}) {
    const {
      period = 'daily',
      startDate: customStartDate,
      endDate: customEndDate,
      format = 'json',
      compareWithPrevious = false
    } = options;

    // Check if restaurant exists and has access to advanced reports
    const restaurant = await strapi.entityService.findOne('api::restaurant.restaurant', restaurantId, {
      populate: {
        subscriptionPlan: true
      }
    });

    if (!restaurant) {
      throw new Error('Restaurant not found');
    }

    // Check if restaurant has access to advanced reports
    const hasAdvancedReports = restaurant.subscriptionPlan?.allowAdvancedReports || false;

    // Get date range
    let { startDate, endDate } = customStartDate && customEndDate 
      ? { startDate: new Date(customStartDate), endDate: new Date(customEndDate) }
      : this.getDateRange(period);

    // Get orders for the restaurant in the date range
    const orders = await strapi.entityService.findMany('api::order.order', {
      filters: {
        restaurant: restaurantId,
        createdAt: {
          $gte: startDate.toISOString(),
          $lte: endDate.toISOString()
        },
        status: 'completed'
      }
    });

    // Group orders by time period
    const groupedOrders = this.groupByTimePeriod(orders, 'createdAt', period);

    // Calculate total sales
    const totalSales = this.sum(orders, 'totalAmount');
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

    // Basic report data
    let reportData = {
      restaurantId,
      restaurantName: restaurant.name,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalSales,
      orderCount,
      averageOrderValue,
      salesByPeriod: Object.keys(groupedOrders).map(key => ({
        period: key,
        sales: this.sum(groupedOrders[key], 'totalAmount'),
        orderCount: groupedOrders[key].length
      }))
    };

    // Add comparison with previous period if requested
    if (compareWithPrevious) {
      const { startDate: prevStartDate, endDate: prevEndDate } = this.getPreviousPeriodRange(period, startDate);
      
      const previousOrders = await strapi.entityService.findMany('api::order.order', {
        filters: {
          restaurant: restaurantId,
          createdAt: {
            $gte: prevStartDate.toISOString(),
            $lte: prevEndDate.toISOString()
          },
          status: 'completed'
        }
      });

      const comparison = this.comparePeriods(orders, previousOrders, 'totalAmount');
      
      reportData.comparison = {
        previousPeriod: {
          startDate: prevStartDate.toISOString(),
          endDate: prevEndDate.toISOString(),
          totalSales: comparison.previousValue,
          orderCount: previousOrders.length
        },
        difference: comparison.difference,
        percentageChange: comparison.percentageChange,
        increased: comparison.increased
      };
    }

    // Add advanced analytics for restaurants with advanced reports
    if (hasAdvancedReports) {
      // Get top selling menu items
      const menuItemCounts = {};
      orders.forEach(order => {
        const items = order.items || [];
        items.forEach(item => {
          const itemId = item.menuItem?.id || item.menuItemId;
          if (itemId) {
            menuItemCounts[itemId] = (menuItemCounts[itemId] || 0) + (item.quantity || 1);
          }
        });
      });

      // Convert to array and sort
      const topSellingItems = Object.keys(menuItemCounts)
        .map(itemId => ({ itemId, count: menuItemCounts[itemId] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10

      // Get menu item details
      const menuItemIds = topSellingItems.map(item => item.itemId);
      const menuItems = await strapi.entityService.findMany('api::menu-item.menu-item', {
        filters: {
          id: { $in: menuItemIds }
        },
        fields: ['id', 'name', 'price']
      });

      // Map menu item details to top selling items
      const topSellingItemsWithDetails = topSellingItems.map(item => {
        const menuItem = menuItems.find(mi => mi.id.toString() === item.itemId.toString());
        return {
          itemId: item.itemId,
          name: menuItem?.name || 'Unknown Item',
          count: item.count,
          revenue: (menuItem?.price || 0) * item.count
        };
      });

      // Sales by hour of day (for identifying peak hours)
      const salesByHour = Array(24).fill(0);
      orders.forEach(order => {
        const date = new Date(order.createdAt);
        const hour = date.getHours();
        salesByHour[hour] += parseFloat(order.totalAmount) || 0;
      });

      // Add advanced data to report
      reportData.advanced = {
        topSellingItems: topSellingItemsWithDetails,
        salesByHour: salesByHour.map((amount, hour) => ({
          hour,
          sales: amount
        })),
        // Add revenue prediction based on historical data
        revenuePrediction: this.predictRevenue(orders, period)
      };
    }

    // Format the report according to the requested format
    return format === 'raw' ? reportData : this.formatForExport(reportData, format);
  },

  /**
   * Simple revenue prediction based on historical data
   * @param {Array} orders - Historical orders
   * @param {String} period - The period (daily, weekly, monthly, yearly)
   * @returns {Object} - Prediction data
   */
  predictRevenue(orders, period) {
    if (orders.length < 2) {
      return { predicted: 0, confidence: 'low' };
    }

    // Sort orders by date
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );

    // Group by day/week/month
    const groupedOrders = this.groupByTimePeriod(sortedOrders, 'createdAt', period);
    const periods = Object.keys(groupedOrders).sort();

    if (periods.length < 2) {
      return { predicted: 0, confidence: 'low' };
    }

    // Calculate sales for each period
    const salesByPeriod = periods.map(p => ({
      period: p,
      sales: this.sum(groupedOrders[p], 'totalAmount')
    }));

    // Simple linear regression for prediction
    // y = mx + b
    const n = salesByPeriod.length;
    const x = Array.from({ length: n }, (_, i) => i); // 0, 1, 2, ...
    const y = salesByPeriod.map(p => Number(p.sales || 0));

    // Calculate slope (m) and y-intercept (b)
    const sumX = x.reduce((acc, val) => acc + val, 0);
    const sumY = y.reduce((acc, val) => acc + val, 0);
    const sumXY = x.reduce((acc, val, i) => acc + (val * y[i]), 0);
    const sumXX = x.reduce((acc, val) => acc + (val * val), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const yIntercept = (sumY - slope * sumX) / n;

    // Predict next period
    const nextX = n;
    const predictedSales = slope * nextX + yIntercept;

    // Calculate R-squared to determine confidence
    const meanY = sumY / n;
    const totalVariation = y.reduce((acc, val) => acc + Math.pow(val - meanY, 2), 0);
    const predictedY = x.map(val => slope * val + yIntercept);
    const residualVariation = y.reduce((acc, val, i) => acc + Math.pow(val - predictedY[i], 2), 0);
    const rSquared = 1 - (residualVariation / totalVariation);

    // Determine confidence level
    let confidence = 'low';
    if (rSquared > 0.7) confidence = 'high';
    else if (rSquared > 0.4) confidence = 'medium';

    return {
      predicted: Math.max(0, predictedSales), // Ensure non-negative prediction
      confidence,
      rSquared
    };
  }
});
