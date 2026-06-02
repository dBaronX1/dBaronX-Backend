export type RegisterAuthDto = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  referralCode?: string;
  fullName?: string;
};

export type LoginAuthDto = {
  email?: string;
  password?: string;
};

export type PasswordResetRequestDto = {
  email?: string;
};

export type PasswordResetConfirmDto = {
  accessToken?: string;
  password?: string;
  confirmPassword?: string;
};

export type UpdateProfileAuthDto = {
  fullName?: string;
  displayName?: string;
  avatarUrl?: string;
  gender?: string;
  pronouns?: string;
  country?: string;
  phoneCode?: string;
  language?: string;
};
