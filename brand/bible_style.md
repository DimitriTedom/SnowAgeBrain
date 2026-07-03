# BIBLE STYLE: Snow Age Brain Prompt Engineering Guide

This document defines the visual style identity, prompt construction rules, and watermarking strategies for the **Snow Age Brain** YouTube channel.

---

## I. VISUAL STYLE ANALYSIS (Competitor Case Study)

The target visual aesthetic is **not** a basic sketch on a plain white canvas. It is a colored, expressive, flat vector cartoon with a wobbly hand-drawn marker feel.

### 1. Character Anatomy & Expressions
* **Head**: Clean white circle. Unlike standard blank stick figures, characters must have simple, hand-drawn facial expressions when relevant (e.g., curved black lines for closed/squinted eyes, wobbly lines for angry/sad eyebrows, simple open shapes for talking/screaming mouths, and teardrop shapes). They have wobbly black hair.
* **Limbs**: Solid black single lines. Hands are drawn as simple white curved mittens (no detailed fingers); feet are simple white rounded boots/feet with basic wobbly lines for toes.
* **Clothing**: Stick figures are not naked. They wear primitive, jagged-cut tunics (animal skins) in solid flat colors (browns, tans, greys).

### 2. Environment & Backgrounds
* Backgrounds are simple flat-colored vector landscapes. They do **not** use default white backgrounds unless representing abstract diagrams.
* **Prehistoric Savanna**: Earthy orange-brown ground, dark navy sky, and flat black tree silhouettes (acacias).
* **Prehistoric Caves / Indoors**: Solid tan, beige, or warm-brown walls with grey ground lines.
* **Objects**: campfires (thick outlines, solid yellow-red-orange flame layers), smoke (thick wobbly black swirls), flat-screen TVs (wobbly rectangle with a blue fill), and smartphones (rounded white rectangle with gold display fill).
NOTE THEY CAN HAVE MANY BACKGROUND, THIS IS JUST EXAMPLES
### 3. Rendering Constraints
* **Style**: Thick wobbly outlines, uneven hand-drawn marker lines.
* **Shading & Lighting**: Absolutely NO gradients, NO 3D rendering, NO realistic textures, NO lighting highlights, and NO cinematic shadows. Only solid, flat color fills.

---

## II. THE STRATEGIC WATERMARKING STRATEGY

 we must inject the channel handle **`"@SnowAgeBrain"`** into the background geometry of the scenes. 
* **Frequency**: The handle must **not** appear in every scene to avoid cluttering the visual flow and pressurizing the viewer. It will be strategically integrated in approximately **10% of scenes** (roughly once every 10–15 prompts) at key storytelling checkpoints.
* **Contextual Placement**:
  * *Cave scenes*: Faintly carved/scratched into a dark stone wall or rocky boulder.
  * *Forest/Savanna scenes*: Etched or carved onto a tree trunk or wooden log.
  * *Modern office/home scenes*: Written on a chalkboard/whiteboard behind the character, or displayed on a computer screen/smartphone panel.
* **Constraint**: The handle must be generated as a natural physical element of the scene environment, not a digital overlay.

---

## III. MASTER PROMPT TEMPLATE COMPILER

Prompts must compile according to this structure:
```text
[SCENE DESCRIPTION + CHARACTER DRESSING/EXPRESSION] + [STRATEGIC WATERMARK (IF APPLICABLE)] + [MANDATORY STYLE CONSTRAINT BLOCK]
```

### 1. Mandatory Style Constraint Block
Every prompt must end with this exact, revised constraint engine:
> `, Style constraint: A simple flat-colored comic illustration in MS Paint style. Thick uneven black outlines, wobbly hand-drawn lines, flat solid color fills, no shading, no gradients, no 3D elements, no realistic textures, horizontal 16:9 frame format. Characters are drawn as stickmen with white circular heads (sometimes with black wobbly hair, simple lines for eyebrows, eyes, and mouths to show expression) and thin black lines for limbs, wearing primitive jagged animal skin tunics. Backgrounds are simple flat-colored vector landscapes.`

---

## IV. WATERMARKED SCENE EXAMPLES

### Example 1 (Prehistoric - Savanna)
> A caveman stickman sitting cross-legged next to a campfire on the African savanna at night under a dark blue sky. The text "@SnowAgeBrain" is faintly carved into a volcanic stone boulder in the background. Style constraint: A simple flat-colored comic illustration in MS Paint style. Thick uneven black outlines, wobbly hand-drawn lines, flat solid color fills, no shading, no gradients, no 3D elements, no realistic textures, horizontal 16:9 frame format. Characters are drawn as stickmen with white circular heads (sometimes with black wobbly hair, simple lines for eyebrows, eyes, and mouths to show expression) and thin black lines for limbs, wearing primitive jagged animal skin tunics. Backgrounds are simple flat-colored vector landscapes.


