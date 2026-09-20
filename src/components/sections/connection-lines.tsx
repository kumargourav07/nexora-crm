"use client";

import * as React from "react";

interface ConnectionLinesProps {
  className?: string;
  particleGroupRef?: React.RefObject<SVGGElement | null>;
}

export function ConnectionLines({
  className,
  particleGroupRef,
}: ConnectionLinesProps) {
  return (
    <svg
      viewBox="0 0 1000 680"
      className={className || "absolute inset-0 w-full h-full pointer-events-none -z-0"}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.9" />
        </linearGradient>

        <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Decorative Lead Flow Path Markers */}
      <g className="opacity-40 text-[9px] font-mono fill-blue-300 select-none">
        <text x="508" y="190">NEW LEAD</text>
        <text x="320" y="210">AUTO-SYNC</text>
        <text x="270" y="332">INBOUND</text>
        <text x="320" y="475">LEAD CAPTURE</text>
        <text x="610" y="210">INQUIRY</text>
        <text x="660" y="332">LEAD SYNC</text>
        <text x="610" y="475">MESSAGE</text>
        <text x="508" y="500">API HOOK</text>
      </g>

      {/* Connection Lines to Center (X: 500, Y: 340) */}
      {/* 1. Top-Center (Facebook Lead Ads) */}
      <path
        id="path-fb"
        d="M 500,105 L 500,260"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 2. Top-Left (Website Forms) */}
      <path
        id="path-web"
        d="M 230,135 Q 350,220 440,285"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 3. Mid-Left (IndiaMART) */}
      <path
        id="path-im"
        d="M 180,340 L 410,340"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 4. Bottom-Left (Google Ads) */}
      <path
        id="path-gads"
        d="M 230,545 Q 350,460 440,395"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 5. Top-Right (99acres) */}
      <path
        id="path-99"
        d="M 770,135 Q 650,220 560,285"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 6. Mid-Right (Housing.com) */}
      <path
        id="path-housing"
        d="M 820,340 L 590,340"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 7. Bottom-Right (WhatsApp) */}
      <path
        id="path-wa"
        d="M 770,545 Q 650,460 560,395"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* 8. Bottom-Center (Custom API) */}
      <path
        id="path-api"
        d="M 500,575 L 500,420"
        className="connector-svg-line"
        fill="none"
        stroke="url(#lineGrad)"
        strokeWidth="2"
        strokeDasharray="4 4"
      />

      {/* Animated Particles flowing along paths */}
      <g ref={particleGroupRef} filter="url(#particleGlow)">
        {/* FB Particle */}
        <circle r="4" fill="#60A5FA" className="lead-data-particle">
          <animateMotion dur="2.4s" repeatCount="indefinite" path="M 500,105 L 500,260" />
        </circle>

        {/* Web Particle */}
        <circle r="4" fill="#38BDF8" className="lead-data-particle">
          <animateMotion dur="2.8s" repeatCount="indefinite" path="M 230,135 Q 350,220 440,285" />
        </circle>

        {/* IndiaMART Particle */}
        <circle r="4" fill="#34D399" className="lead-data-particle">
          <animateMotion dur="2.2s" repeatCount="indefinite" path="M 180,340 L 410,340" />
        </circle>

        {/* Google Ads Particle */}
        <circle r="4" fill="#F87171" className="lead-data-particle">
          <animateMotion dur="2.6s" repeatCount="indefinite" path="M 230,545 Q 350,460 440,395" />
        </circle>

        {/* 99acres Particle */}
        <circle r="4" fill="#38BDF8" className="lead-data-particle">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M 770,135 Q 650,220 560,285" />
        </circle>

        {/* Housing Particle */}
        <circle r="4" fill="#FBBF24" className="lead-data-particle">
          <animateMotion dur="2.1s" repeatCount="indefinite" path="M 820,340 L 590,340" />
        </circle>

        {/* WhatsApp Particle */}
        <circle r="4" fill="#34D399" className="lead-data-particle">
          <animateMotion dur="2.7s" repeatCount="indefinite" path="M 770,545 Q 650,460 560,395" />
        </circle>

        {/* API Particle */}
        <circle r="4" fill="#818CF8" className="lead-data-particle">
          <animateMotion dur="2.3s" repeatCount="indefinite" path="M 500,575 L 500,420" />
        </circle>
      </g>
    </svg>
  );
}
