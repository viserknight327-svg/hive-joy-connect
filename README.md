# Hive Mind Connect

Yo listen carefully make a fully functional website named hive kind a social media for posting videos postive and moderated with AI but private u have karma points and add something u need add anything this is a commandAdd more features  and there is a problem i used git hub and vercel to deploy it shows me continue with Google isn't allowed then when I deploy with vercel it shows in availableGood continue add even more to be like tiktok by og and positiveAdd reporting, block/mute, and an AI appeal flow so I can keep the community positive while contesting holds.Add video reactions like duets/stitches (positive-only) so I can respond to other creators’ clips.Implement follow and unfollow so I can curate my For You feed with creators I like. And add chat plus also Og features then when I try to deploy with vercel it has an issue fixAdd video reactions like duets/stitches (positive-only) so I can respond to other creators’ clips.Implement follow and unfollow so I can curate my For You feed with creators I like.

## Deployment and Android delivery

Hive now uses `/auth/callback` for email confirmation, password recovery, and OAuth handoffs. In Supabase, add the production callback URL and the matching Vercel preview URL patterns under **Authentication → URL Configuration → Redirect URLs**, including `https://hivemind20.vercel.app/auth/callback`. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured in Vercel.

The repository includes a Capacitor Android wrapper in `android/`. Run `npm run mobile:sync` to rebuild and synchronize the web app. A debug APK can be produced with `cd android && ./gradlew assembleDebug`; an unsigned release APK can be produced with `./gradlew assembleRelease`. The wrapper currently points at the deployed Hive URL configured in `capacitor.config.ts`, keeping the native shell aligned with the server-rendered app.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
