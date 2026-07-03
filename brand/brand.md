# BRAND ARCHITECTURE & IMAGE PROMPT GENERATION GUIDELINES

## CHANNEL PROPERTY: Snow Age Brain

This document codifies the mandatory visual, structural, and behavioral assets for the **Snow Age Brain** media brand. Your coding agent must reference this document before executing any programmatic script compilation, media orchestration, or batch prompt engineering.

---

## I. CORE BRAND METRICS

### Visual Palette

* **Primary Background:** Deep Navy (`#1A1A2E`)
* **Accent Urgency:** Coral-Red (`#E94560`)
* **Secondary Tone:** Warm Gold (`#C9A84C`)
* **Aesthetic Tone:** Dark tech premium meets ancient anthropological isolation.

### Typography (On-Screen Overlays & Thumbnails)

* **Titles / Headers:** Bold Sans-Serif (`Montserrat` or `Bebas Neue`)
* **Body Copy:** Clean, high-readability Serif (`Playfair Display` or premium editorial variants)

---

## II. SYSTEM RULES FOR IMAGE PROMPT INJECTION

When slicing narration tracks into micro-segments (2-3 seconds per asset block), you must structure every single `image_prompt` line according to the exact rules below.

### 1. Mandatory Watermarking Rule (Anti-Theft Protocol)

To ensure long-term defensibility of our content across platform re-uploads, **every image prompt must programmatically force the generation engine to bake our channel handle into the scene geometry.**

* You must strategically embed the text **`"@SnowAgeBrain"`** into background structures depending on the setting of the scene.
* **Modern Scenes:** Force the handle onto a concrete building wall, a glowing computer terminal interface, a dark smartphone display screen, or a neon street sign.
* **Prehistoric Scenes:** Force the handle to appear faintly carved into a dark cave wall, etched upon a volcanic stone slab, or scratched onto an ancient wooden tree trunk.
* *Constraint:* The text must be rendered as a natural physical element of the background environment, not a digital overlay.

### 2. Mandatory Style Constraint Engine

To prevent the generation models from reverting to modern 3D shading or cinematic rendering, you must strictly append the structural constraint string below to the end of *every single scene prompt entry*.

---

## III. MASTER PROMPT TEMPLATE COMPILER

When constructing prompt blocks, execute this exact linear configuration:

```text
[SCENE ACTION/SUBJECT] + [STRATEGIC HANDLE EMBEDDING] + [MANDATORY STYLE CONSTRAINT BLOCK]

```

### Template Example (Modern Context):

> A simple stickman sitting hunched over, looking exhausted in front of a giant computer terminal screen. On the dark office wall behind him, the handle "@SnowAgeBrain" is clearly written in white chalk. Style constraint: An extremely simple childish drawing made in MS Paint. White background, thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format.

### Template Example (Prehistoric Context):

> An early hominin stickman chipping away at a heavy leg bone with a sharp stone tool on the African savanna. In the background, the text "@SnowAgeBrain" is faintly carved into the surface of a dark volcanic boulder. Style constraint: An extremely simple childish drawing made in MS Paint. White background, thick uneven black outlines, wobbly hand-drawn lines, simple stick figure human with round head and line body, simple dot eyes, flat colors only, no realistic shading, no 3D, no cinematic lighting, horizontal 16:9 frame format.

---

## IV. COMPILING AUTOMATION DIRECTIVE

When automating timeline files (`.txt` loops for extensions like Zapi Flow or bulk API generation runs):

1. Verify that timestamps map perfectly to sequential loop cycles.
2. Dynamically vary the placement of the `@SnowAgeBrain` text element for  prompt line (e.g., alternating between left wall, right screen, stone block, tree bark) so a simple mask cannot clone out the text.
3. Enforce a double-space (blank line break) between consecutive prompt objects to ensure safe parsing across your extraction script interfaces.
4. NOW THE MOST IMPORTANT : EVERY IMAGES'S PROMPTS MUST NOT CONTAIN THE WATERMARK, or else the user will fill wierd, JUST ADD IT IN STRATEGIC IMAGES BUT THE VIEWER MUST NOT BE PRESURIZED
