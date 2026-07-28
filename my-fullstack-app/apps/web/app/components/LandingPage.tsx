"use client";

import Link from "next/link";
import styles from "../page.module.css";
import Icon from "./Icon";
import type { IconName } from "./types";

const capabilities: {
  icon: IconName;
  index: string;
  title: string;
  copy: string;
  detail: string;
}[] = [
  {
    icon: "dashboard",
    index: "01",
    title: "Workspace overview",
    copy: "See delivery health, workload, deadlines, and recent activity without assembling another status report.",
    detail: "Metrics · workload · activity",
  },
  {
    icon: "board",
    index: "02",
    title: "Flexible Kanban",
    copy: "Create your own statuses, assign work, set priority and story points, then move tasks as delivery changes.",
    detail: "Custom columns · filters · drag & drop",
  },
  {
    icon: "clock",
    index: "03",
    title: "Sprint planning",
    copy: "Plan, start, and complete sprints while keeping their work connected to the project that owns it.",
    detail: "Plan · activate · complete",
  },
  {
    icon: "book",
    index: "04",
    title: "Project wiki",
    copy: "Write and preview Markdown documentation beside the project, so decisions stay easy to find.",
    detail: "Markdown · preview · project context",
  },
  {
    icon: "chat",
    index: "05",
    title: "Workspace chat",
    copy: "Use team channels and direct messages with file uploads, images, links, notices, and searchable history.",
    detail: "Channels · DMs · attachments",
  },
  {
    icon: "users",
    index: "06",
    title: "Access & signals",
    copy: "Manage workspace members and roles, then tune Kanban and chat notification preferences.",
    detail: "Roles · members · notifications",
  },
];

const operatingLoop = [
  {
    label: "Shape",
    title: "Create the workspace",
    copy: "Organize teams into workspaces and projects with clear ownership.",
  },
  {
    label: "Move",
    title: "Run the work",
    copy: "Connect Kanban tasks to sprints, owners, priority, and due dates.",
  },
  {
    label: "Align",
    title: "Keep context close",
    copy: "Document decisions in the wiki and continue the conversation in chat.",
  },
  {
    label: "Read",
    title: "See what changed",
    copy: "Use the dashboard and notifications to catch progress and risk early.",
  },
];

