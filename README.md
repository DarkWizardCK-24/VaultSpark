<div align="center">

<img src="public/logo.png" width="112" alt="VaultSpark logo" />

# VaultSpark

**A zero-knowledge password manager with a live strength analyser, a password generator and an encrypted vault.**

Next.js · React · Tailwind CSS · Firebase Auth + Firestore

[![CI](https://github.com/DarkWizardCK-24/VaultSpark/actions/workflows/ci.yml/badge.svg)](https://github.com/DarkWizardCK-24/VaultSpark/actions/workflows/ci.yml) [![Live demo](https://img.shields.io/badge/Live-demo-2ea44f?logo=vercel&logoColor=white)](https://vault-spark.vercel.app) ![Next.js](https://img.shields.io/badge/Next.js-000000?logo=nextdotjs&logoColor=white) ![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

</div>

VaultSpark combines two earlier projects:

| Origin | What it contributed |
| --- | --- |
| [SecureSpark](https://github.com/DarkWizardCK-24/SecureSpark) | Real-time entropy / crack-time analysis and the requirements checklist |
| [PassVault](https://github.com/DarkWizardCK-24/PassVault) | Credential vault for social accounts and logins (create, read, update, delete) |

Everything you save is encrypted on your device before it is stored. The server only sees ciphertext.

## Screenshots

### Mobile

| Sign in | Register | Create vault | Recovery key |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/mobile-login.png" width="180" /> | <img src="docs/screenshots/mobile-register.png" width="180" /> | <img src="docs/screenshots/mobile-setup.png" width="180" /> | <img src="docs/screenshots/mobile-recovery-key.png" width="180" /> |

| Vault | Live 2FA codes | Add item | Password history |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/mobile-vault.png" width="180" /> | <img src="docs/screenshots/mobile-vault-2fa.png" width="180" /> | <img src="docs/screenshots/mobile-add-item.png" width="180" /> | <img src="docs/screenshots/mobile-history.png" width="180" /> |

| Security audit | Shared vaults | Settings | Unlock |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/mobile-audit.png" width="180" /> | <img src="docs/screenshots/mobile-shared.png" width="180" /> | <img src="docs/screenshots/mobile-settings.png" width="180" /> | <img src="docs/screenshots/mobile-unlock.png" width="180" /> |

| Home | Free tools | Recovery reset | Empty vault |
| :---: | :---: | :---: | :---: |
| <img src="docs/screenshots/mobile-home.png" width="180" /> | <img src="docs/screenshots/mobile-tools.png" width="180" /> | <img src="docs/screenshots/mobile-recovery-reset.png" width="180" /> | <img src="docs/screenshots/mobile-vault-empty.png" width="180" /> |

### Desktop

| | |
| :---: | :---: |
| <img src="docs/screenshots/desktop-home.png" width="420" /> | <img src="docs/screenshots/desktop-vault.png" width="420" /> |
| Home | Vault |
| <img src="docs/screenshots/desktop-login.png" width="420" /> | <img src="docs/screenshots/desktop-register.png" width="420" /> |
| Sign in | Register |
| <img src="docs/screenshots/desktop-add-item.png" width="420" /> | <img src="docs/screenshots/desktop-audit.png" width="420" /> |
| Add item | Security audit |
| <img src="docs/screenshots/desktop-shared.png" width="420" /> | <img src="docs/screenshots/desktop-settings.png" width="420" /> |
| Shared vaults | Settings |
| <img src="docs/screenshots/desktop-tools.png" width="420" /> | |
| Free tools | |

## Features

**Your vault**
- **Social accounts and logins.** One-tap presets for Instagram, Facebook, X, LinkedIn, WhatsApp, GitHub, Netflix, Google and more, shown with brand-coloured tiles.
- **Secure notes and payment cards** stored alongside passwords, with masked card numbers.
- **Categories, favourites and instant search.**
- **Password history.** See and restore the last 10 passwords of every login.
- **Live 2FA codes.** Works like an authenticator app, with a countdown ring.

**Safety**
- **Zero-knowledge encryption.** Your master password never leaves your device.
- **Recovery key.** A spare key that gets you back in if you forget your master password.
- **Change master password** any time without touching your saved items.
- **Passkey and biometric unlock.** Fingerprint, Face ID or Windows Hello on supported devices.
- **Breach check.** Find out whether a password has leaked, without ever sending the password.
- **Security audit.** A vault health score that flags weak, reused, old and breached passwords.
- **Auto-lock** after 5 idle minutes, and the **clipboard clears** 30 seconds after copying.
- **Strong password rules.** A master password must be 12+ characters and rated “Strong”, and sign-up passwords must be 12+ characters.
- **Web hardening.** Security headers and a Content Security Policy limit which servers the app can talk to, and only `http(s)` links are opened.
- **Verified sharing.** Shared vaults only work with verified email addresses, and a fingerprint lets you confirm you’re inviting the right person.

**Together and portable**
- **Shared vaults.** Share logins with family or a team, each vault with its own private key.
- **Encrypted backup** and one-click **import** from Chrome / Edge, Bitwarden and 1Password.
- **Installable app (PWA)** that opens full-screen and works offline.

**Free tools (no account needed)**
- **Strength checker.** Entropy, crack-time estimate, common-password, sequence and repetition detection.
- **Password generator.** Cryptographically random, with every chosen character type guaranteed.

**Design**
- Mobile-first: bottom tab bar, floating add button and bottom-sheet forms on phones, sidebar layout on desktop.
- Teal-to-lime-to-amber gradient theme, animations and a shield-and-keyhole logo.

---

Built by DarkWizardCK. Based on SecureSpark and PassVault.
