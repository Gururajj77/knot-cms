import type { ProjectStatus } from "@notion-framer/shared";
import { useEffect, useRef, useState } from "react";
import { needsWebhookSetup } from "./webhook";

/** Poll while webhook setup is in progress. */
export const PROJECT_WEBHOOK_SETUP_POLL_MS = 30_000;

/** Poll while publish cooldown is active. */
export const PROJECT_COOLDOWN_POLL_MS = 60_000;

export function projectStatusNeedsPolling(
  status: ProjectStatus | null,
  clientCooldownSec = 0,
): boolean {
  if (!status) return false;
  if (needsWebhookSetup(status)) return true;

  if (!status.autoPublish) return false;

  const serverCooldown = status.publishCooldownRemainingSec ?? 0;
  const cooldownSec = Math.max(serverCooldown, clientCooldownSec);
  return cooldownSec > 0;
}

function pollIntervalMs(status: ProjectStatus): number {
  return needsWebhookSetup(status)
    ? PROJECT_WEBHOOK_SETUP_POLL_MS
    : PROJECT_COOLDOWN_POLL_MS;
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible;
}

/**
 * Poll project status only when webhook setup or publish cooldown needs live updates.
 * Pauses while the browser tab is hidden; refreshes once when the tab is shown again.
 */
export function useProjectStatusPoll(
  load: () => void | Promise<void>,
  status: ProjectStatus | null,
  clientCooldownSec = 0,
): void {
  const tabVisible = useDocumentVisible();
  const needsPolling = projectStatusNeedsPolling(status, clientCooldownSec);
  const pollMs = status ? pollIntervalMs(status) : PROJECT_COOLDOWN_POLL_MS;

  const wasVisibleRef = useRef(tabVisible);

  useEffect(() => {
    if (!needsPolling || !tabVisible) return;

    const interval = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(interval);
  }, [load, needsPolling, tabVisible, pollMs]);

  useEffect(() => {
    const becameVisible = tabVisible && !wasVisibleRef.current;
    wasVisibleRef.current = tabVisible;
    if (becameVisible && needsPolling) {
      void load();
    }
  }, [tabVisible, needsPolling, load]);
}
