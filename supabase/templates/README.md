# Sign-in email templates

Branded replacements for Supabase's default auth emails. Supabase only allows
editing templates once custom SMTP is configured (docs/PROGRESS.md, items 1–2).

| Supabase template | File | Subject |
|---|---|---|
| Magic link or OTP | `magic_link.html` | `Your Beezy sign-in code` |
| Confirm signup | `confirm_signup.html` | `Welcome to Beezy — your sign-in code` |

Paste each file into the template's **Source** view and set the subject.
New addresses get *Confirm signup* on their first sign-in; everyone after that
gets *Magic link or OTP*. Both show the code and contain no link, because the
app signs in by code (docs/DECISIONS.md#0021).

Set the SMTP **sender name** to `Beezy` so the inbox shows Beezy, not Supabase.
The logo loads from the live Pages site, so it must stay at
`/beezy_app/brand/logo-horizontal-ink.png`.
