import { MediaCard, Pill } from "@/components/system";
import { caseKind, caseMeta, type PublishedReferenceCase } from "@/lib/referenceCases";
import { transformImageUrl } from "@/lib/supabaseImage";

/** Eén referentie in het overzicht en onder "Andere referenties": de hele kaart is de link. */
export const ReferenceCard = ({ item }: { item: PublishedReferenceCase }) => {
  const kind = caseKind(item);
  const photo = item.photos[0];
  return (
    <MediaCard
      image={photo ? transformImageUrl(photo.url, { width: 800, quality: 75 }) : null}
      alt={photo?.alt ?? ""}
      badge={kind ? <Pill tone="neutral" className="bg-card">{kind}</Pill> : undefined}
      meta={item.company || undefined}
      title={item.title}
      text={item.intro || undefined}
      footer={caseMeta(item)}
      to={`/referenties/${item.slug}`}
      linkLabel="Lees de referentie"
    />
  );
};
