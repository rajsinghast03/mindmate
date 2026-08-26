import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section, List, Callout } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What Mindmate collects, what it never collects, who else processes your data, and how to delete it.',
};

const UPDATED = '26 August 2026';
const CONTACT = 'rajsinghast03@gmail.com';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated={UPDATED}
      intro={
        <p>
          Mindmate matches people through what they write, which means the writing matters and so
          does what happens to it. This page describes what is actually collected and where it
          actually goes — including the parts that are less comfortable to say.
        </p>
      }
    >
      <Section id="who" heading="Who this is">
        <p>
          Mindmate is operated by <strong>Raj Singh</strong>, an individual based in India
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). For anything in this policy, write to{' '}
          <a href={`mailto:${CONTACT}`} className="text-accent-700 underline underline-offset-2">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <Section id="collect" heading="What we collect">
        <List
          items={[
            <>
              <strong>Your email address.</strong> Used to sign you in and to send account email.
              It is never shown to another user, at any stage.
            </>,
            <>
              <strong>Your password</strong>, if you sign up with one. It is handled entirely by
              our authentication provider and never stored or seen by Mindmate&rsquo;s own code. If
              you sign in with Google we receive your email address and name and nothing else — no
              additional permissions are requested.
            </>,
            <>
              <strong>Your display name, age, and a city.</strong> The city is chosen from a
              dropdown and stored as a label like &ldquo;Bengaluru, Karnataka, India&rdquo;,
              together with the matching timezone.
            </>,
            <>
              <strong>Your Curiosity Profile</strong> — the ~100 words you paste in. This is the
              heart of the service and is covered separately below.
            </>,
            <>
              <strong>Messages</strong> you send in conversations, and timestamps for when you last
              opened a conversation or the notification panel.
            </>,
            <>
              <strong>Reports and blocks</strong> you file, including any free-text explanation you
              write.
            </>,
          ]}
        />
      </Section>

      <Section id="never" heading="What we never collect">
        <p>These are absences in the software, not promises of restraint:</p>
        <List
          items={[
            <>
              <strong>No photographs or images.</strong> There is no upload of any kind, anywhere in
              the product. Your avatar is the first letter of your name.
            </>,
            <>
              <strong>No precise location.</strong> Your browser is never asked for your location.
              The city you pick comes from a list served by us; no mapping or location service is
              contacted.
            </>,
            <>
              <strong>No phone numbers or social handles.</strong> We do not ask, and the profile
              checker actively rejects email addresses, links, and phone numbers pasted into your
              Curiosity Profile.
            </>,
            <>
              <strong>No IP addresses, device fingerprints, or session recordings</strong> are
              logged by Mindmate&rsquo;s code. There is no advertising pixel, no Google Analytics,
              no error-tracking SDK.
            </>,
            <>
              <strong>No marketing email, ever.</strong> The only messages we send are the signup
              confirmation, a resend of it if you ask, and a password reset.
            </>,
          ]}
        />
      </Section>

      <Section id="ai" heading="How your writing is used">
        <p>
          Two things happen to your Curiosity Profile text, and both involve sending it outside our
          own systems.
        </p>
        <p>
          <strong>It is turned into a numeric vector</strong> so we can find people whose interests
          sit near yours. The text is sent to Google&rsquo;s Gemini API for this, and what comes
          back is a list of numbers we store. This happens when you save your profile and again
          only if you change the text.
        </p>
        <p>
          <strong>It is used to write the explanation of why two people match.</strong> To do that,
          your text and the other person&rsquo;s text are sent together, in one request, to the same
          API. The result is the short summary, shared curiosity, and opening question you see on a
          suggestion card.
        </p>
        <Callout>
          <p>
            Worth being direct about: that second step happens when a suggestion is{' '}
            <em>created</em>, which is before either of you has agreed to connect. So your writing
            may be sent in a request alongside the writing of someone you never meet. The request
            contains only the two blocks of prose — no names, ages, cities, email addresses, or
            account identifiers are included.
          </p>
        </Callout>
        <p>
          Your text is never used to train anyone&rsquo;s model by us, and we do not sell or share
          it for advertising. What Google does with API requests is governed by their own terms.
        </p>
      </Section>

      <Section id="visibility" heading="What other people can see">
        <p>
          Before you connect, someone who is suggested to you (or you to them) sees your display
          name, age, city, and the AI-written resonance text. <strong>They do not see your raw
          Curiosity Profile.</strong> That text is only revealed once you have both agreed to
          connect.
        </p>
        <p>
          Your email address is never visible to another user. Neither is the numeric match score —
          it exists in the database but is never shown to anyone.
        </p>
        <p>
          While you have a conversation open, the other person in that conversation can see that
          you are currently in it, and whether you are typing. This is limited to that one thread
          and stops the moment you leave it. There is no global &ldquo;online&rdquo; indicator and
          no &ldquo;last seen&rdquo; timestamp anywhere in the product.
        </p>
      </Section>

      <Section id="processors" heading="Who else handles your data">
        <p>Mindmate is built on a small number of services, each of which processes some of it:</p>
        <List
          items={[
            <>
              <strong>Supabase</strong> — the database and the authentication system. Your profile,
              messages, and account live here.
            </>,
            <>
              <strong>Google (Gemini API)</strong> — receives Curiosity Profile text as described
              above. Nothing else is sent.
            </>,
            <>
              <strong>Resend</strong> — delivers the three account emails. It is configured as the
              mail relay for our authentication provider; Mindmate&rsquo;s own code never contacts
              it.
            </>,
            <>
              <strong>Vercel</strong> — hosts the site and provides page-view counts. The analytics
              are cookieless and do not track you between websites. Before any measurement leaves
              your browser, conversation identifiers are replaced with a generic placeholder and the
              entire query string is discarded. As with any host, Vercel&rsquo;s servers see the
              network request needed to deliver the page.
            </>,
          ]}
        />
      </Section>

      <Section id="cookies" heading="Cookies and browser storage">
        <p>
          There is no cookie banner because there is nothing to consent to — we set no advertising
          or analytics cookies. What exists is:
        </p>
        <List
          items={[
            <>A session cookie that keeps you signed in, set by our authentication provider.</>,
            <>
              A short-lived cookie lasting one hour that remembers which page to return you to after
              signing in.
            </>,
            <>
              Your draft profile, kept in your browser&rsquo;s local storage while you are
              onboarding so that it survives the trip to your email and back. It is cleared when you
              save your profile, sign out, or delete your data.
            </>,
          ]}
        />
      </Section>

      <Section id="moderation" heading="Reports, blocks, and moderation">
        <p>
          When you report someone we record who filed it, who it is about, the category, anything
          you write, and which conversation it came from. <strong>The person you report is never
          told who reported them</strong> and can never read the report.
        </p>
        <Callout>
          <p>
            So that this is not a surprise: when a conversation is reported, a moderator can read
            the messages in <em>that</em> conversation in order to act on it. Access is limited to
            an explicit list of addresses and is tied to the specific report — it is not a general
            ability to browse anyone&rsquo;s messages. But it does mean private messages in a
            reported thread can be read by a person.
          </p>
        </Callout>
        <p>
          Blocking records only who blocked whom. No reason is stored, and the person you block is
          not notified.
        </p>
      </Section>

      <Section id="deletion" heading="Keeping and deleting your data">
        <p>
          You can delete everything from your{' '}
          <Link href="/profile" className="text-accent-700 underline underline-offset-2">
            profile page
          </Link>
          . It is immediate and cannot be undone. It removes your profile, your account itself, your
          matches and the text written about them, your conversations, and{' '}
          <strong>the messages you sent — including ones already delivered to the other
          person</strong>. Blocks you created and reports filed about you go too.
        </p>
        <Callout>
          <p>
            One consequence we would rather state than hide: because reports about you are deleted
            along with your account, someone could clear a complaint against them by deleting their
            account and signing up again. We think making deletion genuinely complete is the right
            trade, but it is a real gap and you should know it exists.
          </p>
        </Callout>
        <p>
          A profile draft saved during signup but never completed stops being usable after 24 hours
          and is deleted automatically shortly afterwards. Otherwise we keep your data for as long
          as your account exists.
        </p>
      </Section>

      <Section id="rights" heading="Your rights">
        <p>
          Under India&rsquo;s Digital Personal Data Protection Act, 2023, you can ask what personal
          data we hold about you, ask us to correct it, and ask us to erase it. Most of this you can
          do yourself: your profile page shows everything on your account, lets you edit it, and
          lets you delete it outright. For anything else, write to{' '}
          <a href={`mailto:${CONTACT}`} className="text-accent-700 underline underline-offset-2">
            {CONTACT}
          </a>{' '}
          and we will respond as quickly as we reasonably can.
        </p>
      </Section>

      <Section id="children" heading="Age">
        <p>
          Mindmate is for adults aged 18 and over. We do not knowingly collect data from anyone
          younger. Age is self-declared at signup — we do not verify identity documents — so if you
          believe someone under 18 is using the service, please tell us and we will remove the
          account.
        </p>
      </Section>

      <Section id="changes" heading="Changes to this policy">
        <p>
          If this policy changes in a way that materially affects how your data is handled, the date
          at the top will change and, where the change is significant, we will tell you in the
          product. Continuing to use Mindmate after a change means you accept it.
        </p>
      </Section>

      <Section id="contact" heading="Contact">
        <p>
          Questions, requests, or corrections:{' '}
          <a href={`mailto:${CONTACT}`} className="text-accent-700 underline underline-offset-2">
            {CONTACT}
          </a>
          . See also our{' '}
          <Link href="/terms" className="text-accent-700 underline underline-offset-2">
            Terms of Service
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
