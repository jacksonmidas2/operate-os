import { getTenantContext } from "@/lib/tenant-db";
import ExcelJS from "exceljs";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export const runtime = "nodejs";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function hm(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "excel";
  const dParam = url.searchParams.get("date") ?? "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dParam) ? dParam : ymd(new Date());

  const { db } = await getTenantContext(slug);
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const jobs = await db.job.findMany({
    where: { scheduledStart: { gte: dayStart, lt: dayEnd } },
    include: {
      location: { include: { client: true } },
      unit: true,
      assignments: { include: { employee: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const rows = jobs.map((j) => {
    const per =
      (j.scheduledEnd.getTime() - j.scheduledStart.getTime()) / 3_600_000;
    return {
      time: `${hm(j.scheduledStart)}-${hm(j.scheduledEnd)}`,
      loc: `${j.location.client.businessName} — ${j.location.name}${j.unit ? ` (#${j.unit.unitNumber})` : ""}`,
      addr: `${j.location.addressLine1}, ${j.location.city}, ${j.location.state} ${j.location.postalCode}`,
      emp:
        j.assignments
          .map((a) => `${a.employee.firstName} ${a.employee.lastName}`)
          .join(", ") || "—",
      hours: per.toFixed(2),
    };
  });
  const totalLabor = jobs.reduce(
    (s, j) =>
      s +
      ((j.scheduledEnd.getTime() - j.scheduledStart.getTime()) / 3_600_000) *
        j.assignments.length,
    0,
  );
  const distinct = new Set(
    jobs.flatMap((j) => j.assignments.map((a) => a.employeeId)),
  ).size;

  if (format === "excel") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Schedule ${date}`);
    ws.columns = [
      { header: "Time", key: "time", width: 16 },
      { header: "Location / Job", key: "loc", width: 34 },
      { header: "Address", key: "addr", width: 36 },
      { header: "Employees", key: "emp", width: 32 },
      { header: "Hours (each)", key: "hours", width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const r of rows) ws.addRow(r);
    ws.addRow([]);
    ws.addRow({
      time: "Totals",
      loc: `Jobs: ${jobs.length}`,
      addr: `Employees: ${distinct}`,
      emp: `Labor hours: ${totalLabor.toFixed(2)}`,
    });
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as unknown as BodyInit, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="schedule-${date}.xlsx"`,
      },
    });
  }

  // ── PDF (pdf-lib, no external font files) ──
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.1, 0.1, 0.13);
  const muted = rgb(0.45, 0.47, 0.52);

  const COLS = [
    { x: 40, w: 70, key: "time" as const },
    { x: 116, w: 165, key: "loc" as const },
    { x: 286, w: 200, key: "emp" as const },
    { x: 492, w: 60, key: "hours" as const },
  ];
  const HEADERS: Record<string, string> = {
    time: "Time",
    loc: "Location / Job",
    emp: "Employees",
    hours: "Hours",
  };

  function fit(text: string, f: PDFFont, size: number, maxW: number): string {
    if (f.widthOfTextAtSize(text, size) <= maxW) return text;
    let t = text;
    while (t.length > 1 && f.widthOfTextAtSize(t + "…", size) > maxW)
      t = t.slice(0, -1);
    return t + "…";
  }

  let page: PDFPage = pdf.addPage([612, 792]);
  let y = 740;
  const drawHeaderBlock = () => {
    page.drawText(`Schedule for ${date}`, {
      x: 40,
      y,
      size: 16,
      font: bold,
      color: ink,
    });
    y -= 24;
    for (const c of COLS)
      page.drawText(HEADERS[c.key] ?? "", {
        x: c.x,
        y,
        size: 9,
        font: bold,
        color: muted,
      });
    y -= 6;
    page.drawLine({
      start: { x: 40, y },
      end: { x: 552, y },
      thickness: 0.5,
      color: muted,
    });
    y -= 14;
  };
  drawHeaderBlock();

  if (rows.length === 0) {
    page.drawText("No jobs scheduled for this day.", {
      x: 40,
      y,
      size: 11,
      font,
      color: muted,
    });
    y -= 20;
  }
  for (const r of rows) {
    if (y < 70) {
      page = pdf.addPage([612, 792]);
      y = 740;
      drawHeaderBlock();
    }
    for (const c of COLS)
      page.drawText(fit(String(r[c.key]), font, 9, c.w), {
        x: c.x,
        y,
        size: 9,
        font,
        color: ink,
      });
    y -= 18;
  }
  y -= 10;
  page.drawLine({
    start: { x: 40, y },
    end: { x: 552, y },
    thickness: 0.5,
    color: muted,
  });
  y -= 16;
  page.drawText(
    `Total jobs: ${jobs.length}     Total employees: ${distinct}     Total labor hours: ${totalLabor.toFixed(2)}`,
    { x: 40, y, size: 10, font: bold, color: ink },
  );

  const bytes = await pdf.save();
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="schedule-${date}.pdf"`,
    },
  });
}
