"use client";

type ExampleQuestionChipProps = {
  question: string;
  onSelect: (question: string) => void;
  disabled?: boolean;
};

export function ExampleQuestionChip({
  question,
  onSelect,
  disabled = false,
}: ExampleQuestionChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(question)}
      className="rounded-md border border-border bg-surface px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-border-strong hover:bg-surface-2 active:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {question}
    </button>
  );
}
