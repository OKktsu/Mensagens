---
name: Electric Obsidian
colors:
  surface: '#121319'
  surface-dim: '#121319'
  surface-bright: '#383940'
  surface-container-lowest: '#0d0e14'
  surface-container-low: '#1a1b22'
  surface-container: '#1e1f26'
  surface-container-high: '#292930'
  surface-container-highest: '#34343b'
  on-surface: '#e3e1eb'
  on-surface-variant: '#cbc3d7'
  inverse-surface: '#e3e1eb'
  inverse-on-surface: '#2f3037'
  outline: '#958ea0'
  outline-variant: '#494454'
  surface-tint: '#d0bcff'
  primary: '#d0bcff'
  on-primary: '#3c0091'
  primary-container: '#a078ff'
  on-primary-container: '#340080'
  inverse-primary: '#6d3bd7'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#4cd7f6'
  on-tertiary: '#003640'
  tertiary-container: '#009eb9'
  on-tertiary-container: '#002f38'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#121319'
  on-background: '#e3e1eb'
  surface-variant: '#34343b'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 3.5rem
    fontWeight: '800'
    lineHeight: 4rem
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '800'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.5rem
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.5rem
    fontWeight: '700'
    lineHeight: 2rem
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.0625rem
    fontWeight: '400'
    lineHeight: 1.65rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0.005em
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.04em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.06em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  gutter-mobile: 0.75rem
  gutter-desktop: 1.5rem
  sidebar-compact: 4.5rem
  sidebar-expanded: 17.5rem
  chat-max-width: 64rem
---

## Brand & Style

This design system delivers a futuristic, focused, and elevated communication environment. Departing from dated gaming-centric chat clones, it embodies a **cyberpunk-minimalist** ethos: clinical precision meets vibrant electronic energy. It is tailored for digital creators, engineers, autonomous teams, and tech-forward subcultures who require high-density visual clarity without aesthetic sterility.

Key characteristics:
- **Atmospheric Depth:** Deep obsidian backdrops grounded in absolute black and midnight navy, creating boundless contrast for glowing accents.
- **Controlled Luminescence:** Neon electric violets and vivid purples are used as functional signals and purposeful highlights, rather than visual noise.
- **Glass & Frost:** Translucent frosted dark panels, hairline luminous borders, and refined refraction that maintain spatial separation across real-time feeds, audio stages, and threaded discussions.

## Colors

The palette establishes an ultra-dark visual hierarchy where glowing violet-spectrum hues command immediate focus.

- **Primary (`#8b5cf6`)**: Vibrant electric violet. Primary actions, active voice indicators, presence halos, and focal call-to-actions.
- **Secondary (`#a855f7`)**: Vivid electric purple accent. Used for interactive states, reactive user pings, and elevated badges.
- **Tertiary (`#06b6d4`)**: Electric cyan. Reserved exclusively for live audio streams, active screen shares, and system telemetry alerts.
- **Neutrals**:
  - `Base / Obsidian Darkest`: `#090a10` (Root application canvas).
  - `Surface / Midnight`: `#0f111a` (Sidebar, panel surfaces, modal backdrops).
  - `Elevated / Deep Indigo`: `#161826` (Floating cards, chat bubbles, input fields).
  - `Border / Hairline Glow`: `rgba(139, 92, 246, 0.18)` and neutral fallbacks `rgba(255, 255, 255, 0.07)`.
  - `Text Primary`: `#f8fafc`.
  - `Text Muted`: `#94a3b8`.

## Typography

The type system blends the contemporary legibility of **Plus Jakarta Sans** for conversations and headers with the sharp, technical rhythm of **Space Grotesk** for status indicators, timestamps, metadata, and controls.

- **Headlines & Display:** Tightly tracked with generous line heights to avoid collision in fast-scrolling message headers or room titles.
- **Body:** Calibrated specifically for long read times in ambient low-light interfaces, featuring a soft sub-white tone (`#cbd5e1` to `#f8fafc`) to eliminate eye strain.
- **Labels & Telemetry:** Space Grotesk in uppercase or semi-expanded tracking provides a cyber-instrument aesthetic on voice channel metrics, connection health, and role pills.

## Layout & Spacing

The architecture operates on an adaptive multi-pane layout model tuned for concurrent communications:

- **Structural Composition:**
  - **Primary Rail (Compact):** `4.5rem` fixed width for global server/workspace switching.
  - **Sub-navigation (Expanded):** `17.5rem` channel hierarchy, direct messages, and voice lobbies. Collapsible to 0 on viewport widths below `1024px`.
  - **Feed Stage:** Fluid stream anchored by a readable content cap (`64rem`) to prevent horizontal message stretching on ultra-wide panels.
  - **Context Panel / Voice Inspector:** `20rem` sliding canvas for call participants, user cards, and media threads.
