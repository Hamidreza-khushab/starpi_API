'use strict';

/**
 * Base reporting service
 * 
 * This service provides common functionality for all reporting services.
 */

module.exports = ({ strapi }) => ({
  /**
   * Filter data by date range
   * @param {Array} data - The data to filter
   * @param {String} dateField - The field containing the date
   * @param {Date} startDate - The start date
   * @param {Date} endDate - The end date
   * @returns {Array} - Filtered data
   */
  filterByDateRange(data, dateField, startDate, endDate) {
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  },

  /**
   * Group data by time period
   * @param {Array} data - The data to group
   * @param {String} dateField - The field containing the date
   * @param {String} period - The period to group by (daily, weekly, monthly, yearly)
   * @returns {Object} - Grouped data
   */
  groupByTimePeriod(data, dateField, period) {
    const groupedData = {};

    data.forEach(item => {
      const date = new Date(item[dateField]);
      let key;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'weekly':
          // Get the first day of the week (Sunday)
          const firstDayOfWeek = new Date(date);
          const day = date.getDay();
          firstDayOfWeek.setDate(date.getDate() - day);
          key = firstDayOfWeek.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = date.getFullYear().toString();
          break;
        default:
          key = date.toISOString().split('T')[0]; // Default to daily
      }

      if (!groupedData[key]) {
        groupedData[key] = [];
      }

      groupedData[key].push(item);
    });

    return groupedData;
  },

  /**
   * Calculate sum of a field in data
   * @param {Array} data - The data to calculate sum from
   * @param {String} field - The field to sum
   * @returns {Number} - The sum
   */
  sum(data, field) {
    return data.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
  },

  /**
   * Calculate average of a field in data
   * @param {Array} data - The data to calculate average from
   * @param {String} field - The field to average
   * @returns {Number} - The average
   */
  average(data, field) {
    if (data.length === 0) return 0;
    return this.sum(data, field) / data.length;
  },

  /**
   * Format data for export
   * @param {Object} data - The data to format
   * @param {String} format - The format to export (json, csv)
   * @returns {String|Object} - Formatted data
   */
  formatForExport(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        if (!data || data.length === 0) return '';
        
        // Get headers from first item
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        // Add data rows
        data.forEach(item => {
          const values = headers.map(header => {
            const value = item[header];
            // Handle values with commas by wrapping in quotes
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value;
          });
          csvRows.push(values.join(','));
        });
        
        return csvRows.join('\n');
      default:
        return data;
    }
  },

  /**
   * Compare data between two periods
   * @param {Array} currentPeriodData - Data from current period
   * @param {Array} previousPeriodData - Data from previous period
   * @param {String} field - Field to compare
   * @returns {Object} - Comparison results
   */
  comparePeriods(currentPeriodData, previousPeriodData, field) {
    const currentSum = this.sum(currentPeriodData, field);
    const previousSum = this.sum(previousPeriodData, field);
    
    const difference = currentSum - previousSum;
    const percentageChange = previousSum !== 0 
      ? (difference / previousSum) * 100 
      : currentSum > 0 ? 100 : 0;
    
    return {
      currentValue: currentSum,
      previousValue: previousSum,
      difference,
      percentageChange,
      increased: difference > 0
    };
  },

  /**
   * Get date range for a period
   * @param {String} period - The period (daily, weekly, monthly, yearly)
   * @param {Date} referenceDate - The reference date
   * @returns {Object} - Start and end dates
   */
  getDateRange(period, referenceDate = new Date()) {
    const date = new Date(referenceDate);
    let startDate, endDate;

    switch (period) {
      case 'daily':
        startDate = new Date(date.setHours(0, 0, 0, 0));
        endDate = new Date(date.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        // Start from Sunday
        const day = date.getDay();
        startDate = new Date(date);
        startDate.setDate(date.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(date.setHours(0, 0, 0, 0));
        endDate = new Date(date.setHours(23, 59, 59, 999));
    }

    return { startDate, endDate };
  },

  /**
   * Get previous period date range
   * @param {String} period - The period (daily, weekly, monthly, yearly)
   * @param {Date} currentStartDate - Start date of current period
   * @returns {Object} - Start and end dates of previous period
   */
  getPreviousPeriodRange(period, currentStartDate) {
    const startDate = new Date(currentStartDate);
    let previousStartDate, previousEndDate;

    switch (period) {
      case 'daily':
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - 1);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - 7);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setDate(previousStartDate.getDate() + 6);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        previousStartDate = new Date(startDate);
        previousStartDate.setMonth(startDate.getMonth() - 1);
        previousEndDate = new Date(previousStartDate.getFullYear(), previousStartDate.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        previousStartDate = new Date(startDate);
        previousStartDate.setFullYear(startDate.getFullYear() - 1);
        previousEndDate = new Date(previousStartDate.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(startDate.getDate() - 1);
        previousEndDate = new Date(previousStartDate);
        previousEndDate.setHours(23, 59, 59, 999);
    }

    return { startDate: previousStartDate, endDate: previousEndDate };
  }
});
