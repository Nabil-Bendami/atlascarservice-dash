import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Loader2, MoonStar, Palette, Save, Shield, Sparkles, UserCircle2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ToastNotice } from "@/components/shared/ToastNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOwnerSettings } from "@/providers/OwnerSettingsProvider";
import type { OwnerSettings } from "@/types";

const tabs = [
  { id: "profile", label: "Profile", icon: UserCircle2 },
  { id: "workspace", label: "Workspace / Company", icon: Sparkles },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: MoonStar },
  { id: "tokens", label: "API & Tokens", icon: KeyRound },
] as const;

const accentOptions = ["#5B5FEF", "#0F9D58", "#F59E0B", "#0EA5E9", "#E11D48"];

type TabId = (typeof tabs)[number]["id"];

export function SettingsPage() {
  const { apiTokens, createToken, loading, previewSettings, profile, revokeToken, saveSettings, settings } = useOwnerSettings();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [draft, setDraft] = useState<OwnerSettings | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [tokenLabel, setTokenLabel] = useState("");
  const [lastToken, setLastToken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setDraft(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!draft) return;
    previewSettings(draft);
  }, [draft, previewSettings]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(draft);
  }, [draft, settings]);

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      console.log("[settings-page] saving draft", draft);
      await saveSettings(draft);
      setNotice({ tone: "success", message: "Owner settings saved successfully." });
    } catch (saveError) {
      console.error("[settings-page] save failed", saveError);
      setNotice({
        tone: "error",
        message: saveError instanceof Error ? saveError.message : "Unable to save owner settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading && !draft) {
    return <div className="py-24 text-center text-sm text-muted-foreground">Loading owner settings…</div>;
  }

  if (!draft || !profile) {
    return <div className="py-24 text-center text-sm text-rose-600">Unable to load owner settings.</div>;
  }

  return (
    <div className="space-y-6">
      {notice ? <ToastNotice tone={notice.tone} message={notice.message} /> : null}
      <PageHeader
        eyebrow="Settings"
        title="Owner settings"
        subtitle="Manage your profile, workspace identity, appearance preferences, notifications, and API access from one workspace-level panel."
        actions={
          <Button disabled={!hasUnsavedChanges || saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save settings
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardContent className="space-y-2 p-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground shadow-soft" : "hover:bg-slate-50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </CardContent>
        </Card>

        {activeTab === "profile" ? (
          <SettingsCard title="Profile">
            <Field label="Owner name">
              <Input
                value={draft.profile.fullName}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          profile: { ...current.profile, fullName: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </Field>
            <Field label="Email">
              <Input value={draft.profile.email} disabled readOnly />
            </Field>
          </SettingsCard>
        ) : null}

        {activeTab === "workspace" ? (
          <SettingsCard title="Workspace / Company">
            <Field label="Workspace name">
              <Input
                value={draft.workspace.workspaceName}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          workspace: { ...current.workspace, workspaceName: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </Field>
            <Field label="Company name">
              <Input
                value={draft.workspace.companyName}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          workspace: { ...current.workspace, companyName: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </Field>
            <Field label="Company website">
              <Input
                value={draft.workspace.companyWebsite}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? {
                          ...current,
                          workspace: { ...current.workspace, companyWebsite: event.target.value },
                        }
                      : current,
                  )
                }
              />
            </Field>
          </SettingsCard>
        ) : null}

        {activeTab === "appearance" ? (
          <SettingsCard title="Appearance">
            <div className="space-y-3">
              <Label>Accent color</Label>
              <div className="flex flex-wrap gap-3">
                {accentOptions.map((accent) => (
                  <button
                    key={accent}
                    type="button"
                    onClick={() =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              appearance: { ...current.appearance, accentColor: accent },
                            }
                          : current,
                      )
                    }
                    className={`h-11 w-11 rounded-2xl border-4 ring-offset-2 transition ${
                      draft.appearance.accentColor === accent ? "border-slate-900 shadow-soft ring-2 ring-ring" : "border-transparent"
                    }`}
                    style={{ backgroundColor: accent }}
                    aria-label={`Accent ${accent}`}
                  />
                ))}
              </div>
            </div>
            <ToggleRow
              label="Dark mode"
              description="Switch the owner workspace to a darker visual theme."
              checked={draft.appearance.darkMode}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        appearance: { ...current.appearance, darkMode: checked },
                      }
                    : current,
                )
              }
            />
            <ToggleRow
              label="Reduce motion"
              description="Minimize transitions and animations across the dashboard."
              checked={draft.appearance.reduceMotion}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        appearance: { ...current.appearance, reduceMotion: checked },
                      }
                    : current,
                )
              }
            />
            <ToggleRow
              label="Compact layout"
              description="Tighten paddings and control heights for denser information display."
              checked={draft.appearance.compactLayout}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        appearance: { ...current.appearance, compactLayout: checked },
                      }
                    : current,
                )
              }
            />
          </SettingsCard>
        ) : null}

        {activeTab === "notifications" ? (
          <SettingsCard title="Notifications">
            <ToggleRow
              label="Email notifications"
              description="Receive owner dashboard alerts by email."
              checked={draft.notifications.emailNotifications}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        notifications: { ...current.notifications, emailNotifications: checked },
                      }
                    : current,
                )
              }
            />
            <ToggleRow
              label="Import notifications"
              description="Get notified when bulk agency or car imports complete."
              checked={draft.notifications.importNotifications}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        notifications: { ...current.notifications, importNotifications: checked },
                      }
                    : current,
                )
              }
            />
            <ToggleRow
              label="Security notifications"
              description="Get alerts for authentication, token, and permission changes."
              checked={draft.notifications.securityNotifications}
              onChange={(checked) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        notifications: { ...current.notifications, securityNotifications: checked },
                      }
                    : current,
                )
              }
            />
          </SettingsCard>
        ) : null}

        {activeTab === "tokens" ? (
          <SettingsCard title="API & Tokens">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <Field label="Token label">
                <Input value={tokenLabel} onChange={(event) => setTokenLabel(event.target.value)} placeholder="Import automation" />
              </Field>
              <div className="flex items-end">
                <Button
                  disabled={!tokenLabel.trim()}
                  onClick={async () => {
                    try {
                      const { token } = await createToken(tokenLabel.trim());
                      setLastToken(token);
                      setTokenLabel("");
                      setNotice({ tone: "success", message: "API token created successfully." });
                    } catch (tokenError) {
                      console.error("[settings-page] create token failed", tokenError);
                      setNotice({
                        tone: "error",
                        message: tokenError instanceof Error ? tokenError.message : "Unable to create API token.",
                      });
                    }
                  }}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Generate token
                </Button>
              </div>
            </div>

            {lastToken ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Copy this token now. It will not be shown again.</p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <code className="rounded-xl bg-white px-3 py-2 text-xs">{lastToken}</code>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lastToken);
                      setNotice({ tone: "success", message: "Token copied to clipboard." });
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {apiTokens.map((token) => (
                <div key={token.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{token.label}</p>
                    <p className="text-sm text-muted-foreground">{token.tokenPreview}</p>
                    <p className="text-xs text-muted-foreground">Created {new Date(token.createdAt).toLocaleString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    disabled={token.isRevoked}
                    onClick={async () => {
                      try {
                        await revokeToken(token.id);
                        setNotice({ tone: "success", message: "API token revoked." });
                      } catch (revokeError) {
                        console.error("[settings-page] revoke token failed", revokeError);
                        setNotice({
                          tone: "error",
                          message: revokeError instanceof Error ? revokeError.message : "Unable to revoke API token.",
                        });
                      }
                    }}
                  >
                    {token.isRevoked ? "Revoked" : "Revoke"}
                  </Button>
                </div>
              ))}
              {!apiTokens.length ? <p className="text-sm text-muted-foreground">No API tokens created yet.</p> : null}
            </div>
          </SettingsCard>
        ) : null}
      </div>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-slate-50 p-4">
      <div>
        <p className="font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`}
        />
      </button>
    </div>
  );
}
