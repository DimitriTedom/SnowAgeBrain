const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer, AlignmentType, LevelFormat, PageNumber, HeadingLevel, WidthType, ShadingType, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

// Create the document
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "•",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 }
              }
            }
          }
        ]
      },
      {
        reference: "numbers",
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 }
              }
            }
          }
        ]
      }
    ]
  },
  styles: {
    default: {
      document: {
        run: { font: "Arial", size: 24 } // 12pt default
      }
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1A1A2E" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "E94560" },
        paragraph: { spacing: { before: 180, after: 90 }, outlineLevel: 1 }
      }
    ]
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter (12240 x 15840 DXA)
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1" margins
        }
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun("Page "),
                new TextRun({ children: [PageNumber.CURRENT] })
              ]
            })
          ]
        })
      },
      children: [
        // Title Block
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "PRODUCTION FRAMEWORK:", bold: true, size: 36, color: "1A1A2E" }),
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          children: [
            new TextRun({ text: "EVOLUTIONARY MISMATCH STICKMAN VIDEOS", bold: true, size: 28, color: "E94560" }),
          ]
        }),

        // Section I
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("I. Channel Vision & Niche Positioning")] }),
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun("The \"Snow Age Brain\" media brand operates at the intersection of evolutionary anthropology, modern neuroscience, and minimalist cartoon animations. By exploring why modern humans suffer from behavioral traps (scrolling, anxiety, sugar addiction, tribe comparisons) due to a biological mismatch between our Pleistocene-adapted brains and twenty-first-century environments, the channel delivers high-value, highly engaging storytelling. Producing rapid visual-paced videos (switching screens every 2 to 3 seconds) keeps average view duration high, optimizing the YouTube algorithm loop.")
          ]
        }),

        // Section II
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("II. Narrative Script Structure (The 7-Beat System)")] }),
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun("Standardizing script beats is vital to hook viewers, introduce scientific proof, and resolve with a resonant takeaway. The narrative structure follows these distinct segments:")
          ]
        }),

        // Table of Beats
        new Table({
          width: { size: 9360, type: WidthType.DXA }, // sum of columns must equal 9360
          columnWidths: [2160, 7200],
          rows: [
            // Header Row
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat Segment", bold: true, color: "FFFFFF" })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Description & Goal", bold: true, color: "FFFFFF" })] })]
                })
              ]
            }),
            // Row 1
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 1: The Hook", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Identifies a modern behavioral trap (e.g., scrolling at 3am) and reveals it as a biological survival system out of its environment.")] })]
                })
              ]
            }),
            // Row 2
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 2: Science Setup", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Explains the neuroscience framework (e.g., dopamine reward pathway) and cites a peer-reviewed study (e.g., Hofmann 2012) for credibility.")] })]
                })
              ]
            }),
            // Row 3
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 3: Ancient Contrast", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Immerses the viewer into the Pleistocene savanna 300k years ago, showing how the survival trait was adaptive and self-limiting.")] })]
                })
              ]
            }),
            // Row 4
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 4: The Jump", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Transitions back to the present day, where technology companies exploit this ancient search loop with variable digital rewards.")] })]
                })
              ]
            }),
            // Row 5
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 5: Implication", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Reveals the hidden cognitive load of technology, like the 'brain drain' effect (Ward 2017) where phone proximity occupies working memory.")] })]
                })
              ]
            }),
            // Row 6
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 6: The Hijack", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Provides biological evidence on how modern feeds (variable ratios) trigger more striatum dopamine release than predictable routines.")] })]
                })
              ]
            }),
            // Row 7
            new TableRow({
              children: [
                new TableCell({
                  borders,
                  width: { size: 2160, type: WidthType.DXA },
                  shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun({ text: "Beat 7: Close", bold: true })] })]
                }),
                new TableCell({
                  borders,
                  width: { size: 7200, type: WidthType.DXA },
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                  children: [new Paragraph({ children: [new TextRun("Reframes scrolling as clinical rather than a moral failure, leaving the user with a profound visual realization: you will never find it on a screen.")] })]
                })
              ]
            })
          ]
        }),

        new Paragraph({ spacing: { before: 180, after: 180 }, children: [new TextRun("")] }),

        // Section III
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("III. Visual Identity & Brand Styling")] }),
        new Paragraph({
          children: [
            new TextRun("To avoid basic line sketches and ensure premium-looking outputs, all generated visuals must adhere to the style guide:")
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({ text: "Color Palette: ", bold: true }),
            new TextRun("Primary background uses Deep Navy (#1A1A2E) for modern frames. Prehistoric environments use Savanna Orange ground under a navy night sky, or solid Tan interior cave walls.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({ text: "Character Design: ", bold: true }),
            new TextRun("White circular heads, black line limbs, and simple curved mitten hands. Characters must wear primitive animal-skin tunics (prehistoric) or grey business shirts (modern) rather than appearing naked. Heads must contain expressive hand-drawn line details (eyebrows, shut eyes, open mouths) to reflect emotional beats.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({ text: "Render Parameters: ", bold: true }),
            new TextRun("Solid flat colors only, wobbly thick black outlines, marker texture feel. Strictly avoid gradients, shadows, 3D elements, or photo textures.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullets", level: 0 },
          children: [
            new TextRun({ text: "Watermark rule: ", bold: true }),
            new TextRun("Embed \"@SnowAgeBrain\" as a physical scene element (written in chalk on walls, carved on cave boulders, or displayed on screens) on roughly 10% of prompts to preserve intellectual property without distracting the viewer.")
          ]
        }),

        // Section IV
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("IV. Fast-Paced Production Pipeline")] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun("By utilizing automation scripts, video editing duration is reduced by 90%. Follow these steps:")
          ]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [
            new TextRun({ text: "Audio Generation: ", bold: true }),
            new TextRun("Write the script and generate the narration voiceover file (.m4a).")
          ]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [
            new TextRun({ text: "TurboScribe Transcription: ", bold: true }),
            new TextRun("Upload the audio to TurboScribe. In the export parameters, restrict 'Max words per segment' to 6, 'Max duration per segment' to 3 seconds, and enable 'Sentence-sensitive segmentation'. Export the SRT file.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [
            new TextRun({ text: "Prompt Alignment: ", bold: true }),
            new TextRun("Run the python comparison script to clean TurboScribe text and match SRT segment start times (e.g. 02:40 -> 0240_) to the image prompts.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [
            new TextRun({ text: "Snow Flow Batching: ", bold: true }),
            new TextRun("Execute the Snow Flow browser automation script. It automatically inputs each prompt, clicks submit, uses a MutationObserver to detect image completion, and downloads the file with the MMSS prefix.")
          ]
        }),
        new Paragraph({
          numbering: { reference: "numbers", level: 0 },
          children: [
            new TextRun({ text: "CapCut Integration: ", bold: true }),
            new TextRun("Import the audio, the SRT captions, and the image folder. Align each image on the track to match the 4-digit timestamp prefix of its filename. The video is fully compiled in minutes.")
          ]
        })
      ]
    }
  ]
});

// Pack to buffer and write file
Packer.toBuffer(doc).then(buffer => {
  const targetPath = path.join(__dirname, "video_production_framework.docx");
  fs.writeFileSync(targetPath, buffer);
  console.log(`Document written successfully to: ${targetPath}`);
}).catch(err => {
  console.error("Error creating document:", err);
});
