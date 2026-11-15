const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

/**
 * expo-sqlite en web corre sobre WebAssembly: Metro tiene que servir los
 * `.wasm` como asset y el navegador exige aislamiento de origen (COOP/COEP)
 * para habilitar SharedArrayBuffer. En iOS/Android nada de esto aplica.
 */
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
