// URL polyfill MUST be imported first, before any other imports
import 'react-native-url-polyfill/auto';
import 'intl-pluralrules';
// Gesture handler must be imported early
import 'react-native-gesture-handler';

// Register the app
import { registerRootComponent } from 'expo';
import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
