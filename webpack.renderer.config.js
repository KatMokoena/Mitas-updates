const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// Plugin to suppress TypeScript errors from server-side files
class SuppressServerErrorsPlugin {
  apply(compiler) {
    compiler.hooks.afterCompile.tap('SuppressServerErrorsPlugin', (compilation) => {
      // Remove errors related to server-side files
      compilation.errors = compilation.errors.filter((error) => {
        if (typeof error === 'string') {
          return !error.includes('src/api/') && 
                 !error.includes('src/auth/') && 
                 !error.includes('src/database/') && 
                 !error.includes('src/main/') && 
                 !error.includes('src/services/');
        }
        if (error.message) {
          return !error.message.includes('src/api/') && 
                 !error.message.includes('src/auth/') && 
                 !error.message.includes('src/database/') && 
                 !error.message.includes('src/main/') && 
                 !error.message.includes('src/services/');
        }
        return true;
      });
    });
  }
}

module.exports = {
  mode: 'development',
  entry: './src/renderer/index.tsx',
  target: 'web',
  devtool: 'source-map',
  devServer: {
    port: 8080,
    hot: true,
    historyApiFallback: true, // Enable SPA routing - serve index.html for all routes
    static: {
      directory: path.join(__dirname, 'public'),
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.resolve(__dirname, 'tsconfig.renderer.json'),
            transpileOnly: true,
            onlyCompileBundledFiles: true,
            compilerOptions: {
              skipLibCheck: true,
            },
            ignoreDiagnostics: [
              2306, // File is not a module
              2305, // Module has no exported member
              2769, // No overload matches
            ],
            logLevel: 'warn',
          },
        },
        exclude: [
          /node_modules/,
          /src\/api/,
          /src\/auth/,
          /src\/database/,
          /src\/main/,
          /src\/services/,
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
    },
  },
  resolveLoader: {
    modules: ['node_modules'],
  },
  output: {
    filename: 'renderer.js',
    path: path.resolve(__dirname, 'dist/renderer'),
    publicPath: '/',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
    }),
    new SuppressServerErrorsPlugin(),
  ],
};
