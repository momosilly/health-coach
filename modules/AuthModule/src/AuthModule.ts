import { NativeModule, requireNativeModule } from 'expo';

declare class AuthModule extends NativeModule<{}> {}

export default requireNativeModule<AuthModule>('AuthModule');
