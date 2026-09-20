/**
 * GSAP Animation Utilities & ScrollTrigger Registration
 * Client-safe helper functions to prevent SSR hydration issues and ensure proper cleanup.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const isClient = typeof window !== "undefined";

if (isClient) {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };
