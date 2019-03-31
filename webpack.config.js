const path = require('path');

function getStyleUse(bundleFilename) {
  return [
    {
      loader: 'file-loader',
      options: {
        name: bundleFilename,
        path: path.resolve(__dirname, 'dist')
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
        mode: 'development',
        entry: './src/console.scss',
        devServer: {
            contentBase: 'dist'
        },
        output: {
            // This is necessary for webpack to compile, but we never use this
            // js file.
            filename: 'style-bundle-console.js',
            path: path.resolve(__dirname, 'dist')
        },
        module: {
            rules: [{
                test: /\.scss$/,
                use: getStyleUse('console.css')
            }]
        },
    },
    {
        mode: 'development',
        entry: './src/console.js',
        devServer: {
            contentBase: 'dist'
        },
        output: {
            filename: 'console.js',
            path: path.resolve(__dirname, 'dist')
        },
    }
];
