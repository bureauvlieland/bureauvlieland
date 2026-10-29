/**
 * Het deelplaatje (`og:image`) dat WhatsApp, Facebook, LinkedIn en iMessage
 * tonen bij een gedeeld adres. Elke publieke pagina krijgt een eigen plaatje;
 * zonder deze tags valt elke link terug op dezelfde kaart van de homepage.
 *
 * De vaste plaatjes staan in `public/og/<naam>.jpg` (1200 × 630, jpg, onder
 * de 300 kB: webp en grotere bestanden laat WhatsApp weg) en komen uit
 * `scripts/og-images.sh`. Een Supabase-foto mag ook, mits via
 * `transformImageUrl` op 1200 breed, dan levert de opslag een jpeg.
 */
const SITE = "https://bureauvlieland.nl";

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

/** Absolute URL van een deelplaatje: een pad onder `public` ("/og/contact.jpg") of al absoluut. */
export const socialImageUrl = (image: string): string => (/^https?:\/\//.test(image) ? image : `${SITE}${image}`);

/**
 * De meta-tags voor in een `<Helmet>`. Bij een vast plaatje uit `public/og/`
 * gaan de maten mee: dan toont WhatsApp de grote kaart meteen, in plaats van
 * pas na een tweede keer delen.
 */
export const socialImageMeta = (image: string) => {
  const url = socialImageUrl(image);
  const sized = image.startsWith("/og/");
  return [
    <meta key="og:image" property="og:image" content={url} />,
    ...(sized
      ? [
          <meta key="og:image:width" property="og:image:width" content={String(SOCIAL_IMAGE_WIDTH)} />,
          <meta key="og:image:height" property="og:image:height" content={String(SOCIAL_IMAGE_HEIGHT)} />,
        ]
      : []),
  ];
};
