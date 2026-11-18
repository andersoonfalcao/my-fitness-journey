import { useEffect, useState } from "react";
import type { Profile } from "@/lib/store";
import { PushNotice } from "@/components/PushNotice";
import { WeightNotices } from "@/components/WeightInsights";
import { TrainingInsights } from "@/components/TrainingInsights";
import { CalibrationNotice } from "@/components/CalibrationCard";
import { MeasuresNotice } from "@/components/WeekGoal";
import { AchievementWatcher } from "@/components/Achievements";

/**
 * Every notice of the app, in one list (the Avisos screen). Each one still decides by itself when it shows and how
 * it is dismissed; a notice with nothing to say renders nothing. Each visible notice is one element, so a container
 * can count them (`useNoticeCount`).
 */
export function NoticeList({ profile }: { profile: Profile | null }) {
  return (
    <>
      <PushNotice />
      {profile && (
        <>
          <AchievementWatcher profile={profile} />
          <WeightNotices profile={profile} />
          <TrainingInsights planned={profile.days} streakRow={false} />
          <CalibrationNotice profile={profile} />
          <MeasuresNotice />
        </>
      )}
    </>
  );
}

/** How many notices a container rendering <NoticeList> holds right now (follows them as they appear and go). */
export function useNoticeCount(container: HTMLElement | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!container) return;
    const update = () => setCount(container.children.length);
    update();
    const observer = new MutationObserver(update);
    observer.observe(container, { childList: true });
    return () => observer.disconnect();
  }, [container]);
  return count;
}
