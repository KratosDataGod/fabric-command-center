import {
  ChevronDown,
  ChevronRight,
  Home,
  Layers,
  Search,
  Zap,
} from "lucide-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  brand,
  brandAsset,
  type ContentItem,
  isFeatureOn,
  models,
  profiles,
  type ReportItem,
} from "@/config";
import { rememberLook } from "@/brand/apply-brand";
import { DashboardScreen } from "@/dashboard/dashboard-screen";
import { useTheme } from "@/hooks/theme.context";
import { Boot } from "@/hud/boot";
import { HudError } from "@/hud/panel";
import { type Filters, setValues } from "@/state/filters";
import type { Route } from "@/state/navigation";

import { CommandPalette } from "./command-palette";
import {
  dimsFor,
  fabricReportUrl,
  findItem,
  findProfile,
  isReportSetUp,
  rememberProfile,
  screenFor,
} from "./content";
import { ProfileGlyph } from "./icons";
import { Launchpad } from "./launchpad";
import { usePersonal } from "./personal-context";
import { PersonalProvider } from "./personal-provider";
import { SetupNeeded } from "./setup-needed";
import { ToastProvider } from "./toast";
import { useRoute } from "./use-route";

const ReportView = lazy(() =>
  import("@/features/embed/report-view").then((m) => ({
    default: m.ReportView,
  })),
);

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hud-mono hud-clock">
      {now.toLocaleTimeString([], { hour12: false })}
    </span>
  );
}

