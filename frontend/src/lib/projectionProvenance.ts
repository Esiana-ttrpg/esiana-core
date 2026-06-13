import type { ChronologyDateParts } from './entityRelationTypes';

export interface ProjectionProvenance {
  sourceRelationIds: string[];
  sourceLineageIds: string[];
  resolvedFromDate: ChronologyDateParts;
}

export function buildProjectionProvenance(input: {
  relationIds?: readonly string[];
  lineageIds?: readonly string[];
  resolvedFromDate: ChronologyDateParts;
}): ProjectionProvenance {
  return {
    sourceRelationIds: [...(input.relationIds ?? [])],
    sourceLineageIds: [...(input.lineageIds ?? [])],
    resolvedFromDate: {
      year: input.resolvedFromDate.year,
      month: input.resolvedFromDate.month,
      day: input.resolvedFromDate.day,
    },
  };
}
