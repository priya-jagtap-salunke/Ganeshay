import React, { useEffect } from 'react';

// React Native Paper and other libs use useLayoutEffect, which triggers SSR
// warnings during Expo web static/server rendering. Safe to noop on server.
if (typeof window === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (React as any).useLayoutEffect = useEffect;
}
