/**
 * Ceremony knowledge base for the Completeness Copilot.
 *
 * This is the grounded, human reviewed source of cultural fact. Gemini is
 * only ever used to match a planner's actual plan text against these
 * checklist items and phrase the reason naturally, never to invent a
 * cultural or religious fact on its own. Anything genuinely variable by
 * family, region, or specific Gurdwara or Qazi is marked with a verifyNote
 * instead of stated as a fixed rule.
 *
 * Covers 3 traditions across 8 ceremonies for the MVP. Expand later
 * rather than guessing wider coverage now.
 */

export type Tradition = "hindu_north_indian" | "muslim_nikah" | "sikh_anand_karaj";

export const TRADITIONS: { id: Tradition; label: string }[] = [
  { id: "hindu_north_indian", label: "Hindu wedding, North Indian style" },
  { id: "muslim_nikah", label: "Muslim wedding, Nikah" },
  { id: "sikh_anand_karaj", label: "Sikh wedding, Anand Karaj" },
];

export interface ChecklistItem {
  id: string;
  label: string;
  reason: string;
  severity: "important" | "worth_checking";
  verifyNote?: string;
}

export interface CeremonyDefinition {
  id: string;
  name: string;
  tradition: Tradition;
  typicalOrder: number;
  oneLiner: string;
  checklist: ChecklistItem[];
}

