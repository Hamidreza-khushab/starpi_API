'use strict';

/**
 * Custom routes for notification
 */

module.exports = {
  routes: [
    {
      method: 'PUT',
      path: '/notifications/:id/mark-as-read',
      handler: 'notification.markAsRead',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/notifications/mark-all-as-read',
      handler: 'notification.markAllAsRead',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/notifications/:id/archive',
      handler: 'notification.archive',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/notifications/unread-count',
      handler: 'notification.getUnreadCount',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
