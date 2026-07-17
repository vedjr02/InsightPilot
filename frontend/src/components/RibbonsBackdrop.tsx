"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Ribbons = dynamic(() => import("@/components/Ribbons"), { ssr: false });

type RibbonsBackdropProps = {
  active?: boolean;
};

function readAccentColors(): string[] {
  if (typeof window === "undefined") return ["#1f5c4f", "#3d8f7c"];
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue("--accent").trim() || "#1f5c4f";
  const hover = styles.getPropertyValue("--accent-hover").trim() || accent;
  return [accent, hover, accent];
}

export function RibbonsBackdrop({ active = true }: RibbonsBackdropProps) {
  const [colors, setColors] = useState<string[]>(["#1f5c4f", "#17483e", "#3d8f7c"]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setColors(readAccentColors());
    const observer = new MutationObserver(() => setColors(readAccentColors()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  if (!active || reduceMotion) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-70"
    >
      <div className="pointer-events-auto h-full w-full">
        <Ribbons
          colors={colors}
          baseThickness={8}
          speedMultiplier={0.5}
          maxAge={500}
          enableFade={false}
          enableShaderEffect
          effectAmplitude={1.4}
          offsetFactor={0.04}
          baseSpring={0.03}
          baseFriction={0.9}
        />
      </div>
    </div>
  );
}
