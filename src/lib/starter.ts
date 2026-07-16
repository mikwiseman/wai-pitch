import { Deck, type Deck as DeckT } from '@/types/deck';
import { PROJECT_KINDS as DATA_PROJECT_KINDS, starterProjectData } from './starter-data.mjs';

export const PROJECT_KINDS = DATA_PROJECT_KINDS as readonly ['presentation', 'interface', 'prototype'];
export type ProjectKind = (typeof PROJECT_KINDS)[number];

export const DEFAULT_PROJECT_TITLES: Record<ProjectKind, string> = {
  presentation: 'Untitled presentation',
  interface: 'Untitled interface',
  prototype: 'Untitled prototype',
};

export function isProjectKind(value: unknown): value is ProjectKind {
  return typeof value === 'string' && (PROJECT_KINDS as readonly string[]).includes(value);
}

/** A substantial starter canvas tailored to the selected creation mode. */
export function starterDeck(title: string, kind: ProjectKind = 'presentation'): DeckT {
  return Deck.parse(starterProjectData(title, kind));
}
