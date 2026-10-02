import React from "react";

export default function Privacy() {
  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <a href="/" style={styles.back}>← Back to Goal2Done</a>
        <h1 style={styles.title}>Goal2Done Privacy Policy</h1>
        <p style={styles.updated}>Last updated: October 1, 2026</p>

        <p>Goal2Done is an application that helps users plan and execute personal tasks using connected services and automation.</p>

        <Section title="Information We Collect">
          <p>When you sign in with Google, we may receive basic account information such as your Google account ID, name, and email address.</p>
          <p>If you choose to connect Google services, Goal2Done may request access to Google Calendar, Gmail, Google Drive, Google Docs, and Google Sheets. We only use permissions necessary to provide features you request.</p>
        </Section>

        <Section title="How We Use Information">
          <ul>
            <li>Authenticate your account.</li>
            <li>Provide Goal2Done features.</li>
            <li>Execute tasks that you request.</li>
            <li>Access connected Google services when you authorize that access.</li>
            <li>Maintain account and application security.</li>
          </ul>
        </Section>

        <Section title="Google Data">
          <p>Goal2Done uses Google APIs to provide features requested by users. Google user data is used only to provide the functionality described in the application.</p>
          <p>We do not sell your personal information or Google user data.</p>
        </Section>

        <Section title="Data Security">
          <p>We take reasonable measures to protect account information and authorization credentials from unauthorized access.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>Goal2Done may use third-party services such as Google APIs, Supabase, Vercel, and AI services to provide application functionality.</p>
        </Section>

        <Section title="Data Retention">
          <p>We retain account and application data only as necessary to provide the service or for legitimate operational purposes.</p>
          <p>You may disconnect your Google account or stop using Goal2Done at any time.</p>
        </Section>

        <Section title="Contact">
          <p>If you have questions about this Privacy Policy, contact:</p>
          <a href="mailto:mounimounikav3417@gmail.com" style={styles.link}>mounimounikav3417@gmail.com</a>
        </Section>
      </article>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>{title}</h2>
      {children}
    </section>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f7fb", padding: "48px 20px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: "#1f2937" },
  card: { maxWidth: "850px", margin: "0 auto", background: "#fff", borderRadius: "20px", padding: "42px", boxShadow: "0 10px 35px rgba(0,0,0,0.08)", lineHeight: 1.7 },
  back: { color: "#4f46e5", textDecoration: "none", fontWeight: 600 },
  title: { fontSize: "36px", marginBottom: "8px" },
  updated: { color: "#6b7280", marginBottom: "32px" },
  section: { marginTop: "30px" },
  heading: { fontSize: "22px", marginBottom: "10px", color: "#111827" },
  link: { color: "#4f46e5" }
};

