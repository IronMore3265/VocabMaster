# Design System: IELTS Vocabulary App

## 1. Project Overview
This design system dictates the visual and functional language for a mobile-first IELTS Vocabulary preparation app. The application aims to help users build their English vocabulary for the IELTS exam through structured learning paths, translation tools, and visual dictionaries. The design is optimized for focus, readability, and long study sessions across both iOS and Android platforms.

## 2. Design Philosophy
* **Minimal & Focused:** Cognitive load should be dedicated to learning, not navigating. The UI relies on ample white space and clear visual hierarchies.
* **Approachable & Encouraging:** Using soft, pastel categorical colors creates a friendly, non-intimidating educational environment.
* **Accessible:** High contrast typography and scalable components ensure usability for all users under various lighting conditions (Light & Dark modes).
* **Fluid & Modern:** Highly rounded corners and pill-shaped elements give the app a modern, organic feel.

---

## 3. Color Palette

The color system uses soft pastels for categorization (flashcards, topics) and high-contrast neutrals for readability. 

### Core Neutrals
| Role | Light Mode Hex | Dark Mode Hex | Usage |
| :--- | :--- | :--- | :--- |
| **Background Main** | `#F8F9FA` | `#121212` | App background, main canvas |
| **Surface/Card** | `#FFFFFF` | `#1E1E1E` | Card backgrounds, bottom sheets, nav bars |
| **Text Primary** | `#1A202C` | `#F7FAFC` | Main headings, primary body copy |
| **Text Secondary** | `#718096` | `#A0AEC0` | Subtitles, placeholders, secondary labels |
| **Border/Divider** | `#E2E8F0` | `#2D3748` | Minimal dividers, input borders |

