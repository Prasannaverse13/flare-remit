// Browser builds of MetaMask SDK import this optional React Native package.
// The injected connector never uses it, so a tiny no-op storage adapter keeps
// the web bundle free of the native dependency.
const storage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};
export default storage;
export const AsyncStorage = storage;
