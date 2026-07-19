=== Askora – Product Questions & Answers for WooCommerce ===
Contributors: nashirbabu
Donate link: https://profiles.wordpress.org/nashirbabu
Tags: woocommerce, questions, answers, product qa, q&a
Requires at least: 7.0
Tested up to: 7.0
Stable tag: 1.0.0
Requires PHP: 5.6
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

A calm, focused Q&A plugin that helps you answer customer questions before they abandon their cart. Built for WooCommerce, priced for real stores.

== Description ==

Customers have questions before they buy, but WooCommerce gives them nowhere to ask. Most stores end up answering everything by email (slow, and invisible to the next buyer with the same question) or skip it entirely and lose the sale. Askora QA adds a proper Q&A section to your product pages so those questions — and their answers — become permanent, searchable content that helps every future buyer.

A customer asks a question, as a guest with a name and email or as a logged-in customer. You're notified by email (and optionally Slack), then reply from a central admin dashboard using saved reply templates. The answer goes live on the product page, where other buyers can upvote it or add their own answer if they've bought the product.

**Features:**

* Q&A section on product pages — as a WooCommerce tab or inline below reviews
* Question submission from guests (name and email) or logged-in customers
* Community answers from verified buyers, with "Verified Buyer" and "Store Staff" badges
* Moderation dashboard with pending questions, pending answers, flagged, answered, and rejected views; bulk approve, reject, dismiss flags, or delete
* Flagging with auto-hide after 3 flags
* Upvote system on questions and answers
* Live search on the front-end Q&A widget, plus admin-side search across questions, customers, and products
* Reply templates with categories (Shipping, Returns, Sizing, Materials, Warranty, and more) for fast, consistent answers
* Email notifications for new questions and community answers pending review, plus optional Slack webhook alerts
* Daily digest and unanswered-question reminder emails
* Spam protection: honeypot field, reCAPTCHA v2, per-user submission rate limiting, profanity filter with configurable word list, and email blocklist/allowlist
* Full appearance customization: brand colour, corner radius, avatar style, card style, font, and density
* Scope control: show Q&A on all products, specific categories, specific products, or with per-product excludes
* Works on WordPress Multisite

Free forever — no upgrade prompts, no locked features.

== Third-Party Services ==

This plugin uses the following third-party services:

= Google reCAPTCHA =

This plugin uses Google reCAPTCHA to protect the Q&A submission form from spam
and abusive submissions. When a user submits a question on a WooCommerce product
page, the following occurs:

* The Google reCAPTCHA JavaScript library is loaded from:
  https://www.google.com/recaptcha/api.js

* The user's reCAPTCHA response token is sent to Google's verification server at:
  https://www.google.com/recaptcha/api/siteverify

* The user's IP address is transmitted to Google as part of the verification process.

This means data (including IP address and reCAPTCHA response tokens) is sent to
Google's servers when a user interacts with the Q&A submission form.

This service is provided by Google LLC.

* Google reCAPTCHA Terms of Service: https://policies.google.com/terms
* Google Privacy Policy: https://policies.google.com/privacy
* Google reCAPTCHA Documentation: https://developers.google.com/recaptcha

== Development ==

The complete source code is on GitHub: https://github.com/nasirbabu/quick-qa-for-woocommerce. The git tag matching each https://wordpress.org/ version is the exact source used for that release ZIP.

= Requirements =
* Node.js 18+
* npm 9+

= Available Commands =

    npm install     — Install dependencies
    npm run dev     — Start development server
    npm run build   — Build for production
    npm run preview — Preview production build

= Development Workflow =

1. Install dependencies:

    npm install

2. Start development server:

    npm run dev

3. Build for production:

    npm run build

= Tech Stack =
* React 18
* Vite 5
* WordPress Plugin API

== Installation ==

1. Upload the `quick-qa-for-woocommerce` folder to the `/wp-content/plugins/` directory.
2. Activate the plugin through the **Plugins** menu in WordPress.
3. Go to **Askora QA** in the WordPress admin to configure settings.
4. The Q&A tab will appear automatically on WooCommerce product pages.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =

Yes. WooCommerce must be installed and active.

= Can guests ask questions without logging in? =

Yes. Guest questions can be enabled from the Settings page. Guests provide their name and email address.

= How do I moderate questions? =

Questions go into a pending queue. Visit **Askora QA → All Q&A** in the admin to approve, answer, or reject them.

= Can I customise the appearance? =

Yes. Visit **Askora QA → Appearance** to change the brand colour, avatar shape, widget position, and more.

== Screenshots ==

1. Q&A tab on a WooCommerce product page.
2. Admin Q&A management panel.
3. Appearance settings page.

== Changelog ==

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.0.0 =
Initial release.
