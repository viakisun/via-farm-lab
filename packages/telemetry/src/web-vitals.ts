// Web Vitals reporter — feeds Core Web Vitals into Sentry or a custom sink.
// Call once at app entry (apps/web), after Sentry init.
import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export type WebVitalsSink = (metric: Metric) => void;

/**
 * Subscribe to the five Core Web Vitals.
 * - CLS  (Cumulative Layout Shift)
 * - FCP  (First Contentful Paint)
 * - INP  (Interaction to Next Paint)
 * - LCP  (Largest Contentful Paint)
 * - TTFB (Time to First Byte)
 *
 * Pass a custom sink, or omit for a console default.
 */
export function reportWebVitals(sink?: WebVitalsSink): void {
  const handler: WebVitalsSink =
    sink ??
    ((m) => {
      console.info('[web-vitals]', m.name, m.value, m.rating);
    });

  onCLS(handler);
  onFCP(handler);
  onINP(handler);
  onLCP(handler);
  onTTFB(handler);
}

export type { Metric } from 'web-vitals';
