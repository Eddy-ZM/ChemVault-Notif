import { describe, expect, it } from "vitest";
import {
  inferAiExtractionMimeType,
  isSupportedForAiExtractionFile,
} from "./supported-ai-extraction";

describe("supported AI extraction files", () => {
  it("accepts supported browser MIME types", () => {
    expect(
      isSupportedForAiExtractionFile({ mimeType: "application/pdf" })
    ).toBe(true);
  });

  it("infers supported MIME types from file extension when browsers omit them", () => {
    expect(
      inferAiExtractionMimeType({
        mimeType: "",
        fileName: "assay-results.XLSX",
      })
    ).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("rejects unsupported extensions", () => {
    expect(
      isSupportedForAiExtractionFile({
        mimeType: "",
        fileName: "microscope-image.png",
      })
    ).toBe(false);
  });
});
