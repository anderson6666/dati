import { jsPDF } from "jspdf";
import type { Exam, Question, Technique } from "@/types";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/types";

interface ExportData {
  exams: Exam[];
  questions: Question[];
  techniques: Technique[];
}

interface ExportOptions {
  scope: "all" | string; // examId 或 all
  includeAnalysis: boolean;
  includeTechnique: boolean;
  includeAnswer: boolean;
}

// 构建导出数据
export function buildExportData(
  allExams: Exam[],
  allQuestions: Question[],
  allTechniques: Technique[],
  options: ExportOptions
): ExportData {
  const exams =
    options.scope === "all"
      ? allExams
      : allExams.filter((e) => e.id === options.scope);
  const examIds = new Set(exams.map((e) => e.id));
  const questions = allQuestions.filter((q) => examIds.has(q.examId));
  const techniques = allTechniques.filter((t) => examIds.has(t.examId));
  return { exams, questions, techniques };
}

// 导出 JSON
export function exportJSON(data: ExportData, options: ExportOptions): void {
  const payload = {
    meta: {
      generator: "题库总结大师 QBM",
      exportedAt: new Date().toISOString(),
      version: "1.0",
    },
    exams: data.exams,
    questions: data.questions.map((q) => {
      const base = {
        id: q.id,
        examId: q.examId,
        type: q.type,
        stem: q.stem,
        options: q.options,
        knowledgePoint: q.knowledgePoint,
        difficulty: q.difficulty,
        source: q.source,
      };
      return {
        ...base,
        ...(options.includeAnswer ? { answer: q.answer } : {}),
        ...(options.includeAnalysis ? { analysis: q.analysis } : {}),
        ...(options.includeTechnique ? { techniqueId: q.techniqueId } : {}),
      };
    }),
    techniques: options.includeTechnique ? data.techniques : [],
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const scopeName =
    options.scope === "all"
      ? "all"
      : data.exams.find((e) => e.id === options.scope)?.name || options.scope;
  a.download = `QBM_${scopeName}_${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 导出 PDF
export function exportPDF(data: ExportData, options: ExportOptions): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // 封面标题
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Question Bank Master", margin, y + 10);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Exported: ${new Date().toLocaleString("zh-CN")}`, margin, y);
  y += 16;
  doc.text(
    `Exams: ${data.exams.length}  |  Questions: ${data.questions.length}  |  Techniques: ${data.techniques.length}`,
    margin,
    y
  );
  y += 24;
  doc.setDrawColor(200, 134, 44);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // 按考试分组输出
  data.exams.forEach((exam) => {
    const examQuestions = data.questions.filter((q) => q.examId === exam.id);
    const examTechniques = data.techniques.filter((t) => t.examId === exam.id);

    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(exam.name, margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(exam.description, margin, y + 6);
    y += 22;

    // 题目
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    ensureSpace(20);
    doc.text(`Questions (${examQuestions.length})`, margin, y);
    y += 18;

    examQuestions.forEach((q, idx) => {
      ensureSpace(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const header = `${idx + 1}. [${QUESTION_TYPE_LABEL[q.type]}] ${q.knowledgePoint} (${DIFFICULTY_LABEL[q.difficulty]})`;
      const headerLines = doc.splitTextToSize(header, contentWidth);
      doc.text(headerLines, margin, y);
      y += headerLines.length * 13;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const stemLines = doc.splitTextToSize(q.stem, contentWidth);
      ensureSpace(stemLines.length * 13 + 10);
      doc.text(stemLines, margin, y);
      y += stemLines.length * 13 + 4;

      q.options.forEach((opt, i) => {
        const optText = `${String.fromCharCode(65 + i)}. ${opt}`;
        const optLines = doc.splitTextToSize(optText, contentWidth - 12);
        ensureSpace(optLines.length * 12 + 2);
        doc.text(optLines, margin + 12, y);
        y += optLines.length * 12;
      });

      if (options.includeAnswer) {
        const ans = Array.isArray(q.answer) ? q.answer.join(", ") : q.answer;
        ensureSpace(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Answer: ${ans}`, margin + 12, y);
        y += 14;
        doc.setFont("helvetica", "normal");
      }

      if (options.includeAnalysis) {
        doc.setFontSize(9);
        const analysisLines = doc.splitTextToSize(
          `Analysis: ${q.analysis}`,
          contentWidth - 12
        );
        ensureSpace(analysisLines.length * 11 + 4);
        doc.text(analysisLines, margin + 12, y);
        y += analysisLines.length * 11 + 4;
      }

      y += 8;
    });

    // 技巧
    if (options.includeTechnique && examTechniques.length > 0) {
      ensureSpace(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`Techniques (${examTechniques.length})`, margin, y);
      y += 18;

      examTechniques.forEach((t, idx) => {
        ensureSpace(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const titleLines = doc.splitTextToSize(
          `${idx + 1}. ${t.title} [${t.category}]`,
          contentWidth
        );
        doc.text(titleLines, margin, y);
        y += titleLines.length * 13;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const mnLines = doc.splitTextToSize(`Mnemonic: ${t.mnemonic}`, contentWidth);
        ensureSpace(mnLines.length * 12 + 4);
        doc.text(mnLines, margin, y);
        y += mnLines.length * 12 + 4;

        if (t.pitfalls.length > 0) {
          const pitLines = doc.splitTextToSize(
            `Pitfalls: ${t.pitfalls.join("; ")}`,
            contentWidth
          );
          ensureSpace(pitLines.length * 11 + 4);
          doc.text(pitLines, margin, y);
          y += pitLines.length * 11 + 4;
        }

        const memLines = doc.splitTextToSize(
          `Memory: ${t.memoryMethod}`,
          contentWidth
        );
        ensureSpace(memLines.length * 11 + 8);
        doc.text(memLines, margin, y);
        y += memLines.length * 11 + 10;
      });
    }

    y += 16;
  });

  const scopeName =
    options.scope === "all"
      ? "all"
      : data.exams.find((e) => e.id === options.scope)?.name || options.scope;
  doc.save(`QBM_${scopeName}_${Date.now()}.pdf`);
}
