from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem


def render_markdown_to_pdf(markdown_path: Path, output_path: Path) -> None:
    text = markdown_path.read_text(encoding="utf-8")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="Heading1DS", parent=styles["Heading1"], spaceAfter=12))
    styles.add(ParagraphStyle(name="Heading2DS", parent=styles["Heading2"], spaceAfter=10))
    styles.add(ParagraphStyle(name="Heading3DS", parent=styles["Heading3"], spaceAfter=8))
    styles.add(ParagraphStyle(name="BodyDS", parent=styles["BodyText"], leading=14, spaceAfter=6))
    styles.add(ParagraphStyle(name="MonoDS", parent=styles["BodyText"], fontName="Courier", leading=12, spaceAfter=6))

    story = []
    lines = text.splitlines()
    list_buffer = []
    in_code_block = False

    def flush_list() -> None:
        nonlocal list_buffer
        if not list_buffer:
            return
        story.append(
            ListFlowable(
                [ListItem(Paragraph(item, styles["BodyDS"])) for item in list_buffer],
                bulletType="bullet",
            )
        )
        story.append(Spacer(1, 6))
        list_buffer = []

    for line in lines:
        if line.startswith("```"):
            if list_buffer:
                flush_list()
            if line.strip().startswith("```mermaid"):
                story.append(
                    Paragraph(
                        "Diagram (mermaid) omitted in PDF. Refer to Markdown version.",
                        styles["BodyDS"],
                    )
                )
            in_code_block = not in_code_block
            continue

        if in_code_block:
            story.append(Paragraph(line.replace(" ", "&nbsp;"), styles["MonoDS"]))
            continue

        if line.startswith("# "):
            flush_list()
            story.append(Paragraph(line[2:].strip(), styles["Heading1DS"]))
            continue
        if line.startswith("## "):
            flush_list()
            story.append(Paragraph(line[3:].strip(), styles["Heading2DS"]))
            continue
        if line.startswith("### "):
            flush_list()
            story.append(Paragraph(line[4:].strip(), styles["Heading3DS"]))
            continue
        if line.startswith("- "):
            list_buffer.append(line[2:].strip())
            continue
        if line.strip() == "":
            flush_list()
            story.append(Spacer(1, 8))
            continue

        story.append(Paragraph(line, styles["BodyDS"]))

    flush_list()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    doc.build(story)


if __name__ == "__main__":
    report_md = Path("docs/reports/tournament-report.md")
    output_pdf = Path("output/pdf/duel-standby-tournament-report.pdf")
    render_markdown_to_pdf(report_md, output_pdf)
    print(f"Wrote {output_pdf}")
