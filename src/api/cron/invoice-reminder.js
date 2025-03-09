'use strict';

/**
 * Invoice reminder cron job
 * 
 * This cron job runs daily to check for unpaid invoices
 * and sends reminders for overdue invoices.
 */

module.exports = {
  /**
   * Cron job configuration
   * Runs at 2:00 AM every day
   */
  cronTime: '0 2 * * *',
  
  /**
   * Cron job handler
   * @param {Object} strapi - Strapi instance
   */
  async handler({ strapi }) {
    try {
      strapi.log.info('Running invoice reminder cron job');
      
      // Get current date
      const now = new Date();
      
      // Find invoices that are due but not paid
      const invoices = await strapi.entityService.findMany('api::invoice.invoice', {
        filters: {
          status: {
            $in: ['issued', 'overdue']
          },
          dueDate: {
            $lte: now.toISOString()
          }
        },
        populate: {
          restaurant: {
            populate: {
              owner: true
            }
          },
          subscription: true,
          order: {
            populate: {
              customer: true
            }
          }
        }
      });
      
      strapi.log.info(`Found ${invoices.length} overdue invoices`);
      
      // Process each invoice
      for (const invoice of invoices) {
        try {
          // Update invoice status to overdue if it's not already
          if (invoice.status !== 'overdue') {
            await strapi.entityService.update('api::invoice.invoice', invoice.id, {
              data: {
                status: 'overdue'
              }
            });
          }
          
          // Determine recipient email
          let recipientEmail;
          let recipientName;
          
          if (invoice.subscription) {
            // For subscription invoices, send to restaurant owner
            recipientEmail = invoice.restaurant?.owner?.email;
            recipientName = invoice.restaurant?.owner?.username || 'Restaurant Owner';
          } else if (invoice.order) {
            // For order invoices, send to customer
            recipientEmail = invoice.order?.customer?.email;
            recipientName = invoice.order?.customer?.username || 'Customer';
          }
          
          if (recipientEmail) {
            // In a real implementation, this would send an email
            strapi.log.info(`Sending invoice reminder to ${recipientEmail} for invoice ${invoice.invoiceNumber}`);
            
            // Example email content
            const emailContent = {
              to: recipientEmail,
              subject: `Reminder: Invoice ${invoice.invoiceNumber} is overdue`,
              text: `Dear ${recipientName},\n\nThis is a reminder that invoice ${invoice.invoiceNumber} for ${invoice.amount} is overdue. Please make payment as soon as possible.\n\nThank you,\nThe Restaurant App Team`
            };
            
            // Log email content for demonstration
            strapi.log.info('Email content:', emailContent);
          } else {
            strapi.log.warn(`No recipient email found for invoice ${invoice.id}`);
          }
        } catch (error) {
          strapi.log.error(`Error processing invoice ${invoice.id}:`, error);
        }
      }
      
      strapi.log.info('Invoice reminder cron job completed');
    } catch (error) {
      strapi.log.error('Error in invoice reminder cron job:', error);
    }
  }
};
