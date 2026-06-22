import { registerWebModule, NativeModule } from 'expo';

// AuthModule is not available on the web platform.
class AuthModule extends NativeModule<{}> {}

export default registerWebModule(AuthModule, 'AuthModule');
