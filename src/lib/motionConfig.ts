export const fieldtripMotion = {
  quick: 0.18,
  standard: 0.28,
  reveal: 0.55,
  stagger: 0.06,
  easeOut: [0.16, 1, 0.3, 1] as const,
  springy: [0.34, 1.56, 0.64, 1] as const,
};

export const fieldtripPageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: fieldtripMotion.standard, ease: fieldtripMotion.easeOut },
};

