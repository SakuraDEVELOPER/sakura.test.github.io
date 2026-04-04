"use client";

import { m } from "framer-motion";
import { useState } from "react";

type ShowcaseSlide = {
  id: string;
  index: string;
  title: string;
  desc: string;
  mediaOverlayTitle: string;
  mediaCaption: string;
  mediaLabel: string;
  mediaSrc: string;
};

const repoBasePath = "/sakura.github.io";
const assetVersion = "20260324-1";

function withRepoBasePath(path: string, bustCache = false) {
  return `${repoBasePath}${path}${bustCache ? `?v=${assetVersion}` : ""}`;
}

const showcaseSlides: ShowcaseSlide[] = [
  {
    id: "camera",
    index: "01",
    title: "Camera Zoom-Out",
    desc: "Custom camera zoom-out for better map awareness and easier fight control up to 3000 units.",
    mediaOverlayTitle: "Camera Zoom-Out",
    mediaCaption: "Camera zoom-out feature",
    mediaLabel: "Screenshot of the camera zoom-out feature",
    mediaSrc: withRepoBasePath("/camera-preview.jpg", true),
  },
  {
    id: "hud-panel",
    index: "02",
    title: "HP / MP Bars + Skills & Items Panel",
    desc: "Enemy and ally resource bars, plus a skills and items panel in one block, so you can quickly track what they have and keep an advantage.",
    mediaOverlayTitle: "Enemy esp",
    mediaCaption: "HUD with bars, skills, and items",
    mediaLabel: "Screenshot of the HUD with bars, skills, and items",
    mediaSrc: withRepoBasePath("/hud-preview.jpg", true),
  },
];

export default function HomeFeatureShowcase() {
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = showcaseSlides[activeSlide];

  const goToPrevious = () => {
    setActiveSlide((current) => (current - 1 + showcaseSlides.length) % showcaseSlides.length);
  };

  const goToNext = () => {
    setActiveSlide((current) => (current + 1) % showcaseSlides.length);
  };

  return (
    <section id="feature-showcase" className="px-10 pt-2 pb-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-stretch gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <m.div
            key={`copy-${slide.id}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-[420px] flex-col justify-between rounded-[28px] border border-[#ffb7c5]/18 bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.12),transparent_55%),#0d0d0d] p-8 shadow-[0_0_30px_rgba(255,183,197,0.06)]"
          >
            <div>
              <span className="mb-6 inline-flex rounded-full border border-[#ffb7c5]/20 bg-[#1c1217] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.35em] text-[#ffb7c5]">
                {slide.index}
              </span>
              <h3 className="mb-4 text-3xl font-black uppercase tracking-tighter text-white">
                {slide.title}
              </h3>
              <p className="max-w-md text-sm leading-relaxed text-gray-400">{slide.desc}</p>
            </div>

            <div className="rounded-[24px] border border-[#ffb7c5]/14 bg-black/30 p-5">
              <span className="mb-3 block font-mono text-[10px] uppercase tracking-[0.35em] text-[#ffb7c5]/60">
                Preview
              </span>
              <p className="text-sm leading-relaxed text-gray-500">
                Screenshots for this block will be added soon.
              </p>
            </div>
          </m.div>

          <div className="group relative flex items-center px-4 md:px-8 lg:ml-4">
            <button
              type="button"
              onClick={goToPrevious}
              aria-label="Previous card"
              className="absolute -left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffb7c5]/24 bg-transparent text-[#ffb7c5]/90 transition-all duration-200 hover:border-[#ffb7c5]/55 hover:bg-[#1c1217] hover:text-white hover:shadow-[0_0_20px_rgba(255,183,197,0.12)] md:-left-8 lg:pointer-events-none lg:-translate-x-1 lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:translate-x-0 lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-x-0 lg:group-focus-within:opacity-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <m.div
              key={`media-placeholder-${slide.id}`}
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35 }}
              className="w-full"
            >
              <div className="relative overflow-hidden rounded-[32px] border border-[#ffb7c5]/16 bg-[radial-gradient(circle_at_top_left,rgba(255,183,197,0.1),transparent_50%),#090909]">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent"></div>
                <div className="absolute inset-x-8 top-8 flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#ffb7c5]">
                    {slide.mediaOverlayTitle}
                  </span>
                  <span className="rounded-full border border-[#ffb7c5]/20 bg-[#1c1217] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#ffb7c5]/80">
                    Coming soon
                  </span>
                </div>
                <div className="flex aspect-[16/9] items-center justify-center px-8 py-10">
                  <div className="flex w-full max-w-[28rem] flex-col items-center justify-center rounded-[28px] border border-dashed border-[#ffb7c5]/30 bg-black/25 px-8 py-12 text-center shadow-[0_0_26px_rgba(255,183,197,0.05)]">
                    <span className="mb-4 inline-flex rounded-full border border-[#ffb7c5]/20 bg-[#140f12] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#ffb7c5]">
                      Screenshots
                    </span>
                    <p className="text-xl font-black uppercase tracking-[0.04em] text-white">
                      Placeholder
                    </p>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                      The screenshot block is back, but the images themselves will be added later.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                {showcaseSlides.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`Go to card ${index + 1}`}
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide ? "w-8 bg-[#ffb7c5]" : "w-2.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </m.div>

            <button
              type="button"
              onClick={goToNext}
              aria-label="Next card"
              className="absolute -right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-[#ffb7c5]/24 bg-transparent text-[#ffb7c5]/90 transition-all duration-200 hover:border-[#ffb7c5]/55 hover:bg-[#1c1217] hover:text-white hover:shadow-[0_0_20px_rgba(255,183,197,0.12)] md:-right-8 lg:pointer-events-none lg:translate-x-1 lg:opacity-0 lg:group-hover:pointer-events-auto lg:group-hover:translate-x-0 lg:group-hover:opacity-100 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-x-0 lg:group-focus-within:opacity-100"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}


