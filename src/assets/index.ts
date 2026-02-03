// Asset index - exports all static images from src/assets
import amuseTour from "./amuse-tour.jpg";
import beachActivity from "./beach-activity.jpg";
import beachBonfire from "./beach-bonfire.jpg";
import beachEvent from "./beach-event.jpg";
import beachSigns from "./beach-signs.jpg";
import bockbiertocht from "./bockbiertocht.jpg";
import bockbiertocht2 from "./bockbiertocht2.jpg";
import cateringDrinks from "./catering-drinks.jpg";
import cateringFood from "./catering-food.jpg";
import catering from "./catering.jpg";
import cyclingGroup from "./cycling-group.jpg";
import cyclingTeam from "./cycling-team.jpg";
import districonVlieland22 from "./districon-vlieland-22.jpg";
import dunesGroup from "./dunes-group.jpg";
import erwinProfile from "./erwin-profile.jpg";
import eventNight from "./event-night.jpg";
import eventOutdoor from "./event-outdoor.jpg";
import foodPlatters from "./food-platters.jpg";
import heroEvent from "./hero-event.jpg";
import heroVlieland from "./hero-vlieland.jpg";
import karlaProfile from "./karla-profile.jpg";
import kiteFlying from "./kite-flying.jpg";
import lighthouseVlieland from "./lighthouse-vlieland.jpg";
import logoWhite from "./logo-white.png";
import logoJpg from "./logo.jpg";
import logoPng from "./logo.png";
import lunchBuffet from "./lunch-buffet.jpg";
import mindset22Indoor from "./mindset22-indoor.jpg";
import mindset22Outdoor from "./mindset22-outdoor.jpg";
import outdoorDining from "./outdoor-dining.jpg";
import outdoorDrinks from "./outdoor-drinks.jpg";
import reneeProfile from "./renee-profile.jpg";
import rmdBeachGroup from "./rmd-beach-group.jpg";
import rmdBeachTraining from "./rmd-beach-training.jpg";
import rmdOutdoorActivity from "./rmd-outdoor-activity.jpg";
import sealTour from "./seal-tour.jpg";
import silentDisco from "./silent-disco.jpg";
import speedboatGroup from "./speedboat-group.jpg";
import speedboat from "./speedboat.jpg";
import stappenEnHappen from "./stappen-en-happen.jpg";
import stappenHappen from "./stappen-happen.jpg";
import sunsetDinner from "./sunset-dinner.jpg";
import surfActivity from "./surf-activity.jpg";
import teamActivity from "./team-activity.jpg";
import teamBeach from "./team-beach.jpg";
import tentSetup from "./tent-setup.jpg";
import vandermost12 from "./vandermost-12.jpg";
import vandermost254 from "./vandermost-254.jpg";
import vlielandActivity from "./vlieland-activity.jpg";
import vlielandBeachGolf from "./vlieland-beach-golf.jpg";
import vlielandBeach from "./vlieland-beach.jpg";
import vlielandGroup from "./vlieland-group.jpg";
import vlielandLandscape from "./vlieland-landscape.jpg";
import vlielandMorning from "./vlieland-morning.jpg";
import vocBlokartenIllustration from "./voc-blokarten-illustration.jpg";
import vuurtorenloop from "./vuurtorenloop.jpg";
import weddingBeachCouple from "./wedding-beach-couple.jpg";
import weddingCeremonyOcean from "./wedding-ceremony-ocean.jpg";
import weddingCeremonySetup from "./wedding-ceremony-setup.jpg";
import weddingCeremonyVuurtoren from "./wedding-ceremony-vuurtoren.jpg";
import weddingDinnerTable from "./wedding-dinner-table.jpg";
import weddingForestArch from "./wedding-forest-arch.jpg";
import weddingOutdoorDinner from "./wedding-outdoor-dinner.jpg";

export interface AssetFile {
  name: string;
  url: string;
  category: string;
}

