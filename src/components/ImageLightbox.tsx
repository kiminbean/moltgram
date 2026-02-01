"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";

interface ImageLightboxProps {
  src: string;
  alt: string;
  children: React.ReactNode;
}

/**
 * Image lightbox with fullscreen view, pinch-to-zoom, and pan.
 * Wrap any clickable image element to enable lightbox on click.
 */
export default function ImageLightbox({ src, alt, children }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);
  const initialPinchDistance = useRef(0);
  const initialPinchScale = useRef(1);

  const open = useCallback(() => {
    setIsOpen(true);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Keyboard support
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(s * 1.3, 5));
      if (e.key === "-") {
        setScale((s) => {
          const next = Math.max(s / 1.3, 1);
          if (next <= 1) setTranslate({ x: 0, y: 0 });
          return next;
        });
      }
      if (e.key === "0") {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((s) => {
      const next = Math.max(1, Math.min(s * delta, 5));
      if (next <= 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  }, []);

  // Double-tap / double-click to zoom
  const handleDoubleTap = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        handleDoubleTap();
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        // Single click on background (not on image) closes
        if ((e.target as HTMLElement).dataset.backdrop) {
          close();
        }
      }
    },
    [handleDoubleTap, close]
  );

  // Mouse drag for panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      translateStart.current = { ...translate };
    },
    [scale, translate]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || scale <= 1) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      });
    },
    [isDragging, scale]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch pinch-to-zoom and pan
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance.current = Math.sqrt(dx * dx + dy * dy);
        initialPinchScale.current = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        translateStart.current = { ...translate };
        setIsDragging(true);
      }
    },
    [scale, translate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = Math.max(
          1,
          Math.min(
            (initialPinchScale.current * dist) / initialPinchDistance.current,
            5
          )
        );
        setScale(newScale);
        if (newScale <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && isDragging && scale > 1) {
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setTranslate({
          x: translateStart.current.x + dx,
          y: translateStart.current.y + dy,
        });
      }
    },
    [isDragging, scale]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    initialPinchDistance.current = 0;
  }, []);

  if (!isOpen) {
    return (
      <div onClick={open} className="cursor-zoom-in">
        {children}
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Lightbox overlay */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
        data-backdrop="true"
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Image lightbox"
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
          aria-label="Close lightbox"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Zoom controls */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white/70">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale((s) => {
                const next = Math.max(s / 1.3, 1);
                if (next <= 1) setTranslate({ x: 0, y: 0 });
                return next;
              });
            }}
            className="rounded-full p-1 transition-colors hover:text-white"
            aria-label="Zoom out"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="min-w-[3rem] text-center text-xs">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setScale((s) => Math.min(s * 1.3, 5));
            }}
            className="rounded-full p-1 transition-colors hover:text-white"
            aria-label="Zoom in"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {scale > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScale(1);
                setTranslate({ x: 0, y: 0 });
              }}
              className="ml-1 rounded-full p-1 text-xs transition-colors hover:text-white"
              aria-label="Reset zoom"
            >
              Reset
            </button>
          )}
        </div>

        {/* Image */}
        <div
          className="relative max-h-[90vh] max-w-[90vw]"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
          }}
        >
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={1200}
            className="max-h-[90vh] w-auto rounded-lg object-contain"
            sizes="90vw"
            priority
            draggable={false}
          />
        </div>
      </div>
    </>
  );
}
