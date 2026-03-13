import { useEffect, useState } from "preact/hooks";
import { editorStore } from "../state/editorStore";
import { documentToSvg } from "../../editor/Document";
import { sendToPlugin } from "../../plugin/penpotBridge";
import type { InsertSvgPayload } from "../../plugin/penpotBridge";

type FooterState = "idle" | "confirm" | "inserting" | "success" | "error";

export function Footer() {
  const [mode, setMode] = useState<"idle" | "confirm">(
    editorStore.getState().footerMode
  );
  const [footerState, setFooterState] = useState<FooterState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsub = editorStore.subscribe((state) => {
      setMode(state.footerMode);
      if (state.footerMode === "confirm") {
        setFooterState("confirm");
        setErrorMsg("");
      }
    });

    // Listen for insert errors dispatched from main.tsx
    const handleInsertError = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setFooterState("error");
      setErrorMsg("Insert failed: " + detail);
    };
    window.addEventListener("insert-error", handleInsertError);

    return () => {
      unsub();
      window.removeEventListener("insert-error", handleInsertError);
    };
  }, []);

  const handleCancel = () => {
    editorStore.getState().setFooterMode("idle");
    setFooterState("idle");
    setErrorMsg("");
  };

  const handleImport = () => {
    const state = editorStore.getState();
    const { document: doc } = state;

    // Validate: must have at least one shape
    if (doc.shapes.length === 0) {
      setFooterState("error");
      setErrorMsg("Nothing to insert — add some shapes first.");
      return;
    }

    // Generate SVG
    let svg: string;
    try {
      svg = documentToSvg(doc);
    } catch (err) {
      setFooterState("error");
      setErrorMsg(
        "SVG generation failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
      return;
    }

    // Validate SVG is not empty
    if (!svg || !svg.includes("<svg")) {
      setFooterState("error");
      setErrorMsg("Generated SVG is invalid.");
      return;
    }

    // Send to plugin backend
    setFooterState("inserting");
    const payload: InsertSvgPayload = {
      svg,
      width: doc.width,
      height: doc.height,
    };
    sendToPlugin("insert-svg", payload);
  };

  if (mode !== "confirm") return null;

  return (
    <footer class="footer-bar">
      {footerState === "error" ? (
        <>
          <span class="footer-text footer-error body-s">{errorMsg}</span>
          <button
            type="button"
            data-appearance="secondary"
            class="footer-btn"
            onClick={handleCancel}
          >
            Dismiss
          </button>
        </>
      ) : footerState === "inserting" ? (
        <span class="footer-text body-s">Inserting into Penpot...</span>
      ) : footerState === "success" ? (
        <span class="footer-text footer-success body-s">
          Inserted successfully!
        </span>
      ) : (
        <>
          <span class="footer-text body-s">Insert SVG into Penpot</span>
          <button
            type="button"
            data-appearance="secondary"
            class="footer-btn"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            data-appearance="primary"
            class="footer-btn"
            onClick={handleImport}
          >
            Import
          </button>
        </>
      )}
    </footer>
  );
}
