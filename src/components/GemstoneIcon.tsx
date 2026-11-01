import React from 'react';

interface GemstoneIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const GemstoneIcon: React.FC<GemstoneIconProps> = ({ name, className = 'w-6 h-6', size }) => {
  const normalized = (name || '').toLowerCase().trim();
  const style = size ? { width: size, height: size } : undefined;

  switch (normalized) {
    case 'ruby':
      // Faceted Brilliant Ruby with deep crimson gradients and glistening facets
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="ruby-main" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="40%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
            <linearGradient id="ruby-glint" x1="8" y1="4" x2="24" y2="16" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="ruby-dark" x1="16" y1="16" x2="16" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#9f1239" />
              <stop offset="100%" stopColor="#4c0519" />
            </linearGradient>
          </defs>
          {/* Base Diamond/Shield Silhouette */}
          <path
            d="M9 4L23 4L29 12L16 29L3 12L9 4Z"
            fill="url(#ruby-main)"
            stroke="#fda4af"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Top Table Facet */}
          <polygon
            points="11,7 21,7 24,12 16,15 8,12"
            fill="#f43f5e"
            fillOpacity="0.8"
            stroke="#fecdd3"
            strokeWidth="0.6"
          />
          {/* Side Crown Triangles */}
          <polygon points="9,4 11,7 8,12 3,12" fill="#be123c" fillOpacity="0.7" />
          <polygon points="23,4 21,7 24,12 29,12" fill="#be123c" fillOpacity="0.7" />
          <polygon points="9,4 23,4 21,7 11,7" fill="url(#ruby-glint)" />
          {/* Lower Pavilion Triangular Facets */}
          <polygon points="8,12 16,15 16,29 3,12" fill="url(#ruby-dark)" fillOpacity="0.85" />
          <polygon points="24,12 16,15 16,29 29,12" fill="#9f1239" fillOpacity="0.9" />
          <polygon points="16,15 20,22 16,29 12,22" fill="#e11d48" fillOpacity="0.95" />
          {/* Specular Star Glint */}
          <circle cx="12" cy="8" r="1.5" fill="#ffffff" fillOpacity="0.9" />
          <path d="M12 5V11M9 8H15" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      );

    case 'gold':
      // Radiant Faceted Golden Star Medallion / Jewel
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="gold-grad" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="gold-bright" x1="10" y1="6" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {/* Outer Octagram Crest */}
          <path
            d="M16 2L20.2 7.8L27.3 6.7L26.2 13.8L31 18L25.2 22.2L26.3 29.3L19.2 28.2L16 32L12.8 28.2L5.7 29.3L6.8 22.2L1 18L5.8 13.8L4.7 6.7L11.8 7.8L16 2Z"
            fill="url(#gold-grad)"
            stroke="#fef9c3"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Inner Faceted Diamond Inset */}
          <polygon
            points="16,7 23,16 16,25 9,16"
            fill="#ca8a04"
            stroke="#fef08a"
            strokeWidth="0.7"
          />
          {/* Beveled Facets */}
          <polygon points="16,7 23,16 16,16" fill="url(#gold-bright)" />
          <polygon points="9,16 16,16 16,25" fill="#713f12" fillOpacity="0.7" />
          <polygon points="16,16 23,16 16,25" fill="#a16207" />
          <polygon points="9,16 16,7 16,16" fill="#facc15" />
          {/* Specular Shimmer */}
          <circle cx="16" cy="11" r="1.5" fill="#ffffff" />
          <path d="M16 8.5V13.5M13.5 11H18.5" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      );

    case 'diamond':
      // Classic Brilliant Octagonal Prismatic Diamond (Cyan & Ice White)
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="dia-main" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="dia-shine" x1="6" y1="5" x2="26" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {/* Outer Diamond Contour */}
          <path
            d="M7 6L25 6L30 13L16 29L2 13L7 6Z"
            fill="url(#dia-main)"
            stroke="#e0f2fe"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Upper Table */}
          <polygon
            points="10,8 22,8 25,13 16,15 7,13"
            fill="url(#dia-shine)"
            stroke="#bae6fd"
            strokeWidth="0.6"
          />
          {/* Crown Triangular Facets */}
          <polygon points="7,6 10,8 7,13 2,13" fill="#0284c7" fillOpacity="0.6" />
          <polygon points="25,6 22,8 25,13 30,13" fill="#0284c7" fillOpacity="0.6" />
          <polygon points="7,6 25,6 22,8 10,8" fill="#e0f2fe" fillOpacity="0.85" />
          {/* Lower Pavilion Facets */}
          <polygon points="7,13 16,15 16,29 2,13" fill="#075985" fillOpacity="0.8" />
          <polygon points="25,13 16,15 16,29 30,13" fill="#0369a1" fillOpacity="0.8" />
          <polygon points="16,15 20,21 16,29 12,21" fill="#38bdf8" fillOpacity="0.9" />
          {/* Sparkle Glint */}
          <circle cx="11" cy="9" r="1.3" fill="#ffffff" />
          <path d="M11 6.5V11.5M8.5 9H13.5" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      );

    case 'emerald':
      // Step-Cut Octagonal Rectangular Emerald (Rich Forest & Radiant Mint)
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="em-base" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id="em-glint" x1="8" y1="6" x2="24" y2="18" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Outer Beveled Rectangle */}
          <path
            d="M9 4L23 4L28 9L28 23L23 28L9 28L4 23L4 9L9 4Z"
            fill="url(#em-base)"
            stroke="#a7f3d0"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Middle Step */}
          <polygon
            points="10,7 22,7 25,10 25,22 22,25 10,25 7,22 7,10"
            fill="#059669"
            stroke="#6ee7b7"
            strokeWidth="0.6"
          />
          {/* Center Table */}
          <polygon
            points="12,10 20,10 22,12 22,20 20,22 12,22 10,20 10,12"
            fill="url(#em-glint)"
            stroke="#d1fae5"
            strokeWidth="0.6"
          />
          {/* Inner Facet Shading */}
          <polygon points="10,7 22,7 20,10 12,10" fill="#ffffff" fillOpacity="0.4" />
          <polygon points="7,10 10,12 10,20 7,22" fill="#047857" />
          <polygon points="25,10 28,9 28,23 25,22" fill="#064e3b" />
          <polygon points="10,25 22,25 20,22 12,22" fill="#022c22" fillOpacity="0.8" />
          {/* Corner Specular Flare */}
          <circle cx="12" cy="11" r="1.2" fill="#ffffff" />
          <path d="M12 9V13M10 11H14" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      );

    case 'amethyst':
      // Mystical Hexagonal Double-Pointed Amethyst Crystal
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="ame-base" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#e9d5ff" />
              <stop offset="35%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#581c87" />
            </linearGradient>
            <linearGradient id="ame-facet" x1="8" y1="4" x2="24" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Hexagonal Crystal Contour */}
          <path
            d="M16 2L26 8L26 24L16 30L6 24L6 8L16 2Z"
            fill="url(#ame-base)"
            stroke="#f3e8ff"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Crystal Vertical Ribs & Facets */}
          <polygon points="16,2 26,8 20,16 16,10" fill="#c084fc" fillOpacity="0.8" />
          <polygon points="16,2 16,10 12,16 6,8" fill="url(#ame-facet)" />
          <polygon points="6,8 12,16 12,26 6,24" fill="#7e22ce" fillOpacity="0.8" />
          <polygon points="26,8 26,24 20,26 20,16" fill="#6b21a8" fillOpacity="0.9" />
          <polygon points="12,16 20,16 20,26 16,30 12,26" fill="#9333ea" />
          {/* Center Table Rhombus */}
          <polygon points="16,10 20,16 16,22 12,16" fill="#d8b4fe" fillOpacity="0.9" stroke="#f3e8ff" strokeWidth="0.5" />
          {/* Crystal Apex Glint */}
          <circle cx="16" cy="6" r="1.3" fill="#ffffff" />
          <path d="M16 3.5V8.5M13.5 6H18.5" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      );

    case 'topaz':
      // Sunny Amber Trilliant / Kite Cut Topaz
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="top-base" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#a16207" />
            </linearGradient>
            <linearGradient id="top-glint" x1="10" y1="5" x2="22" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0.15" />
            </linearGradient>
          </defs>
          {/* Trilliant Contour */}
          <path
            d="M16 3L29 14L22 28L10 28L3 14L16 3Z"
            fill="url(#top-base)"
            stroke="#fef9c3"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Triangular Table */}
          <polygon
            points="16,8 24,15 16,21 8,15"
            fill="url(#top-glint)"
            stroke="#fde047"
            strokeWidth="0.6"
          />
          {/* Triangular Facets */}
          <polygon points="16,3 16,8 8,15 3,14" fill="#ca8a04" fillOpacity="0.6" />
          <polygon points="16,3 29,14 24,15 16,8" fill="#facc15" fillOpacity="0.8" />
          <polygon points="3,14 8,15 10,28" fill="#a16207" fillOpacity="0.85" />
          <polygon points="29,14 22,28 16,21 24,15" fill="#854d0e" fillOpacity="0.85" />
          <polygon points="8,15 16,21 16,28 10,28" fill="#eab308" />
          <polygon points="16,21 22,28 16,28" fill="#ca8a04" />
          {/* Star Sparkle */}
          <circle cx="16" cy="12" r="1.4" fill="#ffffff" />
          <path d="M16 9.5V14.5M13.5 12H18.5" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" />
        </svg>
      );

    case 'quartz':
      // Crystalline Obelisk Quartz Prism Cluster (Platinum & Ice Slate)
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="qtz-base" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="30%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="qtz-shine" x1="10" y1="5" x2="22" y2="25" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Primary Sharp Crystal Spire */}
          <path
            d="M16 3L23 10L22 28L10 28L9 10L16 3Z"
            fill="url(#qtz-base)"
            stroke="#f1f5f9"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Left Lateral Facet */}
          <polygon points="16,3 13,11 10,10 9,10" fill="#64748b" fillOpacity="0.5" />
          {/* Main Facet Plane */}
          <polygon points="16,3 19,11 13,11" fill="url(#qtz-shine)" stroke="#e2e8f0" strokeWidth="0.5" />
          {/* Right Lateral Facet */}
          <polygon points="16,3 23,10 19,11" fill="#94a3b8" fillOpacity="0.7" />
          {/* Column Facets */}
          <polygon points="9,10 13,11 13,28 10,28" fill="#475569" fillOpacity="0.8" />
          <polygon points="13,11 19,11 19,28 13,28" fill="#cbd5e1" fillOpacity="0.85" />
          <polygon points="19,11 23,10 22,28 19,28" fill="#334155" fillOpacity="0.9" />
          {/* Secondary Crystal Shard Left */}
          <path
            d="M5 14L8 11L10 16L9 26L5 26L4 20L5 14Z"
            fill="#94a3b8"
            fillOpacity="0.85"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          {/* Secondary Crystal Shard Right */}
          <path
            d="M27 15L24 12L22 17L23 27L27 27L28 21L27 15Z"
            fill="#64748b"
            fillOpacity="0.8"
            stroke="#cbd5e1"
            strokeWidth="0.6"
          />
          {/* Apex Glint */}
          <circle cx="16" cy="7" r="1.2" fill="#ffffff" />
          <path d="M16 4.5V9.5M13.5 7H18.5" stroke="#ffffff" strokeWidth="0.6" strokeLinecap="round" />
        </svg>
      );

    case 'obsidian':
    default:
      // Volcanic Glass Polygonal Geode Shard
      return (
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          style={style}
        >
          <defs>
            <linearGradient id="obs-base" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#020617" />
            </linearGradient>
            <linearGradient id="obs-glint" x1="8" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Angular Shard Polygon */}
          <path
            d="M14 4L24 7L28 17L20 28L8 27L4 16L8 8L14 4Z"
            fill="url(#obs-base)"
            stroke="#64748b"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          {/* Chiseled Facets */}
          <polygon points="14,4 18,12 8,8" fill="url(#obs-glint)" />
          <polygon points="14,4 24,7 18,12" fill="#334155" fillOpacity="0.85" />
          <polygon points="24,7 28,17 18,16 18,12" fill="#0f172a" fillOpacity="0.9" />
          <polygon points="28,17 20,28 16,21 18,16" fill="#020617" />
          <polygon points="20,28 8,27 12,20 16,21" fill="#1e293b" fillOpacity="0.9" />
          <polygon points="8,27 4,16 10,15 12,20" fill="#0f172a" fillOpacity="0.8" />
          <polygon points="4,16 8,8 18,12 10,15" fill="#475569" fillOpacity="0.6" />
          {/* Sharp Edge Highlight */}
          <path d="M14 4L18 12L16 21" stroke="#cbd5e1" strokeWidth="0.7" strokeLinecap="round" />
          <circle cx="17" cy="11" r="1.1" fill="#ffffff" fillOpacity="0.9" />
        </svg>
      );
  }
};
