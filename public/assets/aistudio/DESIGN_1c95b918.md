---
name: Kinetic Glass
colors:
  surface: '#11131c'
  surface-dim: '#11131c'
  surface-bright: '#373943'
  surface-container-lowest: '#0c0e17'
  surface-container-low: '#191b24'
  surface-container: '#1d1f29'
  surface-container-high: '#282933'
  surface-container-highest: '#32343e'
  on-surface: '#e1e1ef'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e1e1ef'
  inverse-on-surface: '#2e303a'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#adc6ff'
  on-tertiary: '#002e6a'
  tertiary-container: '#4d8eff'
  on-tertiary-container: '#00285d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#11131c'
  on-background: '#e1e1ef'
  surface-variant: '#32343e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system is crafted for high-velocity creators, video editors, and digital agencies transforming long-form video content into viral vertical shorts. The interface evokes effortless technological mastery, precision, and high-end studio luxury. Users should feel empowered, focused, and immersed in a futuristic workspace where AI handles the heavy lifting without sacrificing creative control.

The aesthetic fuses **Refined Dark SaaS Minimal** with **Modern Glassmorphism** and subtle volumetric ambient depth. The visual framework avoids aggressive, noisy cyberpunk cliches in favor of deep spatial layers, muted charcoal tones, and precise luminous accents. Luminescent gradients—shifting from deep purple to hyper-saturated cyan—act as energetic signifiers for AI processing, key actions, and viral score metrics. Frosted surfaces, razor-thin translucent boundaries, and controlled ambient glows create a tactile, hardware-grade software experience.

## Colors

The palette is engineered around an ultra-dark spatial hierarchy, ensuring maximum contrast for vibrant video previews and AI-driven metrics.

- **Canvas & Backgrounds:**
  - Base Stage: `#0B0C10` (Deep obsidian, infinite ground)
  - Surface Neutral: `#12141D` (Standard panels, sidebars, secondary regions)
  - Elevated Container: `#1A1D28` (Cards, drawers, modals, floating inspectors)
  - Elevated Overlay: `rgba(26, 29, 40, 0.75)` (Glass surfaces with backdrop filter)

- **Accents & Luminescence:**
  - **Primary (Electric Violet / Purple):** `#8B5CF6` (Active states, key generative actions, conversion CTAs) with `#7C3AED` as the pressed/hover companion.
  - **Secondary (Cyan Spark):** `#06B6D4` (High-confidence AI detections, face-tracking nodes, viral spikes).
  - **Tertiary (Cobalt Blue):** `#3B82F6` (Informational cues, secondary tags, progress bars).

- **Borders & Translucency:**
  - Surface Stroke: `rgba(255, 255, 255, 0.08)` for standard card definition.
  - Interactive Hover Stroke: `rgba(255, 255, 255, 0.16)`.
  - Radiant Accent Stroke: Linear gradient from `rgba(139, 92, 246, 0.4)` to `rgba(6, 182, 212, 0.2)`.

- **Text & Foreground Hierarchy:**
  - High Emphasis: `#F9FAFB` (Headers, essential metric values)
  - Medium Emphasis: `#94A3B8` (Labels, metadata, timestamps)
  - Low Emphasis: `#64748B` (Inactive states, placeholders, subtle borders)

## Typography

The design system relies on **Inter** across all typographical layers to guarantee programmatic balance, razor-sharp legibility on retina displays, and neutral precision. 

- **Display & Headlines:** Tighter tracking (`-0.01em` to `-0.03em`) provides an authoritative editorial posture for SaaS hero metrics, batch clip generation totals, and video titles.
- **Body & Data:** Standard letter spacing at `14px` and `16px` optimizes scanning through multi-line AI transcripts, speaker diarization cards, and render logs.
- **Micro-Labels & Meta:** Heavy weights (`500`–`600`) with expanded tracking (`0.02em`–`0.04em`) are utilized for timeline tags, 9:16 aspect ratio markers, viral score pills, and status chips.

## Layout & Spacing

The layout operates on a strict 8px base grid rhythm (with a 4px sub-grid for tight micro-elements like badges and icons). 

- **Grid Architecture:**
  - **Desktop (1280px+):** Fluid 12-column structure with `1.5rem` (`24px`) gutters and max content constraints of `1440px`. Dedicated collapsible panels for clip timelines, transcript inspects, and device simulator previews.
  - **Tablet (768px - 1279px):** 8-column layout. Tools and transcript switch into a stacked or sliding drawer format.
  - **Mobile (< 768px):** 4-column layout with `1rem` outer margins. Prioritizes a vertically aligned mobile-first workflow: top video preview, bottom action sheet, horizontal timeline scrubs. Touch targets must never shrink below `44x44px`.

