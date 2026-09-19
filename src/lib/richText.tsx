import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/**
 * Lopende tekst uit inhoudsbestanden (`src/content/landings`) met links in
 * de vorm `[tekst](/pad)`. Interne paden worden een router-link, alles
 * anders een gewone link. Bewust geen markdown-bibliotheek: één patroon is
 * genoeg en blijft voorspelbaar.
 */
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export const renderRichText = (text: string, linkClassName = "text-primary underline underline-offset-4 hover:text-ocean-deep"): ReactNode => {
  const parts: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = LINK.exec(text)) !== null) {
    if (match.index > last) parts.push(<Fragment key={key++}>{text.slice(last, match.index)}</Fragment>);
    const [, label, href] = match;
    parts.push(
      href.startsWith("/") ? (
        <Link key={key++} to={href} className={linkClassName}>
          {label}
        </Link>
      ) : (
        <a key={key++} href={href} className={linkClassName} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ),
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  LINK.lastIndex = 0;
  return parts;
};
