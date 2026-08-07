import {
  AI_RECONSTRUCTION_DISCLAIMER,
  AI_RECONSTRUCTION_DISCLAIMER_SHORT,
} from '@historyai/shared';

/**
 * Required on every person and chat surface. The copy lives in
 * @historyai/shared so the wording is identical everywhere it appears and can
 * only be changed in one place.
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <aside className={`disclaimer${compact ? ' disclaimer--compact' : ''}`} role="note">
      <span className="disclaimer__icon" aria-hidden="true">
        ⚠
      </span>
      <span>{compact ? AI_RECONSTRUCTION_DISCLAIMER_SHORT : AI_RECONSTRUCTION_DISCLAIMER}</span>
    </aside>
  );
}