- **Rhythm & Structure:**
  - Card interior spacing is standardized to `space-md` (`16px`) for sub-components and `space-lg` (`24px`) for primary dashboard cards.
  - Gap spacing between stacked clip cards uses `space-md`, maintaining structural cohesion while allowing ambient glows to bleed cleanly.

## Elevation & Depth

Visual hierarchy is communicated through translucent stratification, subtle 1px luminous perimeter outlines, and soft atmospheric backdrops.

- **Stacking Tiers:**
  - **Level 0 (Canvas):** Pure `#0B0C10`.
  - **Level 1 (Docked Structural Elements):** Side navigation, inspector panels, timeline tracks set to `#12141D` with a right/top hairline border `rgba(255, 255, 255, 0.05)`.
  - **Level 2 (Active Cards & Modules):** Surface `#1A1D28` layered with `backdrop-filter: blur(16px)` and an outline of `1px solid rgba(255, 255, 255, 0.08)`.
  - **Level 3 (Interactive Modals & Overlays):** Semi-opaque background `rgba(26, 29, 40, 0.85)` with `backdrop-filter: blur(24px)`, framed by `rgba(255, 255, 255, 0.12)`.

- **Ambient Luminescence & Shadows:**
  - **Card Hover Elevation:** `0 12px 32px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.12)`.
  - **Primary Glow Elevation (CTA / AI Processing):** `0 0 24px -4px rgba(139, 92, 246, 0.45), 0 8px 16px -4px rgba(139, 92, 246, 0.3)`.
  - **Secondary Glow Elevation (Score Highlighting):** `0 0 20px -4px rgba(6, 182, 212, 0.35)`.

## Shapes

The geometric signature is grounded in smooth, substantial radii that soften the dense data presentation and frame 9:16 vertical video modules gracefully.

- **Standard Containers (`rounded-lg` / 16px):** Used for tool panels, clip cards, video timeline containers, and code/transcript blocks.
- **Large Hero Containers (`rounded-xl` / 24px):** Used for primary dialogs, viral prediction summaries, and video player canvases.
- **Controls & Buttons (`rounded` / 8px):** Form fields, standard tool triggers, selection chips, and list rows use an 8px border-radius to preserve geometric tension against larger cards.
- **Badges & Switches (Pill):** AI confidence badges, timecodes, and processing pills maintain fully rounded capsule geometries.

## Components

- **Buttons:**
  - *Primary (AI Magic Action):* Background gradient from `#8B5CF6` to `#7C3AED`, color `#FFFFFF`, font `label-md`. Shadow: `0 0 20px rgba(139, 92, 246, 0.4)`. Hover: upward shift of 1px and enhanced cyan edge highlight. Minimum height `44px`.
  - *Secondary / Ghost:* Background `rgba(255, 255, 255, 0.04)`, border `1px solid rgba(255, 255, 255, 0.08)`. Hover: `background: rgba(255, 255, 255, 0.08)`, border `rgba(255, 255, 255, 0.18)`.

- **Cards (Generated Clip Cards):**
  - Constructed with `20px` border radius, `#1A1D28` background with `8px` inner glass padding. Holds a 9:16 vertical frame preview.
  - Border: `1px solid rgba(255, 255, 255, 0.08)`.
  - Top-right corner anchors the **Virality Score Badge**: Pill shape, black translucent base, glowing cyan text (`#06B6D4`) with a soft matching ambient glow.

- **Chips & Tags:**
  - Height `28px`, radius `9999px`. Subtle dark filling `rgba(255, 255, 255, 0.05)`, border `rgba(255, 255, 255, 0.1)`. Font `label-sm`.
  - Active/Selected state: border `#8B5CF6`, background `rgba(139, 92, 246, 0.15)`, text `#F9FAFB`.

- **Input Fields (URL Ingestion & Prompts):**
  - Height `48px` (touch-optimized), radius `12px`.
  - Surface `#12141D`, inset stroke `1px solid rgba(255, 255, 255, 0.08)`.
  - Focus state: Outline transitions to a dual gradient ring of `#8B5CF6` and `#06B6D4` with `0 0 12px rgba(139, 92, 246, 0.25)`. Placeholder text in `#64748B`.

- **Checkboxes & Radios:**
  - `20x20px` squircle with `4px` radius for checkboxes; full circle for radios.
  - Inactive: Border `rgba(255, 255, 255, 0.2)`, background `transparent`.
  - Checked: Primary purple fill (`#8B5CF6`) with a crisp white check glyph and localized `4px` purple halo.

- **Specialized Components:**
  - *Waveform Timeline Scrub:* Deep charcoal trough (`#0B0C10`) with glowing violet waveform peaks; draggable active playhead adorned with a cyan laser-line vertical marker.
  - *Transcript Highlight Node:* Clickable text segment that illuminates in soft cyan when spoken words align with active vertical video timestamps.