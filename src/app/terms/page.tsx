import { Contact, LegalPage, Part } from "@/components/legal";

export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>These terms cover using the Nakuru Walk app. By signing in you agree to them.</p>

      <Part title="What the app is for">
        <p>Seeing the club’s walks, saying you’re coming, checking in on the day, keeping your own record, sharing with the club in the Community feed, messaging other members, and selling to other members on the Wednesday market. The app is free.</p>
      </Part>

      <Part title="Walking safely">
        <p>You take part in walks at your own risk and are responsible for your own health. Walk at a pace that suits you, bring water, and follow the admins and the person at the back. If you leave a walk early, tell someone in the group.</p>
        <p>Distances and routes are planned with care, but can change on the day.</p>
      </Part>

      <Part title="Being a good member">
        <p>Use your real name, be kind, and don’t use the app to bother or harm anyone. Only post photos you’re allowed to share, and ask before posting a clear photo of someone. Admins may remove posts, replies, market items or members that break this. A removed member can’t rejoin with the join link unless an admin lets them back in.</p>
        <p>Private messages follow the same rules. If someone bothers you, block them from the menu in your chat, and tell an admin.</p>
      </Part>

      <Part title="The market">
        <p>Posting on the market is free. Only offer things that are yours to sell and legal to sell, describe them honestly, and mark them sold when they’re gone.</p>
        <p>Buyers and sellers deal with each other directly. The club doesn’t take payments, check items or stand behind any sale, and isn’t responsible if one goes wrong. Meet somewhere public and see the item before you pay.</p>
      </Part>

      <Part title="Your account">
        <p>You can delete your account at any time from the app. We may change or stop the app; if we do, we’ll say so in the WhatsApp groups first.</p>
      </Part>

      <Part title="Contact">
        <p>Questions: <Contact />.</p>
      </Part>
    </LegalPage>
  );
}
