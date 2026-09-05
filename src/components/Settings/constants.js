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

  // Appearance
  appr_color:              '#FF6B4A',
  appr_radius:             'rounded',
  appr_avatar_style:       'circle',
  appr_card_style:         'bordered',
  appr_font_mode:          'inherit',
  appr_font_custom:        '',
  appr_font_size:          'medium',
  appr_density:            'comfortable',
  appr_show_upvotes:       true,
  appr_show_helpful:       true,
  appr_show_role_badges:   true,
  appr_show_best_highlight: true,
  appr_show_avatars:       true,
  appr_custom_css:         '',

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
  notify_flag_threshold:     true,
  slack_webhook:             '',

  // Moderation
  question_approval_mode: 'manual',
  profanity_filter:       true,
  profanity_words:        'spam, scam, fake',
  auto_reject_short:      true,
  email_blocklist:        '',
  email_allowlist:        '',
  flag_auto_hide_threshold: 3,

  // Submission
  who_can_ask:              'both',
  require_email_for_guests: true,
  enable_honeypot:          false,
  submission_rate_limit:    3,
  recaptcha_enabled:        false,
  recaptcha_site_key:       '',
  recaptcha_secret_key:     '',

  // Community
  allow_verified_buyers:    true,
  allow_logged_in_customers: true,
  verified_buyer_approval:  'require',
  community_approval:       'always',
  followup_approval:        'auto',
  enable_trust_tier:        false,
  trust_helpful_threshold:  3,

  // SEO — JSON-LD schema output
  seo_enabled:                true,
  seo_schema_type:            'QAPage',
  seo_delegate_to_seo_plugin: false,
  seo_include_rule:           'all-answered',
  seo_upvote_min:             1,
  seo_max_per_product:        10,
};

export const TABS = [
  { key: 'general',         label: 'General' },
  { key: 'submission',      label: 'Submission' },
  { key: 'moderation',      label: 'Moderation' },
  { key: 'notifications',   label: 'Notifications' },
  { key: 'community',       label: 'Community' },
  { key: 'appearance',      label: 'Appearance' },
  { key: 'email-templates', label: 'Email templates' },
  { key: 'seo',             label: 'SEO' },
  { key: 'import-export',   label: 'Import / Export' },
];
