# Stageboard

A DJ booth floor board for live stage rotation. One DJ, one tablet, all night: who is working, who is free, who is in a private dance, which stages are open, and who is next in the rotation.

No backend, no login, no tracking. Everything lives in the browser (localStorage) and keeps working after a refresh, a tab close, or the tablet going to sleep. After the first load it runs offline as an installed PWA.

This is a booth tool, not a customer-facing app. Stage names and performer nicknames only — no photos.

## Run locally

Install dependencies, then start the Vite dev server. Scripts live in package.json:

- install
- dev (Vite, host 0.0.0.0)
- build (TypeScript check + production bundle into dist/)
- preview (serve dist/)

Typical flow: install, then the dev script. Open the URL Vite prints (usually port 5173). Use a tablet in landscape if you can; it also works in portrait and on a phone.

## Production build

Run the build script. Static files land in dist/. Preview with the preview script.

## Install on a tablet (PWA)

1. Serve the production build over HTTPS (or localhost).
2. Open Stageboard in Safari (iPad) or Chrome (Android).
3. iPad / iPhone: Share, then Add to Home Screen. It opens standalone, full screen.
4. Android: Chrome menu, then Install app / Add to Home screen.
5. After that first visit, the service worker keeps the board usable with no network.

Theme color is near-black. Icons are gold-on-black. Display mode is standalone.

## DJ workflows

Tonight's roster. House talent persists night after night (add, rename, archive). Clock people in for this night; the main board only shows who is HERE. Guests/fill-ins can be added for tonight only. A night can run past midnight — it ends only when you hit Reset tonight in Settings (house roster is kept).

Status. Everyone who is clocked in is exactly one of: Available, In a dance (with an elapsed timer), On stage, or Break. Status changes are one or two taps on the floor list or stage cards. Starting a dance pulls that person out of Who's Next until they are available again.

Stages. Default three stages for BX Club, in ladder order: girls start on Stage 3, move to Stage 2, then Main. Set length is in Settings (default 4 min). When the countdown hits zero she moves up; after Main she goes to the bottom of Who's Next and everyone behind her shifts up, with the next girl walking on Stage 3. You can still tap to move her early. One person per stage; nobody can be on two stages or on stage and in a dance at once.

Who's Next. Ordered rotation. Add, move up/down, skip, remove. Next girl always enters on Stage 3. After a Main set they drop to the bottom of this list and cycle again.

A sample house roster (Jade, Raven, Skye, Nova, Diamond, Lola) is seeded so you can tap around immediately. Those names are fake demo data, not staff — clear them in Settings.

## Layout

Tablet landscape: Stages (the show), Who's Next (the rotation), Floor (available / in a dance / break). Portrait stacks the same zones, stages first and large.
