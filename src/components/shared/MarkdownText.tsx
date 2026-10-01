import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Door de admin geschreven markdown (partnerafspraken) veilig weergeven.
 * react-markdown rendert geen ruwe HTML; links openen in een nieuw venster.
 */
export function MarkdownText({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose prose-sm max-w-none prose-headings:font-semibold prose-h2:mt-6 prose-h2:text-base prose-table:text-sm", className)}>
      <ReactMarkdown
        components={{
          a: ({ href, children: inhoud }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {inhoud}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
