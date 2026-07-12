"use client";

import styles from "../page.module.css";
import Icon from "./Icon";
import type { IconName } from "./types";
import Link from "next/link";

const workflowSteps = [
  { title: "Plan the sprint", copy: "Shape boards, owners, and due dates before work spreads across chats." },
  { title: "Track the signals", copy: "Spot workload, status drift, and upcoming deadlines from one clear overview." },
  { title: "Share the readout", copy: "Turn workspace activity into a crisp weekly report for your team." },
];

const featureCards: { icon: IconName; title: string; copy: string }[] = [
  { icon: "board", title: "Board-first execution", copy: "Tasks, columns, and sprints stay close to the work instead of hiding in reports." },
  { icon: "activity", title: "Operational pulse", copy: "The overview highlights progress, blockers, ownership, and recent activity in one glance." },
  { icon: "chat", title: "Context stays attached", copy: "Comments, wiki notes, and chat moments sit beside the work they explain." },
  { icon: "sparkles", title: "AI weekly summaries", copy: "Generate a team-ready update without rebuilding the week from scattered tabs." },
];

export default function LandingPage() {
  return <main className={styles.landingPage}>
    <nav className={styles.landingNav} aria-label="Primary">
      <a href="#top" className={styles.landingBrand} aria-label="SprintForge home">
        <span className={styles.logo}>SF</span>
        <span><b>SprintForge</b><small>SaaS console</small></span>
      </a>
      <div className={styles.landingLinks}>
        <a href="#features">Features</a>
        <a href="#workflow">Workflow</a>
        <a href="#pricing">Pricing</a>
      </div>
      <Link className={styles.navCta} href="/login">
        Login
      </Link>
    </nav>

    <section id="top" className={styles.landingHero}>
      <div className={styles.heroCopy}>
        <p className={styles.landingEyebrow}>Workspace clarity for product teams</p>
        <h1>Sprints without status chasing.</h1>
        <p className={styles.heroText}>Plan sprints, surface risk, and keep teams moving from one calm workspace.</p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryCta} href="/login">Login</Link>
          <a className={styles.secondaryCta} href="#workflow">See workflow</a>
        </div>
      </div>

      <div className={styles.heroVisual} aria-label="SprintForge product preview">
        <div className={styles.previewShell}>
          <div className={styles.previewTopbar}>
            <span>FormatWeaver HQ</span>
            <button type="button">Report</button>
          </div>
          <div className={styles.previewGrid}>
            <article className={styles.previewMetric}>
              <Icon name="clipboard" size={21} />
              <span>Active projects</span>
              <strong>2</strong>
            </article>
            <article className={styles.previewMetric}>
              <Icon name="check" size={21} />
              <span>Tasks delivered</span>
              <strong>2 / 6</strong>
            </article>
            <article className={styles.previewChart}>
              <span>Workload</span>
              <div><i style={{ height: "72%" }} /><i style={{ height: "48%" }} /><i style={{ height: "58%" }} /><i style={{ height: "34%" }} /></div>
            </article>
            <article className={styles.previewList}>
              <span>Approaching deadlines</span>
              <b>Finish dashboard integration</b>
              <b>Review sprint analytics</b>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section id="features" className={styles.featureSection}>
      <h2>Less status chasing. More shipped work.</h2>
      <div className={styles.featureGrid}>
        {featureCards.map((feature) => <article className={styles.featureCard} key={feature.title}>
          <span><Icon name={feature.icon} size={22} /></span>
          <h3>{feature.title}</h3>
          <p>{feature.copy}</p>
        </article>)}
      </div>
    </section>

    <section id="workflow" className={styles.workflowSection}>
      <div className={styles.workflowPanel}>
        <h2>A cleaner weekly operating rhythm.</h2>
        <div className={styles.workflowList}>
          {workflowSteps.map((step) => <article key={step.title}>
            <Icon name="check" size={18} />
            <div>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </div>
          </article>)}
        </div>
      </div>
      <aside className={styles.reportPanel}>
        <Icon name="sparkles" size={24} />
        <h3>Weekly report ready</h3>
        <p>Progress, deadlines, ownership, and activity are gathered into one shareable update.</p>
        <Link className={styles.primaryCta} href="/login">Login</Link>
      </aside>
    </section>

    <section id="pricing" className={styles.pricingSection}>
      <div>
        <h2>Start with the workspace you already use.</h2>
        <p>Keep the first release focused: dashboard, board, wiki, chat, and AI summary entry points.</p>
      </div>
      <Link className={styles.primaryCta} href="/login">Login</Link>
    </section>
  </main>;
}
