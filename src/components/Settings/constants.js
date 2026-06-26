export const DEFAULT_SETTINGS = {
  // General — scope
  enable_scope:        'all',
  enabled_categories:  [],
  enabled_products:    [],
  excluded_products:   [],

  // General — display
  position:            'tab',
  tab_name:            'Questions & Answers',
  per_page:            10,

  // General — sorting & filters
  default_sort:        'recent',
  show_search:         true,
  show_filter:         true,

  // General — question limits
  max_length:          500,
  min_length:          10,

  // General — community answers
  allow_community:     true,
  auto_lock:           'never',

  // General — operations
  pause_submissions:   false,

  // Notifications
  notify_new_question:       true,
  new_question_recipients:   '',
  notify_mode:               'instant',
  digest_time:               '09:00',
  notify_community_answer:   true,
  notify_upvote_threshold:   true,
  upvote_threshold_value:    5,
  notify_unanswered_reminder: true,
  unanswered_reminder_days:  3,
  slack_webhook:             '',

  // Moderation
  question_approval_mode: 'manual',
  profanity_filter:       true,
  profanity_words:        'spam, scam, fake',
  auto_reject_short:      true,
  email_blocklist:        '',
  email_allowlist:        '',

  // Submission
  who_can_ask:              'both',
  require_email_for_guests: true,
  enable_honeypot:          false,
  submission_rate_limit:    3,
  recaptcha_enabled:        false,
  recaptcha_site_key:       '',
  recaptcha_secret_key:     '',
};

export const TABS = [
  { key: 'general',       label: 'General' },
  { key: 'submission',    label: 'Submission' },
  { key: 'moderation',    label: 'Moderation' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance',    label: 'Appearance' },
];
