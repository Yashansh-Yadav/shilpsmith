"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link2,
  Eraser,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  /**
   * Changing this re-seeds the editor from `value` (e.g. switching products in
   * the admin modal). Without it the editor is uncontrolled after first paint —
   * which is deliberate, so typing doesn't fight React re-renders / cursor jumps.
   */
  resetKey?: string | number;
  placeholder?: string;
}

// Zero-dependency WYSIWYG built on contentEditable + execCommand. execCommand is
// deprecated but still implemented in every browser and is by far the lightest
// way to get bold/italic/lists/headings without pulling in TipTap/Quill (which
// would reintroduce the React-19 peer-dep friction this repo already fights).
// Output HTML is allowlist-sanitized server-side in lib/sanitize.ts.
export default function RichTextEditor({
  value,
  onChange,
  resetKey,
  placeholder = "Describe the product…",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // Seed content only when the target product changes — not on every `value`
  // update — so the caret doesn't reset while the admin is typing.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // Prefer <p> over <div> for line breaks and emit tags (not inline styles) so
  // the output matches the sanitizer allowlist.
  function ensureFormatting() {
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* older browsers — best effort */
    }
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    ensureFormatting();
    document.execCommand(command, false, arg);
    emit();
  }

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (!url) return;
    exec("createLink", url);
  }

  function clearFormatting() {
    ref.current?.focus();
    document.execCommand("removeFormat");
    document.execCommand("unlink");
    emit();
  }

  const isEmpty = !value || value === "<br>" || value === "<p></p>";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 focus-within:border-slate-400">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <ToolbarButton label="Bold" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Heading"
          onClick={() => exec("formatBlock", "h2")}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Subheading"
          onClick={() => exec("formatBlock", "h3")}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          label="Bullet list"
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          onClick={() => exec("insertOrderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <Divider />
        <ToolbarButton label="Add link" onClick={addLink}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={clearFormatting}>
          <Eraser className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editable surface */}
      <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          role="textbox"
          aria-multiline="true"
          className="min-h-[160px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-800 focus:outline-none [&_a]:text-brand-700 [&_a]:underline [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-semibold [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-2 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // onMouseDown + preventDefault keeps the editor selection intact when the
      // button is clicked (otherwise focus leaves the contentEditable first).
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-slate-200" />;
}
