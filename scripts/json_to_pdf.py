"""
json_to_pdf.py
Converts why_you_cant_stop_scrolling.json into a clean, readable PDF.
Uses fpdf2. Run: python json_to_pdf.py
"""

import json
import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

INPUT_FILE  = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\why_you_cant_stop_scrolling.json"
OUTPUT_FILE = r"c:\Users\Dimitri SnowDev\Documents\Zenn\episodes\why_you_cant_stop_scrolling\why_you_cant_stop_scrolling.pdf"

# ── Colour palette ───────────────────────────────────────────────────────────
C_BG        = (15,  17,  26)   # near-black page background
C_ACCENT    = (120, 80, 220)   # purple accent
C_ACCENT2   = (60, 180, 240)   # cyan accent
C_WHITE     = (245, 245, 250)
C_LIGHT     = (200, 200, 215)
C_MUTED     = (140, 140, 160)
C_CARD_BG   = (25,  28,  42)   # slightly lighter than page bg
C_CARD_BDR  = (50,  50,  75)   # card border


def safe(text: str) -> str:
    """Replace characters that fpdf2 can't render in core fonts."""
    replacements = {
        "\u2014": "--",   # em dash
        "\u2013": "-",    # en dash
        "\u2018": "'",    "\u2019": "'",
        "\u201c": '"',    "\u201d": '"',
        "\u2022": "*",
        "\u00e9": "e",    "\u00e8": "e",
        "\u00e0": "a",    "\u00e2": "a",
        "\u00f4": "o",    "\u00fb": "u",
        "\u2026": "...",
        "\u00a0": " ",
        "\u200b": "",
        "\u25b6": ">",
        "\u2190": "<-",   "\u2192": "->",
        "\u2665": "<3",
        "\u00d7": "x",
        "\u2019": "'",
        "\u00e9": "e",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    # strip any remaining non-latin1 characters
    return text.encode("latin-1", errors="replace").decode("latin-1")


class ZennPDF(FPDF):
    def __init__(self, title: str):
        super().__init__()
        self.doc_title = title
        self.set_auto_page_break(auto=True, margin=18)

    # ── Header / Footer ──────────────────────────────────────────────────────
    def header(self):
        # Dark top bar
        self.set_fill_color(*C_ACCENT)
        self.rect(0, 0, 210, 4, "F")
        if self.page_no() > 1:
            self.set_fill_color(*C_BG)
            self.rect(0, 4, 210, 10, "F")
            self.set_font("Helvetica", "B", 7)
            self.set_text_color(*C_MUTED)
            self.set_xy(10, 5)
            self.cell(0, 6, safe(self.doc_title), align="L")
            self.set_xy(0, 5)
            self.cell(200, 6, f"Page {self.page_no()}", align="R")

    def footer(self):
        self.set_y(-10)
        self.set_fill_color(*C_ACCENT)
        self.rect(0, self.get_y(), 210, 3, "F")

    # ── Helpers ──────────────────────────────────────────────────────────────
    def fill_page_bg(self):
        self.set_fill_color(*C_BG)
        self.rect(0, 0, 210, 297, "F")

    def section_title(self, text: str, y_gap: float = 6):
        self.ln(y_gap)
        # accent bar
        x = self.get_x()
        y = self.get_y()
        self.set_fill_color(*C_ACCENT)
        self.rect(14, y, 3, 7, "F")
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*C_WHITE)
        self.set_xy(20, y)
        self.cell(0, 7, safe(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def body_text(self, text: str, color=None):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*(color or C_LIGHT))
        self.set_x(14)
        self.multi_cell(182, 5, safe(text))
        self.ln(2)

    def label_value(self, label: str, value: str):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*C_ACCENT2)
        self.set_x(14)
        self.cell(28, 5, safe(label + ":"), new_x=XPos.RIGHT, new_y=YPos.LAST)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*C_LIGHT)
        self.multi_cell(154, 5, safe(value))
        self.ln(1)

    def divider(self, gap: float = 3):
        self.ln(gap)
        self.set_draw_color(*C_CARD_BDR)
        self.set_line_width(0.2)
        self.line(14, self.get_y(), 196, self.get_y())
        self.ln(gap)

    def timeline_card(self, idx: int, entry: dict):
        start = entry.get("start_time", "")
        end   = entry.get("end_time", "")
        narr  = entry.get("narration", "")
        img   = entry.get("image_prompt", "")

        # card background
        card_x = 14
        card_y = self.get_y()
        card_w = 182

        # estimate height
        line_h = 4.5
        narr_lines = max(1, len(narr) // 90 + 1)
        img_lines  = max(1, len(img)  // 90 + 1)
        card_h = 6 + narr_lines * line_h + img_lines * line_h + 8

        if card_y + card_h > self.page_break_trigger:
            self.add_page()
            card_y = self.get_y()

        self.set_fill_color(*C_CARD_BG)
        self.set_draw_color(*C_CARD_BDR)
        self.set_line_width(0.3)
        self.rect(card_x, card_y, card_w, card_h, "FD")

        # accent tab
        self.set_fill_color(*C_ACCENT)
        self.rect(card_x, card_y, 3, card_h, "F")

        # scene number + timecode
        self.set_xy(card_x + 5, card_y + 2)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*C_ACCENT2)
        self.cell(20, 4, f"#{idx:03d}")
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*C_MUTED)
        self.cell(0, 4, f"{start}  -->  {end}")
        self.ln(5)

        # narration
        self.set_x(card_x + 5)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*C_ACCENT)
        self.cell(24, 4, "NARRATION")
        self.ln(4)
        self.set_x(card_x + 5)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*C_WHITE)
        self.multi_cell(card_w - 10, 4.5, safe(narr))
        self.ln(2)

        # image prompt
        self.set_x(card_x + 5)
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*C_ACCENT)
        self.cell(24, 4, "IMAGE PROMPT")
        self.ln(4)
        self.set_x(card_x + 5)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*C_MUTED)
        self.multi_cell(card_w - 10, 4, safe(img))

        # move below card
        self.set_y(card_y + card_h + 3)


