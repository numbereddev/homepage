"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type AnimateInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
};

type StaggerInProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  stagger?: number;
  initialDelay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  threshold?: number;
};

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
  duration?: number;
};

type AnimatedElementProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  once?: boolean;
};

type AnimatedSectionProps = AnimatedElementProps &
  Omit<React.ComponentPropsWithoutRef<"section">, "children" | "className" | "style">;

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const PAGE_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) {
      return false;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("matchMedia" in window)) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);

    media.addEventListener?.("change", update);

    return () => {
      media.removeEventListener?.("change", update);
    };
  }, []);

  return reduced;
}

function useViewportReveal({
  delay = 0,
  duration = 700,
  distance = 24,
  threshold = 0.16,
  once = true,
}: Omit<AnimatedElementProps, "children" | "className" | "style">) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [visible, setVisible] = useState(reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);

            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [once, reducedMotion, threshold]);

  const style = useMemo<CSSProperties>(() => {
    if (reducedMotion) {
      return {};
    }

    return {
      opacity: visible ? 1 : 0,
      transform: visible ? "translate3d(0, 0, 0)" : `translate3d(0, ${distance}px, 0)`,
      transitionProperty: "opacity, transform, filter",
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: EASE_OUT,
      transitionDelay: `${delay}ms`,
      filter: visible ? "blur(0px)" : "blur(6px)",
      willChange: "opacity, transform, filter",
    };
  }, [delay, distance, duration, reducedMotion, visible]);

  return { ref, style, reducedMotion };
}

export function AnimateIn({
  children,
  className,
  delay = 0,
  duration = 700,
  distance = 24,
  once = true,
  threshold = 0.16,
}: AnimateInProps) {
  const { ref, style } = useViewportReveal({
    delay,
    duration,
    distance,
    once,
    threshold,
  });

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

export function FadeIn(props: AnimateInProps) {
  return <AnimateIn {...props} distance={0} />;
}

export function SlideUp(props: AnimateInProps) {
  return <AnimateIn {...props} />;
}

export function StaggerIn({
  children,
  className,
  itemClassName,
  stagger = 80,
  initialDelay = 0,
  duration = 700,
  distance = 24,
  once = true,
  threshold = 0.12,
}: StaggerInProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => (
        <AnimateIn
          key={
            isValidElement(child) && child.key != null ? String(child.key) : `stagger-item-${index}`
          }
          className={itemClassName}
          delay={initialDelay + index * stagger}
          duration={duration}
          distance={distance}
          once={once}
          threshold={threshold}
        >
          {child}
        </AnimateIn>
      ))}
    </div>
  );
}

export function AnimatedSection({
  children,
  className,
  style,
  delay = 0,
  duration = 700,
  distance = 24,
  threshold = 0.16,
  once = true,
  ...props
}: AnimatedSectionProps) {
  const { ref, style: animatedStyle } = useViewportReveal({
    delay,
    duration,
    distance,
    threshold,
    once,
  });

  return (
    <section ref={ref} className={className} style={{ ...animatedStyle, ...style }} {...props}>
      {children}
    </section>
  );
}

export function AnimatedArticle({
  children,
  className,
  style,
  delay = 0,
  duration = 700,
  distance = 24,
  threshold = 0.16,
  once = true,
}: AnimatedElementProps) {
  const { ref, style: animatedStyle } = useViewportReveal({
    delay,
    duration,
    distance,
    threshold,
    once,
  });

  return (
    <article ref={ref} className={className} style={{ ...animatedStyle, ...style }}>
      {children}
    </article>
  );
}

export function AnimatedDiv({
  children,
  className,
  style,
  delay = 0,
  duration = 700,
  distance = 24,
  threshold = 0.16,
  once = true,
}: AnimatedElementProps) {
  const { ref, style: animatedStyle } = useViewportReveal({
    delay,
    duration,
    distance,
    threshold,
    once,
  });

  return (
    <div ref={ref} className={className} style={{ ...animatedStyle, ...style }}>
      {children}
    </div>
  );
}

export function PageTransition({ children, className, duration = 450 }: PageTransitionProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const previousPathRef = useRef<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const previousPath = previousPathRef.current;
    previousPathRef.current = pathname;

    if (reducedMotion || previousPath === null || previousPath === pathname) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const supportsViewTransitions =
      typeof document !== "undefined" &&
      "startViewTransition" in document &&
      typeof (document as Document & { startViewTransition?: unknown }).startViewTransition ===
        "function";

    if (supportsViewTransitions) {
      node.animate(
        [
          {
            opacity: 0,
            transform: "translate3d(0, 12px, 0)",
            filter: "blur(8px)",
          },
          {
            opacity: 1,
            transform: "translate3d(0, 0, 0)",
            filter: "blur(0px)",
          },
        ],
        {
          duration,
          easing: PAGE_EASE,
          fill: "both",
        },
      );

      return;
    }

    node.animate(
      [
        {
          opacity: 0,
          transform: "translate3d(0, 16px, 0)",
        },
        {
          opacity: 1,
          transform: "translate3d(0, 0, 0)",
        },
      ],
      {
        duration,
        easing: PAGE_EASE,
        fill: "both",
      },
    );
  }, [duration, pathname, reducedMotion]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

export function AnimatedChildren({
  children,
  stagger = 80,
  duration = 700,
  distance = 24,
}: {
  children: ReactNode;
  stagger?: number;
  duration?: number;
  distance?: number;
}) {
  return (
    <>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) {
          return child;
        }

        return (
          <AnimateIn delay={index * stagger} duration={duration} distance={distance}>
            {cloneElement(child as ReactElement)}
          </AnimateIn>
        );
      })}
    </>
  );
}
