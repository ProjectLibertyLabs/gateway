module.exports = function (options, webpack) {
  return {
    ...options,
    experiments: {
      // Enable webpack to handle ESM packages
      topLevelAwait: true,
    },
    resolve: {
      ...options.resolve,
      fullySpecified: false, // Allow importing ESM modules without .js extension
    },
  };
};