# ── Main ────────────────────────────────────────────────────────────────────
def build_pdf(data: dict) -> None:
    title    = data.get("video_title", "Untitled Video")
    desc     = data.get("video_description", "")
    cta      = data.get("cta_comment", "")
    thumb    = data.get("thumbnail_prompt", "")
    timeline = data.get("timeline", [])

    pdf = ZennPDF(title)
    pdf.set_margins(14, 18, 14)

    # ── COVER PAGE ────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.fill_page_bg()

    # big gradient block at top
    pdf.set_fill_color(*C_ACCENT)
    pdf.rect(0, 0, 210, 70, "F")

    # title
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*C_WHITE)
    pdf.set_xy(14, 14)
    pdf.multi_cell(182, 10, safe(title))

    # subtitle bar
    pdf.set_fill_color(*C_ACCENT2)
    pdf.rect(0, 68, 210, 2, "F")

    # meta row
    pdf.set_xy(14, 76)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*C_MUTED)
    pdf.cell(0, 5, f"Total scenes: {len(timeline)}")
    pdf.ln(12)

    # description label
    pdf.section_title("Video Description")
    pdf.body_text(desc)

    pdf.divider(5)

    # CTA
    pdf.section_title("CTA Comment")
    pdf.body_text(cta)

    pdf.divider(5)

    # Thumbnail
    pdf.section_title("Thumbnail Prompt")
    pdf.body_text(thumb)

    # ── TIMELINE PAGES ────────────────────────────────────────────────────
    pdf.add_page()
    pdf.fill_page_bg()

    pdf.set_xy(14, 16)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*C_WHITE)
    pdf.cell(0, 8, "Timeline -- Scene by Scene", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_fill_color(*C_ACCENT2)
    pdf.rect(14, pdf.get_y(), 80, 1, "F")
    pdf.ln(5)

    for i, entry in enumerate(timeline, start=1):
        # Add page and fill bg if new page needed
        if pdf.get_y() > pdf.page_break_trigger - 30:
            pdf.add_page()
            pdf.fill_page_bg()
            pdf.ln(6)
        pdf.timeline_card(i, entry)

    pdf.output(OUTPUT_FILE)
    print(f"PDF saved to: {OUTPUT_FILE}")
    print(f"Total scenes rendered: {len(timeline)}")


if __name__ == "__main__":
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    build_pdf(data)
