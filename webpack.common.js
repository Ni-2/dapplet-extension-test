const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
const package = require('./package.json')
const webpack = require('webpack')

function modifyManifest(buffer) {
  const manifest = JSON.parse(buffer.toString())

  manifest.version = package.version.replace(/-.*/gm, '')
  manifest.version_name = package.version
  manifest.description = package.description
  manifest.author = package.author

  manifest_JSON = JSON.stringify(manifest, null, 2)
  return manifest_JSON
}

module.exports = {
  entry: {
    background: path.join(__dirname, 'src/background/index.ts'),
    contentscript: path.join(__dirname, 'src/contentscript/index.ts'),
    inpage: path.join(__dirname, 'src/inpage/index.ts'),
    overlay: path.join(__dirname, 'src/overlay/index.tsx'),
  },
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js',
    publicPath: '',
  },
  module: {
    rules: [
      {
        include: path.resolve(__dirname, 'src'),
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath) => resourcePath.endsWith('.module.scss'),
              },
            },
          },
          'sass-loader',
        ],
        include: path.resolve(__dirname, 'src'),
        exclude: path.resolve(__dirname, 'src/contentscript'),
      },
      {
        test: /\.scss$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              insert: function (element) {
                const extensionHostID = 'dapplets-overlay-manager'
                let extensionHost = document.getElementById(extensionHostID)

                if (!extensionHost) {
                  const CollapsedOverlayClass = 'dapplets-overlay-collapsed'
                  const HiddenOverlayClass = 'dapplets-overlay-hidden'
                  const DappletsOverlayManagerClass = 'dapplets-overlay-manager'
                  const OverlayFrameClass = 'dapplets-overlay-frame'

                  const panel = document.createElement(DappletsOverlayManagerClass)
                  panel.id = 'dapplets-overlay-manager'
                  panel.classList.add(OverlayFrameClass, CollapsedOverlayClass, HiddenOverlayClass)

                  panel.attachShadow({ mode: 'open' })

                  const container = document.createElement('div')
                  container.id = 'app'

                  // Add style tag to shadow host
                  panel.shadowRoot.appendChild(element)
                  panel.shadowRoot.appendChild(container)
                  document.body.appendChild(panel)
                } else {
                  extensionHost.shadowRoot.appendChild(element)
                }
              },
            },
          },
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: (resourcePath) => resourcePath.endsWith('.module.scss'),
              },
            },
          },
          'sass-loader',
        ],
        include: path.resolve(__dirname, 'src/contentscript'),
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
        include: [path.resolve(__dirname, 'src'), /node_modules/],
      },
      {
        test: [
          /\.bmp$/,
          /\.gif$/,
          /\.jpe?g$/,
          /\.png$/,
          /\.svg$/,
          /\.eot$/,
          /\.ttf$/,
          /\.woff$/,
          /\.woff2$/,
        ],
        type: 'asset/inline',
        include: [path.resolve(__dirname, 'src'), /node_modules/],
        exclude: [path.resolve(__dirname, 'src/contentscript')],
      },
      {
        test: /\.svg$/,
        include: [path.resolve(__dirname, 'src/contentscript')],
        use: ['@svgr/webpack', 'url-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    fallback: {
      crypto: false,
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert-browserify'),
      http: false,
      https: false,
      zlib: false,
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        'resources',
        {
          from: 'manifest.json',
          to: 'manifest.json',
          transform: (content) => modifyManifest(content),
        },
        {
          from: 'src/background/index.html',
          to: 'background.html',
        },
        {
          from: 'src/overlay/index.html',
          to: 'overlay.html',
        },
      ],
    }),
    new webpack.DefinePlugin({
      EXTENSION_VERSION: JSON.stringify(package.version),
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new ForkTsCheckerWebpackPlugin(),
  ],
}
