function getStyleUse(bundleFilename) {
  return [
    {
      loader: 'file-loader',
      options: {
        name: bundleFilename,
      },
    },
    { loader: 'extract-loader' },
    { loader: 'css-loader' },
    {
      loader: 'sass-loader',
      options: {
        includePaths: ['./node_modules'],
        implementation: require('dart-sass'),
        fiber: require('fibers'),
  }
    },
  ];
}

module.exports = [
  {
    entry: './console.scss',
    output: {
      // This is necessary for webpack to compile, but we never reference this js file.
      filename: 'style-bundle-login.js',
    },
    module: {
      rules: [{
        test: /console.scss$/,
        use: getStyleUse('bundle-console.css')
      }]
    },
  },
  {
    entry: "./console.js",
    output: {
      filename: "bundle-console.js"
    },
    module: {
      loaders: [{
        test: /console.js$/,
        loader: 'babel-loader',
        query: {presets: ['env']}
      }]
    },
  }
];
