export interface AdEntity {
  id: string;
  title: string;
  description?: string | null;
  mediaUrl?: string | null;
  reward: number;
  active: boolean;
}

export interface AdWatchEntity {
  id?: string;
  userId: string;
  adId: string;
  duration: number;
  date: string;
  createdAt?: string;
}

export interface WatchRewardEntity {
  id?: string;
  userId: string;
  adId: string;
  baseReward: number;
  rewardAmount: number;
  tier?: string | null;
  status: "pending" | "credited" | "rejected" | "reversed";
  createdAt?: string;
}
