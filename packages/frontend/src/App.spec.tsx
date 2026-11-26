import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import App from '@/App';
import { profiles } from '@/config';

describe('App', () => {
  beforeEach(() => localStorage.clear());

  it('opens on a profile launchpad built from /customize', () => {
    render(<App />);
    const first = profiles[0]!;
    expect(screen.getByRole('heading', { name: first.name })).toBeInTheDocument();
    for (const s of first.sections) expect(screen.getByRole('heading', { name: s.title })).toBeInTheDocument();
  });

  it('switches profiles from the picker', () => {
    render(<App />);
    const other = profiles[1];
    if (!other) return;
    fireEvent.click(screen.getByRole('button', { name: /Switch profile/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: new RegExp(other.name) }));
    expect(screen.getByRole('heading', { name: other.name })).toBeInTheDocument();
  });

  it('explains report tiles that still need setup', () => {
    const withSetup = profiles.find((p) => p.sections.some((s) => s.items.some((i) => i.type === 'report' && !i.reportId)));
    if (!withSetup) return;
    render(<App />);
    if (withSetup.id !== profiles[0]!.id) {
      fireEvent.click(screen.getByRole('button', { name: /Switch profile/ }));
      fireEvent.click(screen.getByRole('menuitemradio', { name: new RegExp(withSetup.name) }));
    }
    fireEvent.click(screen.getAllByText('Setup needed')[0]!.closest('button')!);
    expect(screen.getByRole('dialog')).toHaveTextContent(`customize/profiles/${withSetup.id}.json`);
  });
});