### Categorical Accents (Cards & Features)
*Note: In dark mode, to prevent eye strain, card backgrounds switch to `Surface` (#1E1E1E), and these pastel hexes are applied to the card borders, icons, or subtle glowing gradients.*

| Color Name | Light Mode Hex | Dark Mode Hex (Desaturated) | Usage |
| :--- | :--- | :--- | :--- |
| **Lavender Purple** | `#E1D8FA` | `#B794F4` | "Idioms & Phrases", Literature elements |
| **Sunny Yellow** | `#FDE49E` | `#F6E05E` | "Vegetables, fruits etc." |
| **Sky Blue** | `#A3DDF1` | `#63B3ED` | "Proverbs", Learning packages |
| **Mint Green** | `#8DE5B8` | `#68D391` | Alternative Grammer cards, success states |
| **Peach Orange** | `#FBD0B9` | `#F6AD55` | Secondary topics, alerts |

### Action Colors
| Role | Hex | Usage |
| :--- | :--- | :--- |
| **Primary Action** | `#22C55E` | "Go Premium" buttons, primary CTAs |
| **Primary Hover** | `#16A34A` | Hover state for primary buttons |
| **Primary Active** | `#15803D` | Active/Pressed state for primary buttons |

---

## 4. Typography

The design relies on a clean, geometric, and friendly sans-serif font like **Poppins** (headings) and **Inter** (body) for optimal legibility.

**Font Family Stack:**
* **Headings:** `Poppins`, sans-serif
* **Body:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, sans-serif

**Scale & Weights (Based on 8px Grid):**

| Element | Font Weight | Size | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Heading 1 (H1)** | Bold (700) | `24px` | `32px` | Screen titles (e.g., "Looking for translating?") |
| **Heading 2 (H2)** | SemiBold (600) | `20px` | `28px` | Section headers (e.g., "Visual dictionary") |
| **Heading 3 (H3)** | SemiBold (600) | `16px` | `24px` | Card titles (e.g., "Idioms & Phrases") |
| **Body Primary** | Regular (400) | `14px` | `24px` | Main translation text, general descriptions |
| **Body Small** | Medium (500) | `12px` | `16px` | Secondary text (e.g., "More than 200+ words") |
| **Label / Button** | SemiBold (600) | `16px` | `24px` | Button text, toggle labels |

---

## 5. Spacing & Layout

The app adheres strictly to an **8px grid system** to maintain vertical and horizontal rhythm.

* **Base Unit:** `8px`
* **Screen Margins:** `16px` or `24px` on mobile (left and right).
* **Component Padding (Cards):** `24px` (generous internal padding for breathability).
* **Gap Between Elements:** * Between header and content: `24px`
    * Between stacked cards: `16px`
    * Between icon and text in a row: `12px` or `16px`

---

## 6. Component Library

### 6.1 Buttons (Action Buttons)
Pill-shaped, fully rounded corners for a friendly aesthetic.

* **Shape:** `border-radius: 9999px` (Pill)
* **Padding:** `16px` top/bottom, `32px` left/right.
* **States:**
    * **Default:** Background `#22C55E`, Text `#FFFFFF`
    * **Hover (Web/Mouse):** Background `#16A34A`
    * **Active/Pressed:** Background `#15803D`, scale down by `0.98`
    * **Disabled:** Background `#E2E8F0` (Light) / `#2D3748` (Dark), Text `#A0AEC0`

### 6.2 Category Cards
Used for vocabulary topics (Idioms, Proverbs, etc.).
* **Border Radius:** `24px`
* **Padding:** `24px` all sides.
* **Alignment:** Center-aligned content (Icon stacked above Title, Title above Subtitle).
* **Light Mode:** Solid pastel background from the Categorical palette. No border.
* **Dark Mode:** Background `#1E1E1E`, `2px` solid border using the Categorical pastel hex.

### 6.3 Translation Input/Output Box
* **Border Radius:** `24px`
* **Padding:** `16px`
* **Background:** `#FFFFFF` (Light) / `#1E1E1E` (Dark).
* **Features:** Subtle divider line `1px solid #E2E8F0` separating the "From" and "To" sections. Include circular icon buttons (e.g., size `32px`) for Text-to-Speech and copy actions.

### 6.4 Bottom Navigation Bar
* **Height:** `80px`
* **Background:** Solid surface color (`#FFFFFF` or `#1E1E1E`).
* **Icons:** * Inactive: Outline icons, `#A0AEC0`
    * Active: Filled icons or thicker stroke, `#1A202C` (Light) / `#F7FAFC` (Dark). Active state features a subtle indicator dot or label weight change.

---

## 7. Iconography

Icons are used extensively to reinforce learning paths and visual memory.

* **Style:** Minimalist Outline. Friendly and slightly rounded terminals.
* **Stroke Width:** `1.5px` to `2px`.
* **Base Size:** `24x24px` (Nav and UI actions), `48x48px` (Inside Category Cards).
* **Colors:** In categorical cards, icons use a darker, highly saturated variant of the card's background color for contrast (e.g., dark blue on light blue). In neutral UI, they match the Text Primary/Secondary colors.

---

## 8. Visual Effects

* **Border Radius:** * Cards/Inputs: `20px` - `24px`
    * Buttons/Toggles: `99px` (Pill)
    * Small UI Elements (Avatar borders, badges): `50%` (Circular)
* **Shadows:** Extremely minimal. Most of the UI relies on color contrast rather than elevation.
    * *Bottom Nav / Sticky Elements:* `0 -4px 20px rgba(0, 0, 0, 0.05)` (Light mode only. Use `#2D3748` top border in dark mode).
* **Animations:** * Page transitions: Soft slide and fade (300ms ease-out).
    * Buttons: Micro-interaction scale (`transform: scale(0.98)` on active) for tactile feedback.

---

## 9. Accessibility Constraints

* **Contrast Ratios:** All text on pastel backgrounds must meet AA WCAG standards (minimum 4.5:1). Darken the primary text slightly if the pastel background is too vibrant. 
* **Touch Targets:** Every interactive element (microphone icon, speaker icon, nav buttons) must have a minimum clickable area of `44x44px`, regardless of the visual size of the icon.
* **Font Scaling:** Support dynamic type sizes (Dynamic Type on iOS, SP sizes on Android) up to 200% without breaking the 8px grid layout (use `flex-wrap` and scrollable areas).