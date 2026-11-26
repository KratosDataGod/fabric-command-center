import { ExternalLink } from 'lucide-react';

import type { ReportItem } from '@/config';
import { Drawer } from '@/features/drawer';

/** What a company admin needs to do before a report tile works. */
export function SetupNeeded({ item, profileId, onClose }: { item: ReportItem; profileId: string; onClose: () => void }) {
  return (
    <Drawer title="Setup needed" onClose={onClose}>
      <section className="hud-filter">
        <h3 className="hud-title">{item.title}</h3>
        {item.description ? <p>{item.description}</p> : null}
        <p>
          This tile points at a Power BI report that has not been connected yet. An admin adds the report&apos;s
          workspace ID and report ID to <code className="hud-mono">customize/profiles/{profileId}.json</code>, under the
          tile with id <code className="hud-mono">{item.id}</code>, then redeploys.
        </p>
        <p>
          Both IDs are in the report&apos;s address in Fabric: <code className="hud-mono">/groups/&lt;workspaceId&gt;/reports/&lt;reportId&gt;</code>.
        </p>
        {item.source ? <p className="hud-hint">Source: {item.source}</p> : null}
        <a className="hud-link" href="https://github.com/KratosDataGod/fabric-command-center/blob/main/docs/profiles.md" target="_blank" rel="noopener noreferrer">
          How profiles work <ExternalLink className="icon-size-100 inline" aria-hidden />
        </a>
      </section>
    </Drawer>
  );
}