export default function LandingPage() {
  return (
    <main className={styles.landingPage}>
      <nav className={styles.landingNav} aria-label="Primary navigation">
        <a href="#top" className={styles.landingBrand} aria-label="Align home">
          <span className={`${styles.logo} ${styles.alignLogo}`}>A</span>
          <span>
            <b>Align</b>
            <small>Team workspace</small>
          </span>
        </a>
        <div className={styles.landingLinks}>
          <a href="#product">Product</a>
          <a href="#workflow">Workflow</a>
          <a href="#start">Get started</a>
        </div>
        <Link className={styles.navCta} href="/login">
          Sign in <Icon name="chevron" size={15} />
        </Link>
      </nav>

      <section id="top" className={styles.landingHero}>
        <div className={styles.heroCopy}>
          <p className={styles.landingEyebrow}>
            <span />
            One workspace. The whole delivery loop.
          </p>
          <h1>
            Move work forward.
            <em> Stay aligned.</em>
          </h1>
          <p className={styles.heroText}>
            Align brings projects, tasks, sprints, docs, and team conversations
            into one focused workspace—so context stays with the work.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href="/register">
              Create your workspace <Icon name="chevron" size={16} />
            </Link>
            <a className={styles.secondaryCta} href="#product">
              Explore what&apos;s inside
            </a>
          </div>
          <div className={styles.heroProof} aria-label="Included product areas">
            <span>Dashboard</span>
            <span>Kanban</span>
            <span>Sprints</span>
            <span>Wiki</span>
            <span>Chat</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Align product preview">
          <div className={styles.previewGlow} />
          <div className={styles.previewShell}>
            <div className={styles.previewRail}>
              <span className={`${styles.logo} ${styles.alignLogo}`}>A</span>
              {(["dashboard", "board", "clock", "book", "chat"] as IconName[]).map(
                (icon, index) => (
                  <i
                    key={icon}
                    className={index === 1 ? styles.previewRailActive : ""}
                  >
                    <Icon name={icon} size={16} />
                  </i>
                ),
              )}
            </div>
            <div className={styles.previewStage}>
              <div className={styles.previewTopbar}>
                <div>
                  <small>Product Studio</small>
                  <strong>Launch plan</strong>
                </div>
                <span>3 teammates online</span>
                <button type="button">
                  <Icon name="plus" size={13} /> Add task
                </button>
              </div>
              <div className={styles.previewBoard}>
                <PreviewColumn
                  title="To do"
                  color="blue"
                  cards={[
                    ["ALG-24", "Finalize onboarding flow", "M"],
                    ["ALG-29", "QA notification settings", "R"],
                  ]}
                />
                <PreviewColumn
                  title="In progress"
                  color="amber"
                  cards={[
                    ["ALG-18", "Build workspace dashboard", "J"],
                    ["ALG-21", "Connect sprint metrics", "K"],
                  ]}
                />
                <PreviewColumn
                  title="In review"
                  color="violet"
                  cards={[["ALG-16", "Update project wiki", "A"]]}
                />
              </div>
              <div className={styles.previewSignal}>
                <span><Icon name="activity" size={15} /> Delivery signal</span>
                <strong>6 tasks moving this week</strong>
                <i><b /></i>
              </div>
            </div>
          </div>
          <div className={styles.previewNote}>
            <span><Icon name="chat" size={15} /></span>
            <div>
              <small># launch-team</small>
              <b>Wiki decision linked to ALG-24</b>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className={styles.featureSection}>
        <header className={styles.landingSectionHeading}>
          <p>What&apos;s inside Align</p>
          <h2>Everything your team needs to go from plan to progress.</h2>
          <span>
            Six connected product areas, built around the same workspace and
            project context.
          </span>
        </header>
        <div className={styles.featureGrid}>
          {capabilities.map((capability) => (
            <article className={styles.featureCard} key={capability.title}>
              <div className={styles.featureCardTop}>
                <span><Icon name={capability.icon} size={20} /></span>
                <small>{capability.index}</small>
              </div>
              <h3>{capability.title}</h3>
              <p>{capability.copy}</p>
              <b>{capability.detail}</b>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className={styles.workflowSection}>
        <div className={styles.workflowIntro}>
          <p>One connected rhythm</p>
          <h2>Planning and communication shouldn&apos;t live in different worlds.</h2>
          <span>
            Align keeps the operating loop visible from the first project brief
            to the latest delivery signal.
          </span>
        </div>
        <div className={styles.workflowList}>
          {operatingLoop.map((step, index) => (
            <article key={step.label}>
              <div>
                <small>0{index + 1}</small>
                <b>{step.label}</b>
              </div>
              <span><Icon name="check" size={17} /></span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="start" className={styles.landingCta}>
        <div>
          <p>Ready when your team is</p>
          <h2>Give every project a shared place to move.</h2>
        </div>
        <div>
          <p>
            Create a workspace, invite the team, and keep delivery context
            connected from day one.
          </p>
          <Link className={styles.primaryCta} href="/register">
            Start with Align <Icon name="chevron" size={16} />
          </Link>
        </div>
      </section>

      <footer className={styles.landingFooter}>
        <a href="#top" className={styles.landingBrand}>
          <span className={`${styles.logo} ${styles.alignLogo}`}>A</span>
          <span><b>Align</b><small>Move together</small></span>
        </a>
        <p>Projects, progress, and people—working in the same direction.</p>
        <Link href="/login">Sign in</Link>
      </footer>
    </main>
  );
}

function PreviewColumn({
  title,
  color,
  cards,
}: {
  title: string;
  color: "blue" | "amber" | "violet";
  cards: string[][];
}) {
  return (
    <section className={styles.previewColumn}>
      <header>
        <i data-color={color} />
        <b>{title}</b>
        <span>{cards.length}</span>
      </header>
      {cards.map(([code, titleText, owner]) => (
        <article key={code}>
          <small>{code}</small>
          <strong>{titleText}</strong>
          <footer>
            <i>{owner}</i>
            <span>Medium</span>
          </footer>
        </article>
      ))}
    </section>
  );
}
