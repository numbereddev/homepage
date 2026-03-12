"use client";

import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// ModalOverlay – the semi-transparent backdrop behind a modal panel.
// When `variant` is "centered" the backdrop lives *inside* the flex wrapper so
// clicks on it can dismiss the dialog while the wrapper itself handles centering.
// For "full" and "drawer" it is rendered as a sibling fixed element.
// ---------------------------------------------------------------------------

type ModalOverlayProps = {
  className?: string;
  /** Handler called when the user clicks the backdrop. */
  onClickAction?: () => void;
};

export function ModalOverlay({ className, onClickAction }: ModalOverlayProps) {
  return (
    <div
      className={className ?? "fixed inset-0 bg-black/70 backdrop-blur-sm"}
      onClick={onClickAction}
    />
  );
}

// ---------------------------------------------------------------------------
// Modal – the primary shell component.
//
// Variants
// --------
//   "full"     – Panel is inset a few pixels from every viewport edge.
//                Used for full-screen editors and the asset picker.
//   "centered" – Panel is centered in the viewport using a flex wrapper
//                that is explicitly anchored to all four edges (inset-0).
//                This is robust to any scroll position or body transforms
//                because centering is done with flexbox inside a fixed
//                inset-0 container rather than with percentage + translate,
//                which can be unreliable when body has position:fixed.
//   "drawer"   – Panel is always flush against the right viewport edge (right-0)
//                with no gap. Full-width on mobile; capped at max-w-lg (by
//                default) on sm+.
// ---------------------------------------------------------------------------

export type ModalVariant = "full" | "centered" | "drawer";

type ModalProps = {
  variant?: ModalVariant;
  /**
   * Tailwind z-index class applied to the outermost element.
   * Defaults to "z-50".
   */
  zIndex?: string;
  /**
   * Extra Tailwind classes added to the backdrop overlay element.
   * Defaults to the standard semi-transparent dark blur backdrop.
   */
  overlayClassName?: string;
  /**
   * Extra Tailwind classes added to the panel element.
   * Merged with the variant-specific base classes.
   */
  panelClassName?: string;
  /** Called when the user clicks the backdrop (outside the panel). */
  onBackdropClickAction?: () => void;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className">;

export function Modal({
  variant = "full",
  zIndex = "z-50",
  overlayClassName,
  panelClassName,
  onBackdropClickAction,
  children,
  ...rest
}: ModalProps) {
  if (variant === "centered") {
    // The outer wrapper is fixed + inset-0 so it always covers the full
    // viewport, regardless of scroll position or body transforms.
    // flex + items-center + justify-center then centres the panel inside it.
    return (
      <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
        {/* Backdrop lives inside the wrapper so it absorbs click events */}
        <div
          className={overlayClassName ?? "absolute inset-0 bg-black/70 backdrop-blur-sm"}
          onClick={onBackdropClickAction}
        />
        {/* Panel is relative so it stacks above the absolute backdrop */}
        <div className={`relative z-10 max-w-lg ${panelClassName}`} {...rest}>
          {children}
        </div>
      </div>
    );
  }

  if (variant === "drawer") {
    return (
      <>
        <div
          className={[
            "fixed inset-0",
            zIndex,
            overlayClassName ?? "drawer-backdrop",
          ].join(" ")}
          onClick={onBackdropClickAction}
        />
        {/* Always flush against the right edge (right-0) at every breakpoint.
            On mobile the panel fills the full viewport width; on sm+ it is
            capped at max-w-lg (or a custom width via panelClassName). */}
        <aside
          className={[
            "fixed top-0 right-0 bottom-0 flex min-h-0 min-w-0 flex-col",
            "overflow-hidden bg-[#0a0d12]",
            "drawer-panel",
            "w-full border-l border-[#202632]",
            zIndex,
            panelClassName ?? "sm:max-w-lg",
          ].join(" ")}
          {...(rest as React.HTMLAttributes<HTMLElement>)}
        >
          {children}
        </aside>
      </>
    );
  }

  // variant === "full"
  return (
    <>
      <div
        className={[
          "fixed inset-0",
          zIndex,
          overlayClassName ?? "bg-black/70 backdrop-blur-sm",
        ].join(" ")}
        onClick={onBackdropClickAction}
      />
      <div
        className={[
          "fixed inset-2 flex min-h-0 min-w-0 max-h-[calc(100dvh-1rem)] flex-col",
          "overflow-hidden border border-[#202632] bg-[#0a0d12]",
          "sm:inset-4 sm:max-h-[calc(100dvh-2rem)]",
          "lg:inset-8 lg:max-h-[calc(100dvh-4rem)]",
          "xl:inset-12 xl:max-h-[calc(100dvh-6rem)]",
          zIndex,
          panelClassName ?? "",
        ].join(" ")}
        {...rest}
      >
        {children}
      </div>
    </>
  );
}
