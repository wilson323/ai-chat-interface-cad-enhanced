declare module 'react-responsive' {
  export function useMediaQuery(query: string | { query?: string; minWidth?: number; maxWidth?: number }): boolean;
}
