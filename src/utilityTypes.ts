export type NoInfer<T> = [T][T extends T ? 0 : never];
