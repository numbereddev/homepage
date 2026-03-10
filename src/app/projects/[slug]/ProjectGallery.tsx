"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type GalleryItem = {
  id: string;
  url: string;
  kind: "image" | "video";
  alt: string;
};

type ProjectGalleryProps = {
  title: string;
  items: GalleryItem[];
};

function isAssetVideo(item: GalleryItem) {
  return item.kind === "video";
}

function ArrowButton({
  direction,
  onClick,
  className = "",
}: {
  direction: "prev" | "next";
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous gallery item" : "Next gallery item"}
      className={[
        "inline-flex h-11 w-11 items-center justify-center border border-white/12 bg-black/60 text-xl text-white transition",
        "hover:border-white/30 hover:bg-black/80",
        className,
      ].join(" ")}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

export default function ProjectGallery({ title, items }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const activeItem = activeIndex == null ? null : items[activeIndex];
  const hasMultipleItems = items.length > 1;

  const closeModal = useCallback(() => setActiveIndex(null), []);
  const openModal = useCallback((index: number) => setActiveIndex(index), []);

  const showPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null) return current;
      return current === 0 ? items.length - 1 : current - 1;
    });
  }, [items.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current == null) return current;
      return current === items.length - 1 ? 0 : current + 1;
    });
  }, [items.length]);

  const showPrevSlide = useCallback(() => {
    setCarouselIndex((current) => (current === 0 ? items.length - 1 : current - 1));
  }, [items.length]);

  const showNextSlide = useCallback(() => {
    setCarouselIndex((current) => (current === items.length - 1 ? 0 : current + 1));
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return;
  }, [items.length]);

  useEffect(() => {
    if (activeIndex == null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      } else if (event.key === "ArrowLeft") {
        showPrev();
      } else if (event.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, closeModal, showNext, showPrev]);

  const modal =
    activeItem == null || activeIndex == null
      ? null
      : createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} gallery viewer`}
            onClick={closeModal}
          >
            <button
              type="button"
              aria-label="Close gallery"
              onClick={closeModal}
              className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center border border-white/15 bg-black/60 text-2xl text-white transition hover:border-white/30 hover:bg-black/80"
            >
              ×
            </button>

            {hasMultipleItems && (
              <>
                <ArrowButton
                  direction="prev"
                  onClick={showPrev}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 sm:left-6"
                />
                <ArrowButton
                  direction="next"
                  onClick={showNext}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 sm:right-6"
                />
              </>
            )}

            <div
              className="relative z-10 flex max-h-full w-full max-w-6xl flex-col gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.16em] text-neutral-400">
                <span>
                  Item {activeIndex + 1} / {items.length}
                </span>
                <span>{isAssetVideo(activeItem) ? "Video" : "Image"}</span>
              </div>

              <div className="relative flex max-h-[82vh] min-h-60 items-center justify-center border border-white/10 bg-neutral-950">
                {isAssetVideo(activeItem) ? (
                  <video
                    key={activeItem.url}
                    src={activeItem.url}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                    className="max-h-[82vh] w-full bg-black"
                  >
                    Sorry, your browser does not support embedded video.
                  </video>
                ) : (
                  <div className="relative h-[82vh] w-full">
                    <Image
                      src={activeItem.url}
                      alt={activeItem.alt}
                      fill
                      unoptimized
                      sizes="100vw"
                      className="object-contain"
                      priority
                    />
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        );

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[carouselIndex];

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">
            Item {carouselIndex + 1} / {items.length}
          </div>

          {hasMultipleItems && (
            <div className="flex items-center gap-2">
              <ArrowButton direction="prev" onClick={showPrevSlide} />
              <ArrowButton direction="next" onClick={showNextSlide} />
            </div>
          )}
        </div>

        <div className="overflow-hidden border border-neutral-800 bg-neutral-900">
          <button
            key={currentItem.id}
            type="button"
            onClick={() => openModal(carouselIndex)}
            className="group relative block aspect-video w-full max-w-5xl mx-auto text-left bg-black/35"
            aria-label={`Open ${isAssetVideo(currentItem) ? "video" : "image"} ${carouselIndex + 1} in gallery`}
          >
            <div className="absolute right-3 top-3 z-10 border border-white/10 bg-black/65 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/80">
              {isAssetVideo(currentItem) ? "Video" : "Image"}
            </div>

            <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/80 to-transparent px-3 py-3 opacity-0 transition group-hover:opacity-100">
              <span className="text-xs font-medium text-white">Open</span>
            </div>

            {isAssetVideo(currentItem) ? (
              <>
                <video
                  src={currentItem.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white backdrop-blur-sm">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <Image
                src={currentItem.url}
                alt={currentItem.alt}
                width={1200}
                height={675}
                unoptimized
                className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.01]"
              />
            )}
          </button>
        </div>

        {hasMultipleItems && (
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item, index) => {
              const isActive = index === carouselIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCarouselIndex(index)}
                  aria-label={`Go to gallery item ${index + 1}`}
                  className={[
                    "h-2.5 transition-all",
                    isActive ? "w-8 bg-white" : "w-2.5 bg-white/25 hover:bg-white/45",
                  ].join(" ")}
                />
              );
            })}
          </div>
        )}
      </div>

      {modal}
    </>
  );
}
