export interface PresaleCommitmentEntity {
  id: string;
  email: string;
  amount: number;
  reference?: string | null;
  createdAt: string;
}

export interface PresaleStatsEntity {
  totalRaised: number;
  totalParticipants: number;
}
