import { ImageCreditDisplay } from '@/components/media/ImageCreditDisplay';
import { ImageCreditEditor } from '@/components/media/ImageCreditEditor';
import { ImportImageUrlField } from '@/components/media/ImportImageUrlField';
import { normalizeImageCredit, type ImageCredit } from '@shared/imageCredit';
import { interactionInputProps, type WidgetInteractionHandlers } from './widgetInteraction';

interface ImageDisplayWidgetProps extends WidgetInteractionHandlers {
  campaignHandle: string;
  content: Record<string, unknown>;
  onChange: (newContent: Record<string, unknown>) => void;
  isEditingLayout: boolean;
}

export function ImageDisplayWidget({
  campaignHandle,
  content,
  onChange,
  isEditingLayout,
  onInteractionStart,
  onInteractionEnd,
}: ImageDisplayWidgetProps) {
  const interaction = interactionInputProps({ onInteractionStart, onInteractionEnd });
  const url = typeof content.imageUrl === 'string' ? content.imageUrl : '';
  const caption = typeof content.caption === 'string' ? content.caption : '';
  const imageCredit = normalizeImageCredit(content.imageCredit);

  const patchContent = (patch: {
    imageUrl?: string;
    caption?: string;
    imageCredit?: ImageCredit | null;
  }) => {
    onChange({
      imageUrl: patch.imageUrl ?? url,
      caption: patch.caption ?? caption,
      ...(patch.imageCredit !== undefined
        ? { imageCredit: patch.imageCredit }
        : imageCredit
          ? { imageCredit }
          : {}),
    });
  };

  if (!isEditingLayout && url.trim().length === 0) {
    return null;
  }

  return (
    <div className={isEditingLayout ? 'flex h-full flex-col overflow-hidden rounded-lg border border-border bg-background/60' : ''}>
      {isEditingLayout && (
        <div className="bg-surface/90 px-4 py-2 text-xs uppercase tracking-wide text-muted">
          Image Display
        </div>
      )}

      <div className={isEditingLayout ? 'flex min-h-[180px] flex-1 flex-col items-center justify-center p-4' : 'w-full'}>
        {url ? (
          <img
            src={url}
            alt={caption || 'Image block'}
            className={isEditingLayout ? 'max-h-56 w-full max-w-full rounded-xl object-cover' : 'w-full rounded-xl object-cover'}
          />
        ) : (
          isEditingLayout && (
            <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed border-border bg-background/40 text-sm text-muted">
              No image configured.
            </div>
          )
        )}

        {!isEditingLayout && caption.trim().length > 0 && (
          <p className="mt-2 text-sm text-muted">{caption}</p>
        )}

        {!isEditingLayout && (
          <ImageCreditDisplay credit={imageCredit} className="mt-2" />
        )}

        {isEditingLayout && (
          <div className="mt-3 w-full">
            <p className="text-sm text-foreground">Caption</p>
            <input
              value={caption}
              disabled={!isEditingLayout}
              onChange={(event) => patchContent({ caption: event.target.value })}
              {...interaction}
              placeholder="Image caption"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-primary/60 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <div className="mt-3">
              <ImportImageUrlField
                campaignHandle={campaignHandle}
                value={url}
                onChange={(referenceUrl) => patchContent({ imageUrl: referenceUrl })}
              />
            </div>
            <ImageCreditEditor
              value={imageCredit}
              onChange={(next) => patchContent({ imageCredit: next })}
              disabled={!isEditingLayout}
            />
          </div>
        )}
      </div>
    </div>
  );
}
