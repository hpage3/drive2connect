"use client";

import { useEffect } from "react";

/**
 * AdPlayer Component
 *
 * Props:
 *  - src: string (audio file URL, default "/RoameoRoam.mp3")
 *  - onEnded: function (callback when ad finishes)
 *  - autoPlay: boolean (default true)
 */
export default function AdPlayer({ src = "/RoameoRoam.mp3", onEnded, autoPlay = true }) {
  useEffect(() => {
    if (!autoPlay) return;

    const audio = new Audio(src);
    audio.play();

    if (onEnded) {
      audio.addEventListener("ended", onEnded);
    }

    return () => {
      if (onEnded) {
        audio.removeEventListener("ended", onEnded);
      }
      audio.pause();
    };
  }, [src, autoPlay, onEnded]);

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 
                    bg-black/70 text-white px-4 py-2 rounded-lg z-50 text-sm">
      Playing sponsored message…
    </div>
  );
}
