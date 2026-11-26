import { motion, useReducedMotion } from 'framer-motion';
import { Clock, ExternalLink, FileBarChart2, LayoutDashboard, Link2, Star, Wrench } from 'lucide-react';

import { brand, type ContentItem, isEmbedReady, type ProfileConfig } from '@/config';

import { fabricReportUrl, findItem, findProfile, isReportSetUp } from './content';
import { ProfileGlyph } from './icons';
import { usePersonal } from './personal-context';

const KIND = {
  dashboard: { icon: LayoutDashboard, label: 'Live dashboard' },
  report: { icon: FileBarChart2, label: 'Power BI report' },
  link: { icon: Link2, label: 'Link' },
} as const;

export type OpenTile = (profileId: string, item: ContentItem) => void;

function Tile({ profileId, item, index, onOpen, showProfile }: { profileId: string; item: ContentItem; index: number; onOpen: OpenTile; showProfile?: boolean }) {
  const reduce = useReducedMotion();
  const personal = usePersonal();
  const ref = { profile: profileId, item: item.id };
  const pinned = personal.isPinned(ref);
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
      <span className="hud-tile-source">
        {[showProfile ? findProfile(profileId)?.name : undefined, item.source].filter(Boolean).join(' · ')}
      </span>
    </>
  );
  const motionProps = reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: Math.min(0.3, 0.03 * index), duration: 0.25 } };
  const cls = `hud-tile ${item.type === 'dashboard' ? 'hud-tile--live' : ''} ${needsSetup ? 'hud-tile--setup' : ''}`;
  const href = item.type === 'link' ? item.url : item.type === 'report' ? fabricReportUrl(item) : undefined;

  return (
    <motion.li {...motionProps} className="hud-tile-wrap">
      {external && href ? (
        <a className={cls} href={href} target="_blank" rel="noopener noreferrer" onClick={() => personal.touch(ref)}>{body}</a>
      ) : (
        <button type="button" className={cls} onClick={() => onOpen(profileId, item)}>{body}</button>
      )}
      <button
        type="button"
        className={`hud-icon-btn hud-pin ${pinned ? 'is-on' : ''}`}
        aria-pressed={pinned}
        aria-label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
        title={pinned ? 'Unpin' : 'Pin to the top of every launchpad'}
        onClick={() => personal.togglePin(ref)}
      >
        <Star className="icon-size-200" aria-hidden fill={pinned ? 'currentColor' : 'none'} />
      </button>
    </motion.li>
  );
}

function Shortcuts({ onOpen }: { onOpen: OpenTile }) {
  const { pins, recent } = usePersonal();
  const pinned = pins.map((r) => ({ r, item: findItem(r.profile, r.item) })).filter((x) => x.item);
  const recents = recent
    .filter((r) => !pins.some((p) => p.profile === r.profile && p.item === r.item))
    .slice(0, 4)
    .map((r) => ({ r, item: findItem(r.profile, r.item) }))
    .filter((x) => x.item);
  if (!pinned.length && !recents.length) return null;
  return (
    <>
      {pinned.length ? (
        <section className="hud-launch-section" aria-label="Pinned">
          <h3 className="hud-title"><Star className="icon-size-200 inline" aria-hidden /> Pinned</h3>
          <ul className="hud-tiles">
            {pinned.map(({ r, item }, i) => <Tile key={`${r.profile}.${r.item}`} profileId={r.profile} item={item!} index={i} onOpen={onOpen} showProfile />)}
          </ul>
        </section>
      ) : null}
      {recents.length ? (
        <section className="hud-launch-section" aria-label="Recently opened">
          <h3 className="hud-title"><Clock className="icon-size-200 inline" aria-hidden /> Recently opened</h3>
          <ul className="hud-tiles">
            {recents.map(({ r, item }, i) => <Tile key={`${r.profile}.${r.item}`} profileId={r.profile} item={item!} index={i} onOpen={onOpen} showProfile />)}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/** A profile's front door: shortcuts, then its content grouped into sections. */
export function Launchpad({ profile, onOpen }: { profile: ProfileConfig; onOpen: OpenTile }) {
  let n = 0;
  return (
    <main className="hud-launchpad" aria-label={`${profile.name} launchpad`}>
      <header className="hud-launch-head">
        <ProfileGlyph icon={profile.icon} className="icon-size-400" />
        <div className="min-w-0 flex-1">
          <h2 className="hud-launch-title">{profile.name}</h2>
          {profile.description ? <p className="hud-launch-desc">{profile.description}</p> : null}
        </div>
      </header>
      <Shortcuts onOpen={onOpen} />
      {profile.sections.map((s) => (
        <section key={s.title} className="hud-launch-section" aria-label={s.title}>
          <h3 className="hud-title">{s.title}</h3>
          {s.description ? <p className="hud-hint">{s.description}</p> : null}
          <ul className="hud-tiles">
            {s.items.map((item) => <Tile key={item.id} profileId={profile.id} item={item} index={n++} onOpen={onOpen} />)}
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
