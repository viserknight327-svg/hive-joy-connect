# Hive Mind Connect

Yo listen carefully make a fully functional website named hive kind a social media for posting videos postive and moderated with AI but private u have karma points and add something u need add anything this is a commandAdd more features and there is a problem i used git hub and vercel to deploy it shows me continue with Google isn't allowed then when I deploy with vercel it shows in availableGood continue add even more to be like tiktok by og and positiveAdd reporting, block/mute, and an AI appeal flow so I can keep the community positive while contesting holds.Add video reactions like duets/stitches (positive-only) so I can respond to other creators’ clips.Implement follow and unfollow so I can curate my For You feed with creators I like. And add chat plus also Og features then when I try to deploy with vercel it has an issue fixAdd video reactions like duets/stitches (positive-only) so I can respond to other creators’ clips.Implement follow and unfollow so I can curate my For You feed with creators I like.

## Deployment and Android delivery

Hive now uses `/auth/callback` for email confirmation, password recovery, and OAuth handoffs. In Supabase, add the production callback URL and the matching Vercel preview URL patterns under **Authentication → URL Configuration → Redirect URLs**, including `https://hivemind20.vercel.app/auth/callback`. Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` configured in Vercel.

The repository includes Capacitor wrappers for Android and iOS. Run `npm run mobile:sync` or `npm run mobile:sync:ios` to rebuild and synchronize the web app. A debug APK can be produced with `cd android && ./gradlew assembleDebug`; an unsigned release APK can be produced with `./gradlew assembleRelease`. The iOS project is in `ios/` and the cloud workflow is `codemagic.yaml`. Connect the repository to Codemagic, add your Apple Developer signing credentials there, then run the `hive-ios` workflow or push a tag such as `ios-v1.0.0`; it builds a signed IPA suitable for TestFlight. This avoids needing a local Mac while still using Apple’s Xcode toolchain in the cloud. The wrappers point at the deployed Hive URL configured in `capacitor.config.ts`, keeping the native shells aligned with the server-rendered app.

### iPhone without Apple Developer access

You can use Hive on iPhone immediately without an Apple Developer account. Open `https://hivemind20.vercel.app` in Safari, sign in, tap the **Share** button, choose **Add to Home Screen**, rename it to **Hive**, and tap **Add**. Hive now includes iOS PWA metadata, an Apple touch icon, and a standalone app-style launch path.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