- **Rhythm:** An 8-point base unit grid governs margins and structural containers; a 4-point micro-scale is used for compact inline chat chips, reactions, and timestamp locks.
- **Breakpoints:**
  - `Mobile (< 768px)`: Single active view with swipe-out panel navigation and floating compact voice pills.
  - `Tablet (768px - 1023px)`: Dual-pane view (Channel list overlay + Active stream).
  - `Desktop (>= 1024px)`: Persistent 3-column unified console.

## Elevation & Depth

Visual hierarchy uses frosted dark surfaces combined with selective luminescence rather than conventional dropshadows:

- **Surface Layers:**
  - **Level 0 (Canvas):** Base `#090a10`, flat, no blur.
  - **Level 1 (Sub-Panels):** `#0f111a` with 80% opacity and `backdrop-filter: blur(16px)`. Border: 1px solid `rgba(255, 255, 255, 0.05)`.
  - **Level 2 (Cards & Active Bubbles):** `#161826` with 70% opacity and `backdrop-filter: blur(24px)`. Border: 1px solid `rgba(139, 92, 246, 0.2)`.
  - **Level 3 (Modals, Overlays, Floating Dock):** `#1a1d2e` with 90% opacity, `backdrop-filter: blur(32px)`. Outlined with a dual border: an interior hairline `rgba(255, 255, 255, 0.1)` and an exterior ambient glow `0 0 24px -4px rgba(124, 58, 237, 0.3)`.
- **Glow Signifiers:** When users speak, rooms are active, or high-priority events fire, elements acquire a subtle inner shadow (`inset 0 0 12px rgba(139, 92, 246, 0.15)`) coupled with a soft atmospheric neon aura (`0 0 16px rgba(168, 85, 247, 0.35)`).

## Shapes

The design system employs a refined geometric curve framework:
- Default surfaces, embeds, message cards, and modals sit at `0.5rem` (Base 2).
- Large viewports, dialogs, and video tiles shift to `1rem` (`rounded-lg`).
- Interactive pills, status indicators, audio meters, voice action chips, and reaction counts adopt continuous capsule geometry (`rounded-full` / `9999px`).
- Avatar frames reject generic circular masks in favor of smoothed squircle geometry (`rounded-xl` with high smoothing) to heighten the high-tech, modern feel.

## Components

### Buttons
- **Primary:** Gradient fill from `#7c3aed` to `#8b5cf6`, high-contrast white text, subtle upper edge highlight (`inset 0 1px 0 rgba(255,255,255,0.2)`), subtle purple outer glow on hover (`0 0 16px rgba(139,92,246,0.4)`).
- **Secondary / Glass:** Background `rgba(22, 24, 38, 0.6)`, border `1px solid rgba(139, 92, 246, 0.25)`, text `#f8fafc`. Hover triggers background `rgba(139, 92, 246, 0.15)` and border color `#a855f7`.
- **Ghost:** Transparent canvas, muted slate text, transitioning to violet glow on hover.

### Chat Bubbles & Thread Streams
- **Incoming Messages:** Borderless dark surface (`rgba(22, 24, 38, 0.7)`), crisp white text, left edge accented by a delicate hairline indicator on hover.
- **Outgoing Messages:** Dark indigo backdrop (`rgba(124, 58, 237, 0.18)`), framed with `1px solid rgba(139, 92, 246, 0.35)`.
- **System & Thread Embeds:** Left-bordered with a 2px solid `#8b5cf6` accent, matte `#0f111a` background, monospace metadata caps.

### Chips & Pill Badges
- **Pills:** Full capsule radius (`9999px`), padding `0.25rem 0.625rem`. Space Grotesk uppercase labeling.
- **Presence Indicators:** Live glowing dot (`#10b981` online, `#8b5cf6` in-voice, `#ef4444` dnd) equipped with a dynamic concentric ping keyframe animation.

### Voice & Call Controls
- **Floating Stage Dock:** Glassmorphic pill (`rgba(15, 17, 26, 0.85)` + `blur(24px)`) containing rounded icon toggles for mute, deafen, camera, screen-share, and disconnect.
- **Disconnect Button:** Desaturated neon crimson (`rgba(239, 68, 68, 0.15)`), border `1px solid rgba(239, 68, 68, 0.4)`, text `#fca5a5`.
- **Audio Waveforms:** Multi-bar vertical equalizer constructed from primary electric violet bars that scale dynamically via CSS variable transforms, culminating in a tertiary cyan crest (`#06b6d4`) when volume peaks.

### Input Fields
- Dark inset containers (`#090a10` with 60% opacity), `1px solid rgba(255, 255, 255, 0.08)`.
- Focus state activates an electric purple perimeter glow: `border-color: #8b5cf6`, `box-shadow: 0 0 0 1px #8b5cf6, 0 0 16px rgba(139, 92, 246, 0.25)`.
- Action triggers (emojis, file attachments, voice memos) sit inside the input perimeter as desaturated icons that light up violet on hover.

### Selection Controls (Checkboxes & Radios)
- Squircle checkboxes (`rounded-[4px]`) and circular radio discs with obsidian base fills.
- Checked state: `#8b5cf6` solid fill housing a sharp white checkmark or inner dot, surrounded by an ambient purple bloom.