import React from "react";

export default function Terms() {
  return (
    <main style={styles.page}>
      <article style={styles.card}>
        <a href="/" style={styles.back}>← Back to Goal2Done</a>
        <h1 style={styles.title}>Goal2Done Terms of Service</h1>
        <p style={styles.updated}>Last updated: October 1, 2026</p>

        <p>By using Goal2Done, you agree to these Terms of Service.</p>

        <Section title="Use of the Service">
          <p>Goal2Done provides tools for planning, organizing, and automating tasks. You are responsible for the actions you request the application to perform.</p>
        </Section>

        <Section title="Connected Accounts">
          <p>If you connect third-party services such as Google, you authorize Goal2Done to access those services according to the permissions you grant.</p>
          <p>You may disconnect these services at any time.</p>
        </Section>

        <Section title="User Responsibility">
          <p>You are responsible for reviewing actions that require your approval before authorizing them.</p>
          <p>You should not use Goal2Done for unlawful activities or to access accounts or information that you do not have permission to access.</p>
        </Section>

        <Section title="Third-Party Services">
          <p>Goal2Done may depend on third-party services, including Google, Supabase, Vercel, and AI providers. Their respective terms and policies may also apply.</p>
        </Section>

        <Section title="Availability">
          <p>Goal2Done is provided on an ongoing development basis. Features may change, be unavailable, or be modified without notice.</p>
        </Section>

        <Section title="Contact">
          <p>For questions about these Terms, contact:</p>
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