export const CEREMONY_KNOWLEDGE_BASE: CeremonyDefinition[] = [
  // Hindu, North Indian style
  {
    id: "haldi",
    name: "Haldi",
    tradition: "hindu_north_indian",
    typicalOrder: 1,
    oneLiner: "Turmeric paste is applied to the bride and groom, usually by family, for purification and glow before the wedding.",
    checklist: [
      {
        id: "haldi_paste_assignment",
        label: "Turmeric paste vendor or family assignment confirmed",
        reason: "Haldi needs someone to prepare and apply the turmeric paste, either a family elder or a vendor, worth confirming who's doing it.",
        severity: "worth_checking",
      },
      {
        id: "haldi_venue_cleanup",
        label: "Venue cleanup plan confirmed",
        reason: "Haldi gets messy, worth confirming the venue allows it and who handles cleanup after.",
        severity: "worth_checking",
      },
    ],
  },
  {
    id: "mehendi",
    name: "Mehendi",
    tradition: "hindu_north_indian",
    typicalOrder: 2,
    oneLiner: "Henna is applied to the bride's (and often guests') hands and feet.",
    checklist: [
      {
        id: "mehendi_artist_booked",
        label: "Mehendi artist booked",
        reason: "Mehendi is centered on the henna application, worth confirming an artist is booked well ahead since good ones get booked out.",
        severity: "important",
      },
      {
        id: "mehendi_seating_music",
        label: "Seating and music arrangement for guests",
        reason: "Guests usually sit through a long application, worth checking seating and music is planned.",
        severity: "worth_checking",
      },
    ],
  },
  {
    id: "sangeet",
    name: "Sangeet",
    tradition: "hindu_north_indian",
    typicalOrder: 3,
    oneLiner: "A music and dance night where both families celebrate together, often with family performances.",
    checklist: [
      {
        id: "sangeet_rehearsal",
        label: "Choreographer or rehearsal schedule confirmed",
        reason: "Many Sangeets involve family performances, worth checking if rehearsal time is planned.",
        severity: "worth_checking",
      },
      {
        id: "sangeet_sound_stage",
        label: "Sound and stage vendor confirmed",
        reason: "Performances need working sound and a stage, worth confirming a vendor is locked in.",
        severity: "important",
      },
    ],
  },
  {
    id: "wedding_hindu",
    name: "Wedding",
    tradition: "hindu_north_indian",
    typicalOrder: 4,
    oneLiner: "The core ceremony, centered on the Saptapadi, seven vows taken around the sacred fire.",
    checklist: [
      {
        id: "wedding_officiant",
        label: "Pandit or officiant booked",
        reason: "The Pheras need an officiant to conduct the rites, this is core to the ceremony.",
        severity: "important",
      },
      {
        id: "wedding_mandap_havan",
        label: "Mandap and havan (sacred fire) setup arranged",
        reason: "The Saptapadi is performed around the sacred fire, the mandap and havan setup needs a dedicated vendor.",
        severity: "important",
      },
      {
        id: "wedding_kanyadaan",
        label: "Kanyadaan logistics confirmed with the bride's family",
        reason: "Kanyadaan involves the bride's father or guardian, worth confirming who's performing this role and that they're briefed.",
        severity: "worth_checking",
      },
      {
        id: "wedding_sindoor_mangalsutra",
        label: "Sindoor and mangalsutra ready",
        reason: "These are exchanged during the ceremony, small items that are easy to forget in the last minute rush.",
        severity: "worth_checking",
      },
    ],
  },
  {
    id: "reception_hindu",
    name: "Reception",
    tradition: "hindu_north_indian",
    typicalOrder: 5,
    oneLiner: "A post wedding celebration, commonly hosted by the groom's side.",
    checklist: [
      {
        id: "reception_headcount",
        label: "Venue and catering headcount finalized",
        reason: "Reception catering costs and layout depend on a confirmed headcount, worth locking this down early.",
        severity: "important",
      },
      {
        id: "reception_vidaai_timing",
        label: "Vidaai logistics confirmed if happening the same day",
        reason: "If Vidaai happens right before the reception, worth checking the timing doesn't clash.",
        severity: "worth_checking",
      },
    ],
  },

  // Muslim, Nikah
  {
    id: "mehendi_muslim",
    name: "Mehendi",
    tradition: "muslim_nikah",
    typicalOrder: 1,
    oneLiner: "Henna application, a widely shared pre-wedding custom for the bride and guests.",
    checklist: [
      {
        id: "mehendi_muslim_artist_booked",
        label: "Mehendi artist booked",
        reason: "Mehendi is centered on the henna application, worth confirming an artist is booked well ahead since good ones get booked out.",
        severity: "important",
      },
    ],
  },
  {
    id: "nikah",
    name: "Nikah",
    tradition: "muslim_nikah",
    typicalOrder: 2,
    oneLiner: "The marriage contract ceremony, officiated by a Qazi or Imam, with the couple's consent and witnesses present.",
    checklist: [
      {
        id: "nikah_mehr",
        label: "Mehr amount agreed and documented",
        reason: "Nikah ceremonies usually involve a Mehr agreement, this isn't in your plan yet.",
        severity: "important",
      },
      {
        id: "nikah_officiant",
        label: "Qazi or Imam confirmed to officiate",
        reason: "The Nikah needs a Qazi or Imam to conduct it, worth confirming who's been arranged.",
        severity: "important",
      },
      {
        id: "nikah_contract",
        label: "Nikahnama (marriage contract) prepared",
        reason: "The Nikahnama is the written contract signed during the ceremony, worth checking it's ready and who's keeping copies.",
        severity: "important",
      },
      {
        id: "nikah_witnesses",
        label: "Witnesses arranged",
        reason: "A valid Nikah needs witnesses present, worth confirming who's been asked.",
        severity: "worth_checking",
      },
    ],
  },
  {
    id: "walima",
    name: "Walima",
    tradition: "muslim_nikah",
    typicalOrder: 3,
    oneLiner: "The reception hosted by the groom's family after the Nikah.",
    checklist: [
      {
        id: "walima_headcount",
        label: "Venue and catering headcount finalized",
        reason: "Walima catering costs and layout depend on a confirmed headcount, worth locking this down early.",
        severity: "important",
      },
      {
        id: "walima_timing",
        label: "Walima date confirmed relative to the Nikah",
        reason: "Walima is traditionally held after the Nikah, sometimes the same day and sometimes later, worth confirming the couple's preferred timing since families vary on this.",
        severity: "worth_checking",
        verifyNote: "Timing convention varies by family and region, confirm directly rather than assuming.",
      },
    ],
  },

  // Sikh, Anand Karaj
  {
    id: "anand_karaj",
    name: "Anand Karaj",
    tradition: "sikh_anand_karaj",
    typicalOrder: 1,
    oneLiner: "The wedding ceremony held in a Gurdwara in front of the Guru Granth Sahib, centered on the four Laavan.",
    checklist: [
      {
        id: "anand_karaj_venue",
        label: "Gurdwara booked and Granthi confirmed",
        reason: "The Anand Karaj takes place in front of the Guru Granth Sahib in a Gurdwara, worth confirming both the venue and the Granthi are booked.",
        severity: "important",
      },
      {
        id: "anand_karaj_langar",
        label: "Langar (community meal) arranged",
        reason: "Langar is typically served after the ceremony, worth confirming catering or the Gurdwara's langar hall is arranged.",
        severity: "important",
      },
      {
        id: "anand_karaj_laavan",
        label: "Four Laavan order confirmed with the Granthi",
        reason: "Worth confirming the pace and specifics of the four Laavan directly with the Granthi rather than assuming a fixed format.",
        severity: "worth_checking",
        verifyNote: "Exact pacing and customs can vary slightly by Gurdwara and family tradition.",
      },
    ],
  },
  {
    id: "reception_sikh",
    name: "Reception",
    tradition: "sikh_anand_karaj",
    typicalOrder: 2,
    oneLiner: "A post wedding celebration following the Anand Karaj.",
    checklist: [
      {
        id: "reception_sikh_headcount",
        label: "Venue and catering headcount finalized",
        reason: "Reception catering costs and layout depend on a confirmed headcount, worth locking this down early.",
        severity: "important",
      },
    ],
  },
];

export function getCeremonyDefinition(tradition: Tradition, ceremonyName: string): CeremonyDefinition | undefined {
  const normalized = ceremonyName.trim().toLowerCase();
  return CEREMONY_KNOWLEDGE_BASE.find(
    (c) => c.tradition === tradition && c.name.toLowerCase() === normalized,
  );
}

export function getCeremoniesForTradition(tradition: Tradition): CeremonyDefinition[] {
  return CEREMONY_KNOWLEDGE_BASE.filter((c) => c.tradition === tradition).sort(
    (a, b) => a.typicalOrder - b.typicalOrder,
  );
}