// Helper to determine category based on filename
function getCategory(name: string): string {
  if (name.includes("profile")) return "profielen";
  if (name.startsWith("logo")) return "logo";
  if (name.startsWith("wedding")) return "bruiloft";
  if (name.startsWith("catering") || name.includes("food") || name.includes("lunch") || name.includes("dinner") || name.includes("dining") || name.includes("drinks") || name.includes("buffet") || name.includes("platters")) return "catering";
  if (name.startsWith("vlieland") || name.includes("lighthouse") || name.includes("dunes") || name.includes("landscape")) return "locaties";
  if (name.startsWith("event") || name.includes("disco") || name.includes("tent")) return "events";
  if (name.includes("beach") || name.includes("surf") || name.includes("kite") || name.includes("cycling") || name.includes("speedboat") || name.includes("seal") || name.includes("blokarten") || name.includes("activity") || name.includes("outdoor") || name.includes("team") || name.includes("group")) return "activiteiten";
  if (name.startsWith("hero")) return "hero";
  return "overig";
}

export const assetFiles: AssetFile[] = [
  { name: "amuse-tour.jpg", url: amuseTour, category: getCategory("amuse-tour") },
  { name: "beach-activity.jpg", url: beachActivity, category: getCategory("beach-activity") },
  { name: "beach-bonfire.jpg", url: beachBonfire, category: getCategory("beach-bonfire") },
  { name: "beach-event.jpg", url: beachEvent, category: getCategory("beach-event") },
  { name: "beach-signs.jpg", url: beachSigns, category: getCategory("beach-signs") },
  { name: "bockbiertocht.jpg", url: bockbiertocht, category: getCategory("bockbiertocht") },
  { name: "bockbiertocht2.jpg", url: bockbiertocht2, category: getCategory("bockbiertocht2") },
  { name: "catering-drinks.jpg", url: cateringDrinks, category: getCategory("catering-drinks") },
  { name: "catering-food.jpg", url: cateringFood, category: getCategory("catering-food") },
  { name: "catering.jpg", url: catering, category: getCategory("catering") },
  { name: "cycling-group.jpg", url: cyclingGroup, category: getCategory("cycling-group") },
  { name: "cycling-team.jpg", url: cyclingTeam, category: getCategory("cycling-team") },
  { name: "districon-vlieland-22.jpg", url: districonVlieland22, category: getCategory("districon-vlieland-22") },
  { name: "dunes-group.jpg", url: dunesGroup, category: getCategory("dunes-group") },
  { name: "erwin-profile.jpg", url: erwinProfile, category: getCategory("erwin-profile") },
  { name: "event-night.jpg", url: eventNight, category: getCategory("event-night") },
  { name: "event-outdoor.jpg", url: eventOutdoor, category: getCategory("event-outdoor") },
  { name: "food-platters.jpg", url: foodPlatters, category: getCategory("food-platters") },
  { name: "hero-event.jpg", url: heroEvent, category: getCategory("hero-event") },
  { name: "hero-vlieland.jpg", url: heroVlieland, category: getCategory("hero-vlieland") },
  { name: "karla-profile.jpg", url: karlaProfile, category: getCategory("karla-profile") },
  { name: "kite-flying.jpg", url: kiteFlying, category: getCategory("kite-flying") },
  { name: "lighthouse-vlieland.jpg", url: lighthouseVlieland, category: getCategory("lighthouse-vlieland") },
  { name: "logo-white.png", url: logoWhite, category: getCategory("logo-white") },
  { name: "logo.jpg", url: logoJpg, category: getCategory("logo") },
  { name: "logo.png", url: logoPng, category: getCategory("logo") },
  { name: "lunch-buffet.jpg", url: lunchBuffet, category: getCategory("lunch-buffet") },
  { name: "mindset22-indoor.jpg", url: mindset22Indoor, category: getCategory("mindset22-indoor") },
  { name: "mindset22-outdoor.jpg", url: mindset22Outdoor, category: getCategory("mindset22-outdoor") },
  { name: "outdoor-dining.jpg", url: outdoorDining, category: getCategory("outdoor-dining") },
  { name: "outdoor-drinks.jpg", url: outdoorDrinks, category: getCategory("outdoor-drinks") },
  { name: "renee-profile.jpg", url: reneeProfile, category: getCategory("renee-profile") },
  { name: "rmd-beach-group.jpg", url: rmdBeachGroup, category: getCategory("rmd-beach-group") },
  { name: "rmd-beach-training.jpg", url: rmdBeachTraining, category: getCategory("rmd-beach-training") },
  { name: "rmd-outdoor-activity.jpg", url: rmdOutdoorActivity, category: getCategory("rmd-outdoor-activity") },
  { name: "seal-tour.jpg", url: sealTour, category: getCategory("seal-tour") },
  { name: "silent-disco.jpg", url: silentDisco, category: getCategory("silent-disco") },
  { name: "speedboat-group.jpg", url: speedboatGroup, category: getCategory("speedboat-group") },
  { name: "speedboat.jpg", url: speedboat, category: getCategory("speedboat") },
  { name: "stappen-en-happen.jpg", url: stappenEnHappen, category: getCategory("stappen-en-happen") },
  { name: "stappen-happen.jpg", url: stappenHappen, category: getCategory("stappen-happen") },
  { name: "sunset-dinner.jpg", url: sunsetDinner, category: getCategory("sunset-dinner") },
  { name: "surf-activity.jpg", url: surfActivity, category: getCategory("surf-activity") },
  { name: "team-activity.jpg", url: teamActivity, category: getCategory("team-activity") },
  { name: "team-beach.jpg", url: teamBeach, category: getCategory("team-beach") },
  { name: "tent-setup.jpg", url: tentSetup, category: getCategory("tent-setup") },
  { name: "vandermost-12.jpg", url: vandermost12, category: getCategory("vandermost-12") },
  { name: "vandermost-254.jpg", url: vandermost254, category: getCategory("vandermost-254") },
  { name: "vlieland-activity.jpg", url: vlielandActivity, category: getCategory("vlieland-activity") },
  { name: "vlieland-beach-golf.jpg", url: vlielandBeachGolf, category: getCategory("vlieland-beach-golf") },
  { name: "vlieland-beach.jpg", url: vlielandBeach, category: getCategory("vlieland-beach") },
  { name: "vlieland-group.jpg", url: vlielandGroup, category: getCategory("vlieland-group") },
  { name: "vlieland-landscape.jpg", url: vlielandLandscape, category: getCategory("vlieland-landscape") },
  { name: "vlieland-morning.jpg", url: vlielandMorning, category: getCategory("vlieland-morning") },
  { name: "voc-blokarten-illustration.jpg", url: vocBlokartenIllustration, category: getCategory("voc-blokarten-illustration") },
  { name: "vuurtorenloop.jpg", url: vuurtorenloop, category: getCategory("vuurtorenloop") },
  { name: "wedding-beach-couple.jpg", url: weddingBeachCouple, category: getCategory("wedding-beach-couple") },
  { name: "wedding-ceremony-ocean.jpg", url: weddingCeremonyOcean, category: getCategory("wedding-ceremony-ocean") },
  { name: "wedding-ceremony-setup.jpg", url: weddingCeremonySetup, category: getCategory("wedding-ceremony-setup") },
  { name: "wedding-ceremony-vuurtoren.jpg", url: weddingCeremonyVuurtoren, category: getCategory("wedding-ceremony-vuurtoren") },
  { name: "wedding-dinner-table.jpg", url: weddingDinnerTable, category: getCategory("wedding-dinner-table") },
  { name: "wedding-forest-arch.jpg", url: weddingForestArch, category: getCategory("wedding-forest-arch") },
  { name: "wedding-outdoor-dinner.jpg", url: weddingOutdoorDinner, category: getCategory("wedding-outdoor-dinner") },
];

// Get unique categories for filtering
export const assetCategories = [...new Set(assetFiles.map((f) => f.category))].sort();
