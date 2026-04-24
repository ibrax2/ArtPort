"use client";

import { useEffect, useState, type FormEvent } from "react";

import { fetchCurrentUser } from "@/lib/currentUserApi";
import { patchUserSettings } from "@/lib/userSettingsApi";
import { sanitizeSingleLineText, TEXT_LIMITS } from "@/lib/textInput";

import styles from "./settings.module.css";

const USER_STATE_EVENT = "artport-user-updated";

export default function SettingsPageClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    showEmailOnProfile: false,
    isPrivate: false,
  });
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((data) => {
      if (cancelled || !data?._id) return;

      setUserId(String(data._id));
      setForm((current) => ({
        ...current,
        username: data.username || "",
        showEmailOnProfile: !!data.showEmailOnProfile,
        isPrivate: !!data.isPrivate,
      }));
      setEmail(data.email || "");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) return;

    const wantsPasswordChange =
      form.currentPassword.length > 0 ||
      form.newPassword.length > 0 ||
      form.confirmNewPassword.length > 0;

    if (wantsPasswordChange && !form.currentPassword) {
      setStatus({ kind: "error", message: "Enter your current password to set a new one." });
      return;
    }

    if (wantsPasswordChange && !form.newPassword) {
      setStatus({ kind: "error", message: "Enter a new password." });
      return;
    }

    if (wantsPasswordChange && !form.confirmNewPassword) {
      setStatus({ kind: "error", message: "Confirm your new password." });
      return;
    }

    if (wantsPasswordChange && form.newPassword !== form.confirmNewPassword) {
      setStatus({ kind: "error", message: "New password and confirm password must match." });
      return;
    }

    setStatus({ kind: "saving", message: "Saving settings…" });

    try {
      await patchUserSettings(userId, {
        username: form.username.trim(),
        showEmailOnProfile: form.showEmailOnProfile,
        isPrivate: form.isPrivate,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
      });

      window.dispatchEvent(new Event(USER_STATE_EVENT));
      setStatus({ kind: "saved", message: "Settings saved" });
      setForm((current) => ({
        ...current,
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save settings",
      });
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.aside}>
          <p className={styles.kicker}>Account settings</p>
          <h1 className={styles.title}>Keep your profile tight, visible, or private.</h1>
          <p className={styles.copy}>
            Adjust how your account appears across ArtPort.
          </p>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Login email</span>
            <strong className={styles.summaryValue}>{email || "Not available"}</strong>
            <span className={styles.summaryHint}>
              This stays your sign-in address. The toggle only controls what viewers can see.
            </span>
          </div>
        </aside>

        <form className={styles.card} onSubmit={handleSubmit}>
          <div className={styles.section}>
            <label className={styles.label} htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={styles.input}
              value={form.username}
              onChange={(event) =>
                updateField(
                  "username",
                  sanitizeSingleLineText(event.target.value, TEXT_LIMITS.username)
                )
              }
              maxLength={32}
              placeholder="Your display name"
            />
          </div>

          <div className={styles.grid}>
            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={form.showEmailOnProfile}
                onChange={(event) => updateField("showEmailOnProfile", event.target.checked)}
              />
              <span>
                <strong>Show email on profile</strong>
                <small>Let visitors see your email on your public profile.</small>
              </span>
            </label>

            <label className={styles.toggleRow}>
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(event) => updateField("isPrivate", event.target.checked)}
              />
              <span>
                <strong>Private account</strong>
                <small>Opening the profile only shows the privacy notice.</small>
              </span>
            </label>
          </div>

          <div className={styles.sectionDivider} />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Change password</h2>
            <div className={styles.passwordGrid}>
              <input
                className={styles.input}
                type="password"
                value={form.currentPassword}
                onChange={(event) => updateField("currentPassword", event.target.value)}
                placeholder="Current password"
              />
              <input
                className={styles.input}
                type="password"
                value={form.newPassword}
                onChange={(event) => updateField("newPassword", event.target.value)}
                placeholder="New password"
              />
              <input
                className={styles.input}
                type="password"
                value={form.confirmNewPassword}
                onChange={(event) => updateField("confirmNewPassword", event.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>

          <div className={styles.footer}>
            <p
              className={`${styles.status} ${
                status.kind === "error"
                  ? styles.statusError
                  : status.kind === "saved"
                    ? styles.statusSaved
                    : ""
              }`}
              aria-live="polite"
            >
              {status.message || "Changes are saved on demand."}
            </p>
            <button className={styles.button} type="submit" disabled={status.kind === "saving"}>
              {status.kind === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}