"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  BookOpen,
  Users,
  BarChart3,
  Bell,
  ArrowLeftRight,
  Command,
  ArrowRight,
  ScanLine,
  ShieldCheck,
  Boxes,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { HeroCanvas } from "@/components/three/hero-canvas";
import { APP_NAME } from "@/lib/navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const FEATURES = [
  {
    icon: BookOpen,
    title: "Living catalog",
    body: "ISBN-aware records, multi-copy tracking, covers, categories, and rich metadata — all searchable in milliseconds.",
  },
  {
    icon: ArrowLeftRight,
    title: "Effortless circulation",
    body: "Issue, return, and renew with automatic due dates, fine calculation, and a reservation queue that promotes itself.",
  },
  {
    icon: Users,
    title: "Member intelligence",
    body: "Profiles, borrowing history, activity timelines, and membership analytics that surface your most engaged readers.",
  },
  {
    icon: BarChart3,
    title: "Analytics that breathe",
    body: "Borrowing trends, popular titles, fine collection, and growth — rendered in real time with elegant charts.",
  },
  {
    icon: ScanLine,
    title: "Scan & generate",
    body: "Barcode and QR generation for every copy, ISBN validation, and bulk import to onboard a whole shelf at once.",
  },
  {
    icon: Bell,
    title: "Thoughtful notifications",
    body: "Branded Brevo emails for welcomes, due reminders, overdue notices, and reservation pickups.",
  },
];

const STATS = [
  { value: "17", label: "Domain models" },
  { value: "RBAC", label: "Role-based access" },
  { value: "<50ms", label: "Search latency" },
  { value: "100%", label: "Type-safe" },
];

export function LandingPage() {
  return (
    <div className="bg-grain relative min-h-dvh overflow-x-hidden">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <nav className="glass-strong flex w-full max-w-5xl items-center justify-between rounded-full px-4 py-2.5 shadow-lg">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <Sparkles className="size-4" />
            </span>
            <span className="font-serif text-lg">{APP_NAME}</span>
          </Link>
          <div className="text-muted-foreground hidden items-center gap-7 text-sm md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#stats" className="hover:text-foreground transition-colors">
              Platform
            </a>
            <a href="#cta" className="hover:text-foreground transition-colors">
              Get started
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full">
              <Link href="/register">
                Get started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-dvh items-center justify-center px-4">
        <div className="aurora absolute inset-0 -z-10" />
        <HeroCanvas />
        <div className="relative z-10 mx-auto max-w-3xl py-32 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="glass text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
          >
            <span className="bg-success size-1.5 rounded-full" />
            Production-ready · Next.js 15 · Drizzle · Auth.js
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            initial="hidden"
            animate="show"
            className="font-serif text-5xl leading-[1.05] tracking-tight sm:text-7xl"
          >
            The library
            <br />
            <span className="text-gradient-gold">reimagined.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg text-balance"
          >
            {APP_NAME} is a world-class management system for modern libraries —
            circulation, catalog, members, fines, and analytics, wrapped in an
            interface people actually love to use.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button asChild size="lg" className="ring-glow rounded-full">
              <Link href="/register">
                Launch the dashboard <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/login">Live demo</Link>
            </Button>
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={4}
            initial="hidden"
            animate="show"
            className="text-muted-foreground mt-5 text-xs"
          >
            Try it instantly · <span className="font-mono">admin@lumina.dev</span> ·{" "}
            <span className="font-mono">Password123</span>
          </motion.p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-primary text-sm font-medium tracking-wide uppercase">
            Everything, beautifully
          </p>
          <h2 className="mt-2 font-serif text-4xl tracking-tight">
            One system for the whole library
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="glass group relative overflow-hidden rounded-2xl p-6"
            >
              <div className="bg-primary/10 absolute -top-10 -right-10 size-32 rounded-full blur-2xl transition-opacity group-hover:opacity-80" />
              <span className="bg-muted text-foreground/80 flex size-11 items-center justify-center rounded-xl">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-serif text-xl">{f.title}</h3>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                {f.body}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative mx-auto max-w-6xl px-4 py-16">
        <div className="glass-strong grid grid-cols-2 gap-6 rounded-3xl p-10 md:grid-cols-4">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-gradient-gold font-serif text-4xl tracking-tight">
                {s.value}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Highlight band */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-4xl tracking-tight">
              Built like a product, not a project.
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Clean feature-based architecture, end-to-end type safety, RBAC with
              audit logging, and a design system that scales. Every interaction is
              considered — from the command menu to the floating dock.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                { icon: ShieldCheck, t: "RBAC, audit logs & permission-based authorization" },
                { icon: Command, t: "⌘K command palette and full keyboard navigation" },
                { icon: Boxes, t: "Bulk import/export, QR & barcode generation" },
              ].map((row) => (
                <li key={row.t} className="flex items-center gap-3">
                  <span className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
                    <row.icon className="size-4" />
                  </span>
                  {row.t}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass-strong relative aspect-[4/3] overflow-hidden rounded-3xl p-1">
            <div className="from-chart-1/20 via-chart-2/10 to-chart-3/20 flex h-full w-full items-center justify-center rounded-[1.4rem] bg-gradient-to-br">
              <Sparkles className="text-primary/60 size-20" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="mx-auto max-w-5xl px-4 py-24">
        <div className="aurora relative overflow-hidden rounded-3xl px-8 py-16 text-center">
          <div className="glass-strong absolute inset-0 -z-10" />
          <h2 className="font-serif text-4xl tracking-tight sm:text-5xl">
            Bring your library to life.
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg">
            Spin up the full dashboard in minutes. No credit card, no friction —
            just a beautiful system ready for your shelves.
          </p>
          <Button asChild size="lg" className="ring-glow mt-8 rounded-full">
            <Link href="/register">
              Create your account <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary size-4" />
            <span className="font-serif text-base">{APP_NAME}</span>
            <span>— Library Management System</span>
          </div>
          <p>© {new Date().getFullYear()} {APP_NAME}. Built with Next.js & Drizzle.</p>
        </div>
      </footer>
    </div>
  );
}
