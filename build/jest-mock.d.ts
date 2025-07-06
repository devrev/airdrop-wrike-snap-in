declare module 'jest-mock' {
  export function mocked<T>(item: T, deep?: boolean): jest.Mocked<T>;
}