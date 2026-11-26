import { useMediaQuery } from '@/hooks/useMediaQuery';

// True from 1024px up: the shell shows the sidebar and the auth pages their two-panel layout.
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)');