function ProfilePicker({
  current,
  onPick,
}: {
  current: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === "Escape"
          : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const profile = findProfile(current);
  if (profiles.length < 2) return null;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="hud-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${profile?.name ?? "Profile"}: switch profile`}
        onClick={() => setOpen((o) => !o)}
      >
        <ProfileGlyph icon={profile?.icon} /> {profile?.name ?? "Profile"}{" "}
        <ChevronDown className="icon-size-100" aria-hidden />
      </button>
      {open ? (
        <div
          className="hud-menu hud-menu--left"
          role="menu"
          aria-label="Profiles"
        >
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={p.id === current}
              className="hud-menu-item"
              onClick={() => {
                setOpen(false);
                onPick(p.id);
              }}
            >
              <ProfileGlyph icon={p.icon} />
              <span className="flex flex-col items-start">
                <span>{p.name}</span>
                {p.description ? (
                  <span
                    className="hud-hint"
                    style={{ textTransform: "none", letterSpacing: 0 }}
                  >
                    {p.description}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Shell() {
  const { isDark, toggleTheme } = useTheme();
  const { route, navigate, deepLinks } = useRoute();
  const [setup, setSetup] = useState<{
    item: ReportItem;
    profileId: string;
  } | null>(null);
  const [palette, setPalette] = useState(false);
  const personal = usePersonal();
  const profile = findProfile(route.profile);
  const item = findItem(route.profile, route.item);
  const logo = brandAsset(brand.mark) ?? brandAsset(brand.logo);

  useEffect(() => {
    if (profile) rememberProfile(profile.id);
  }, [profile]);

  const go = useCallback(
    (r: Route, replace?: boolean) => navigate(r, { replace }),
    [navigate],
  );
  const setFilters = useCallback(
    (filters: Filters) => go({ ...route, filters }),
    [go, route],
  );

  const open = (profileId: string, it: ContentItem) => {
    if (it.type === "report" && !isReportSetUp(it))
      return setSetup({ item: it, profileId });
    const screen = screenFor(it);
    personal.touch({ profile: profileId, item: it.id });
    if (screen)
      go({ profile: profileId, screen, item: it.id, filters: route.filters });
    else {
      const href =
        it.type === "link"
          ? it.url
          : it.type === "report"
            ? fabricReportUrl(it)
            : undefined;
      if (href) window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((o) => !o);
      } else if (
        e.key === "/" &&
        !palette &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        )
      ) {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [palette]);
  const openElsewhere = (
    profileId: string,
    itemId: string,
    filters: Filters,
  ) => {
    const target = findItem(profileId, itemId);
    const screen = target && screenFor(target);
    if (screen) go({ profile: profileId, screen, item: itemId, filters });
  };
  const toggleLook = () => {
    rememberLook(isDark ? "comic" : "hud");
    toggleTheme();
  };

  let body;
  if (!profile) {
    body = (
      <main className="hud-launchpad">
        <HudError message="No profiles are enabled. Add one under customize/profiles/." />
      </main>
    );
  } else if (route.screen === "launchpad" || !item) {
    body = (
      <Launchpad
        profile={profile}
        onOpen={open}
      />
    );
  } else if (item.type === "dashboard" && models[item.model]) {
    body = (
      <DashboardScreen
        key={`${profile.id}.${item.id}`}
        model={models[item.model]!}
        profileId={profile.id}
        itemId={item.id}
        title={item.title}
        mode={route.screen === "workbench" ? "workbench" : "hud"}
        filters={route.filters ?? {}}
        onFilters={setFilters}
        onMode={(m) =>
          go({
            ...route,
            screen: m === "workbench" ? "workbench" : "dashboard",
          })
        }
        onOpenElsewhere={openElsewhere}
        dimsFor={dimsFor}
        deepLinks={deepLinks}
      />
    );
  } else if (item.type === "report" && screenFor(item) === "report") {
    body = (
      <Suspense fallback={<div className="hud-skel" aria-label="Loading" />}>
        <ReportView
          item={item}
          filters={route.filters ?? {}}
          isDark={isDark}
          onSelect={(d, v) =>
            setFilters(setValues(route.filters ?? {}, d, [v]))
          }
        />
      </Suspense>
    );
  } else {
    body = (
      <Launchpad
        profile={profile}
        onOpen={open}
      />
    );
  }

  return (
    <div className="hud">
      {isFeatureOn("bootSequence") ? <Boot /> : null}
      <div className="hud-shell">
        <header className="hud-header">
          <div className="hud-brand">
            {logo ? <img src={logo} alt="" className="hud-mark" /> : null}
            <div>
              <h1 title={brand.tagline}>
                {brand.name}{" "}
                {brand.titleAccent ? <span>{brand.titleAccent}</span> : null}
              </h1>
              <nav className="hud-crumbs" aria-label="Breadcrumb">
                <button
                  type="button"
                  className="hud-crumb"
                  onClick={() =>
                    profile && go({ profile: profile.id, screen: "launchpad" })
                  }
                  title="Back to the launchpad"
                >
                  <Home className="icon-size-100" aria-hidden />{" "}
                  {profile?.name ?? "Home"}
                </button>
                {item && route.screen !== "launchpad" ? (
                  <>
                    <ChevronRight className="icon-size-100" aria-hidden />
                    <span className="hud-label">{item.title}</span>
                  </>
                ) : null}
              </nav>
            </div>
          </div>

          <div className="hud-status">
            <button
              type="button"
              className="hud-btn"
              onClick={() => setPalette(true)}
              title="Search everything (Ctrl K)"
            >
              <Search className="icon-size-200" aria-hidden /> Search{" "}
              <kbd className="hud-kbd">Ctrl K</kbd>
            </button>
            <ProfilePicker
              current={route.profile}
              onPick={(id) => go({ profile: id, screen: "launchpad" })}
            />
            <Clock />
            {brand.allowLookToggle !== false ? (
              <button
                type="button"
                className="hud-btn"
                onClick={toggleLook}
                title={
                  isDark
                    ? "Switch to the light look"
                    : "Switch to the dark look"
                }
              >
                {isDark ? (
                  <Zap className="icon-size-200" aria-hidden />
                ) : (
                  <Layers className="icon-size-200" aria-hidden />
                )}
                {isDark
                  ? (brand.copy?.lookLabels?.comic ?? "Comic mode")
                  : (brand.copy?.lookLabels?.hud ?? "HUD mode")}
              </button>
            ) : null}
          </div>
        </header>
        {body}
      </div>
      {setup ? (
        <SetupNeeded
          item={setup.item}
          profileId={setup.profileId}
          onClose={() => setSetup(null)}
        />
      ) : null}
      {palette ? (
        <CommandPalette
          onClose={() => setPalette(false)}
          onOpenTile={(hit) => open(hit.profileId, hit.item)}
          onPickProfile={(id) => go({ profile: id, screen: "launchpad" })}
          onOpenView={(v) => openElsewhere(v.profileId, v.itemId, v.filters)}
          actions={[
            {
              id: "home",
              label: "Go to the launchpad",
              hint: profile?.name,
              run: () =>
                profile && go({ profile: profile.id, screen: "launchpad" }),
            },
            ...(brand.allowLookToggle !== false
              ? [
                  {
                    id: "look",
                    label: isDark
                      ? "Switch to the light look"
                      : "Switch to the dark look",
                    run: toggleLook,
                  },
                ]
              : []),
          ]}
        />
      ) : null}
    </div>
  );
}

/** Header, profile switching, search and routing between the launchpad and content. */
export function AppShell() {
  return (
    <PersonalProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </PersonalProvider>
  );
}
