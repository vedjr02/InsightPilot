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
      className="group flex w-full items-baseline gap-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        aria-hidden
        className="mt-2 h-px w-4 shrink-0 bg-border-strong transition-colors group-hover:bg-accent"
      />
      <span className="text-chat-body text-foreground underline-offset-4 group-hover:underline group-focus-visible:underline">
        {question}
      </span>
    </button>
  );
}
