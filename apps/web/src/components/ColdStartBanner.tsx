import { STAPLE_COLD_START_MAX_TRIPS, STAPLE_COLD_START_MIN_WEEKS } from "@safeway-analytics/shared";

interface ColdStartBannerProps {
  windowTripCount: number;
  activeWeeks: number;
  staplesMode: string;
  staplesMessage: string | null;
}

export function ColdStartBanner({
  windowTripCount,
  activeWeeks,
  staplesMode,
  staplesMessage,
}: ColdStartBannerProps) {
  if (
    windowTripCount >= STAPLE_COLD_START_MAX_TRIPS &&
    activeWeeks >= STAPLE_COLD_START_MIN_WEEKS &&
    staplesMode !== "cold_start"
  ) {
    return null;
  }

  const title =
    windowTripCount < STAPLE_COLD_START_MAX_TRIPS ||
    activeWeeks < STAPLE_COLD_START_MIN_WEEKS
      ? "Building your history"
      : "Provisional insights";

  const body =
    staplesMessage ??
    `Sync more trips in the last 90 days (${windowTripCount} trips, ${activeWeeks} active weeks) to unlock staples and richer trends.`;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="font-semibold text-amber-900">{title}</p>
      <p className="mt-1 text-sm text-amber-800">{body}</p>
    </div>
  );
}
