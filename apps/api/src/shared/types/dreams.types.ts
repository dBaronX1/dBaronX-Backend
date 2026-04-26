export interface DreamEntity {
  id: string;
  title: string;
  description?: string | null;
  goal: number;
  raised: number;
  createdAt: string;
}

export interface DreamBackerEntity {
  id: string;
  dreamId: string;
  amount: number;
  createdAt: string;
}
