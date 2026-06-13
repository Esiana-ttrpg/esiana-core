import type { SessionConfidence } from '@shared/sceneTimelineProjection';

export function sceneTimelineCardClasses(input: {
  sessionConfidence: SessionConfidence;
  isBlocked: boolean;
  sceneStatus: string;
}): string {
  const classes: string[] = ['rounded-lg border bg-background px-3 py-2 transition-opacity'];

  if (input.sceneStatus === 'PLAYED' || input.sceneStatus === 'SKIPPED') {
    classes.push('border-border/60 opacity-60');
  } else {
    switch (input.sessionConfidence) {
      case 'committed':
        classes.push('border-border opacity-100');
        break;
      case 'tentative':
        classes.push('border-dashed border-border opacity-100');
        break;
      case 'distant':
        classes.push('border-border opacity-55');
        break;
      default:
        classes.push('border-border');
    }
  }

  if (input.isBlocked) {
    classes.push('border-l-4 border-l-amber-500/80');
  }

  return classes.join(' ');
}

export function sessionConfidenceLabel(confidence: SessionConfidence): string | null {
  if (confidence === 'tentative') return 'Tentative';
  return null;
}
