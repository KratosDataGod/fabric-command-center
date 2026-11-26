import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, FileBarChart2, LayoutDashboard, Link2, Wrench } from 'lucide-react';

import { brand, type ContentItem, isEmbedReady, type ProfileConfig } from '@/config';

import { fabricReportUrl, isReportSetUp } from './content';
import { ProfileGlyph } from './icons';

const KIND = {
  dashboard: { icon: LayoutDashboard, label: 'Live dashboard' },
  report: { icon: FileBarChart2, label: 'Power BI report' },
  link: { icon: Link2, label: 'Link' },
} as const;

function Tile({ item, index, onOpen }: { item: ContentItem; index: number; onOpen: (item: ContentItem) => void }) {
  const reduce = useReducedMotion();
  const kind = KIND[item.type];
  const needsSetup = item.type === 'report' && !isReportSetUp(item);
  const external = item.type === 'link' || (item.type === 'report' && !needsSetup && !isEmbedReady);
  const body = (
    <>
      <span className="hud-tile-top">
        <span className="hud-tile-kind"><kind.icon className="icon-size-200" aria-hidden /> {kind.label}</span>
        {needsSetup ? (
          <span className="hud-tile-flag"><Wrench className="icon-size-100" aria-hidden /> Setup needed</span>
        ) : external ? (
          <ExternalLink className="icon-size-200" aria-label="Opens in a new tab" />
        ) : null}
      </span>
      <span className="hud-tile-title">{item.title}</span>
      {item.description ? <span className="hud-tile-desc">{item.description}</span> : null}
      {item.source ? <span className="hud-tile-source">{item.source}</span> : null}
    </>
  );
  const motionProps = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.03 * index, duration: 0.25 } };

  if (needsSetup) {
    return (
      <motion.li {...motionProps}>
        <button type="button" className="hud-tile hud-tile--setup" onClick={() => onOpen(item)}>{body}</button>
      </motion.li>
    );
  }
  if (external) {
    const href = item.type === 'link' ? item.url : fabricReportUrl(item as Extract<ContentItem, { type: 'report' }>);
    return (
      <motion.li {...motionProps}>
        <a className="hud-tile" href={href} target="_blank" rel="noopener noreferrer">{body}</a>
      </motion.li>
    );
  }
  return (
    <motion.li {...motionProps}>
      <button type="button" className={`hud-tile ${item.type === 'dashboard' ? 'hud-tile--live' : ''}`} onClick={() => onOpen(item)}>{body}</button>
    </motion.li>
  );
}

/** A profile's front door: its content, grouped into sections. */
export function Launchpad({ profile, onOpen }: { profile: ProfileConfig; onOpen: (item: ContentItem) => void }) {
  let n = 0;
  return (
    <main className="hud-launchpad" aria-label={`${profile.name} launchpad`}>
      <header className="hud-launch-head">
        <ProfileGlyph icon={profile.icon} className="icon-size-400" />
        <div>
          <h2 className="hud-launch-title">{profile.name}</h2>
          {profile.description ? <p className="hud-launch-desc">{profile.description}</p> : null}
        </div>
      </header>
      {profile.sections.map((s) => (
        <section key={s.title} className="hud-launch-section" aria-label={s.title}>
          <h3 className="hud-title">{s.title}</h3>
          {s.description ? <p className="hud-hint">{s.description}</p> : null}
          <ul className="hud-tiles">
            {s.items.map((item) => <Tile key={item.id} item={item} index={n++} onOpen={onOpen} />)}
          </ul>
        </section>
      ))}
      {brand.footer?.text ? (
        <footer className="hud-hint hud-launch-foot">
          {brand.footer.url ? <a className="hud-link" href={brand.footer.url} target="_blank" rel="noopener noreferrer">{brand.footer.text}</a> : brand.footer.text}
        </footer>
      ) : null}
    </main>
  );
}
