export type CalendarSubscriptionStatus = {
  active: true;
  createdAt: string;
  updatedAt: string;
  lastAccessAt: string | null;
};

export type CalendarSubscriptionStatusResponse = {
  subscription: CalendarSubscriptionStatus | null;
};

export type CalendarSubscriptionIssuedResponse = {
  subscription: CalendarSubscriptionStatus & { url: string };
};
