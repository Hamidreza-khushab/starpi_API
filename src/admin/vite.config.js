const { mergeConfig } = require('vite');

module.exports = (config) => {
  // Important: always return the modified config
  return mergeConfig(config, {
    server: {
      port: 5174, // Use a different port than the default 5173
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  });
};
