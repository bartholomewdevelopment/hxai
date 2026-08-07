import { Disclaimer } from '../components/Disclaimer';

export function AboutPage() {
  return (
    <>
      <div className="page-header">
        <p className="eyebrow">About</p>
        <h1>How this library works</h1>
      </div>

      <div style={{ marginBottom: 32, maxWidth: 'var(--reading-width)' }}>
        <Disclaimer />
      </div>

      <div className="prose">
        <p>
          HistoryAI reconstructs how a historical figure wrote and spoke, using only documents that
          can be pointed at. Every conversation follows the same order, and the order is the point:
        </p>
        <p>
          <strong>Source → Retrieval → Response → Citation.</strong> Documents are catalogued and
          indexed first. A question retrieves passages from that catalogue. Only then is a response
          composed, from those passages. Citations are assembled from the catalogue records
          themselves — never written by the model, and never sourced after the fact.
        </p>
        <p>
          Quotations are reproduced verbatim from the stored text. Sources are labelled by kind —
          the figure&rsquo;s own words, an account by a contemporary, or a later scholarly work —
          because the difference matters to what a claim is worth. And each figure is bounded in
          time: material dated after their death is never retrieved, so they cannot comment on a
          world they did not see.
        </p>
        <p>
          What this cannot do is give you the person. It gives you a careful, cited reading of what
          they left behind, and shows its work so you can disagree with it.
        </p>
      </div>
    </>
  );
}
