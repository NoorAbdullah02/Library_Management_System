/**
 * Lumina LMS — Drizzle ORM schema (PostgreSQL).
 *
 * Organised by domain:
 *   1. Enums
 *   2. Auth & RBAC      (users, accounts, sessions, verificationTokens,
 *                        authenticators, roles, permissions, rolePermissions)
 *   3. Catalog          (books, authors, publishers, categories, bookAuthors,
 *                        bookCopies)
 *   4. Circulation      (members, borrowings, returns, reservations, fines)
 *   5. Platform         (notifications, auditLogs, activityLogs, settings)
 *   6. Relations
 *   7. Inferred types
 */

import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  index,
  uuid,
} from "drizzle-orm/pg-core";

/* ────────────────────────────────────────────────────────────────────────
 * 1. Enums
 * ──────────────────────────────────────────────────────────────────────── */

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "librarian",
  "member",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "active",
  "suspended",
  "expired",
  "pending",
]);

export const copyStatusEnum = pgEnum("copy_status", [
  "available",
  "borrowed",
  "reserved",
  "lost",
  "damaged",
  "maintenance",
]);

export const borrowingStatusEnum = pgEnum("borrowing_status", [
  "active",
  "returned",
  "overdue",
  "lost",
]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending",
  "ready",
  "fulfilled",
  "cancelled",
  "expired",
]);

export const fineStatusEnum = pgEnum("fine_status", [
  "pending",
  "paid",
  "waived",
  "partial",
]);

export const fineReasonEnum = pgEnum("fine_reason", [
  "overdue",
  "damaged",
  "lost",
  "other",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "welcome",
  "password_reset",
  "email_verification",
  "due_reminder",
  "overdue",
  "reservation_ready",
  "membership_expiry",
  "general",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "in_app",
]);

/* ────────────────────────────────────────────────────────────────────────
 * 2. Auth & RBAC
 * ──────────────────────────────────────────────────────────────────────── */

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(), // e.g. "books:create"
    resource: text("resource").notNull(), // e.g. "books"
    action: text("action").notNull(), // e.g. "create"
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    resourceActionIdx: index("permissions_resource_action_idx").on(
      t.resource,
      t.action,
    ),
  }),
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
  }),
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: timestamp("email_verified", { withTimezone: true }),
    image: text("image"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").default("member").notNull(),
    roleId: uuid("role_id").references(() => roles.id, {
      onDelete: "set null",
    }),
    phone: text("phone"),
    isActive: boolean("is_active").default(true).notNull(),
    // MFA-ready: secret stored encrypted, disabled until enrolled.
    mfaEnabled: boolean("mfa_enabled").default(false).notNull(),
    mfaSecret: text("mfa_secret"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex("users_email_idx").on(t.email),
  }),
);

// Auth.js Drizzle adapter tables (OAuth-ready; credentials flow uses JWT).
export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
);

// WebAuthn authenticators — the MFA-ready foundation for passkeys/security keys.
export const authenticators = pgTable(
  "authenticators",
  {
    credentialID: text("credential_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: text("provider_account_id").notNull(),
    credentialPublicKey: text("credential_public_key").notNull(),
    counter: integer("counter").notNull(),
    credentialDeviceType: text("credential_device_type").notNull(),
    credentialBackedUp: boolean("credential_backed_up").notNull(),
    transports: text("transports"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.credentialID] }),
  }),
);

/* ────────────────────────────────────────────────────────────────────────
 * 3. Catalog
 * ──────────────────────────────────────────────────────────────────────── */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  nationality: text("nationality"),
  birthDate: date("birth_date"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const publishers = pgTable("publishers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website"),
  address: text("address"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const books = pgTable(
  "books",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    isbn: text("isbn").unique(),
    description: text("description"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    publisherId: uuid("publisher_id").references(() => publishers.id, {
      onDelete: "set null",
    }),
    coverUrl: text("cover_url"),
    language: text("language").default("en").notNull(),
    pageCount: integer("page_count"),
    publishedYear: integer("published_year"),
    edition: text("edition"),
    totalCopies: integer("total_copies").default(0).notNull(),
    availableCopies: integer("available_copies").default(0).notNull(),
    rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    titleIdx: index("books_title_idx").on(t.title),
    isbnIdx: index("books_isbn_idx").on(t.isbn),
    categoryIdx: index("books_category_idx").on(t.categoryId),
  }),
);

export const bookAuthors = pgTable(
  "book_authors",
  {
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => authors.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.authorId] }),
  }),
);

export const bookCopies = pgTable(
  "book_copies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    barcode: text("barcode").notNull().unique(),
    qrCode: text("qr_code"),
    status: copyStatusEnum("status").default("available").notNull(),
    condition: text("condition").default("good").notNull(),
    location: text("location"), // shelf / section
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    bookIdx: index("book_copies_book_idx").on(t.bookId),
    statusIdx: index("book_copies_status_idx").on(t.status),
  }),
);

/* ────────────────────────────────────────────────────────────────────────
 * 4. Circulation
 * ──────────────────────────────────────────────────────────────────────── */

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    membershipNumber: text("membership_number").notNull().unique(),
    membershipType: text("membership_type").default("public").notNull(),
    status: memberStatusEnum("status").default("active").notNull(),
    address: text("address"),
    maxBorrowLimit: integer("max_borrow_limit").default(5).notNull(),
    notes: text("notes"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: uniqueIndex("members_user_idx").on(t.userId),
    statusIdx: index("members_status_idx").on(t.status),
  }),
);

export const borrowings = pgTable(
  "borrowings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    copyId: uuid("copy_id")
      .notNull()
      .references(() => bookCopies.id, { onDelete: "restrict" }),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "restrict" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    issuedById: uuid("issued_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    borrowedAt: timestamp("borrowed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    renewalCount: integer("renewal_count").default(0).notNull(),
    status: borrowingStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    memberIdx: index("borrowings_member_idx").on(t.memberId),
    statusIdx: index("borrowings_status_idx").on(t.status),
    dueIdx: index("borrowings_due_idx").on(t.dueAt),
  }),
);

export const fines = pgTable(
  "fines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    borrowingId: uuid("borrowing_id").references(() => borrowings.id, {
      onDelete: "set null",
    }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default(
      "0",
    ),
    reason: fineReasonEnum("reason").default("overdue").notNull(),
    status: fineStatusEnum("status").default("pending").notNull(),
    description: text("description"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    waivedById: uuid("waived_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    memberIdx: index("fines_member_idx").on(t.memberId),
    statusIdx: index("fines_status_idx").on(t.status),
  }),
);

export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  borrowingId: uuid("borrowing_id")
    .notNull()
    .references(() => borrowings.id, { onDelete: "cascade" }),
  receivedById: uuid("received_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  returnedAt: timestamp("returned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  condition: text("condition").default("good").notNull(),
  lateDays: integer("late_days").default(0).notNull(),
  fineId: uuid("fine_id").references(() => fines.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: uuid("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    status: reservationStatusEnum("status").default("pending").notNull(),
    queuePosition: integer("queue_position").default(1).notNull(),
    reservedAt: timestamp("reserved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    bookIdx: index("reservations_book_idx").on(t.bookId),
    memberIdx: index("reservations_member_idx").on(t.memberId),
    statusIdx: index("reservations_status_idx").on(t.status),
  }),
);

/* ────────────────────────────────────────────────────────────────────────
 * 5. Platform
 * ──────────────────────────────────────────────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").default("general").notNull(),
    channel: notificationChannelEnum("channel").default("in_app").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("notifications_user_idx").on(t.userId),
    readIdx: index("notifications_read_idx").on(t.isRead),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(), // e.g. "book.created"
    entity: text("entity").notNull(), // e.g. "book"
    entityId: text("entity_id"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    entityIdx: index("audit_logs_entity_idx").on(t.entity, t.entityId),
    actorIdx: index("audit_logs_actor_idx").on(t.userId),
  }),
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: text("type").notNull(), // e.g. "borrow", "return", "login"
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdx: index("activity_logs_user_idx").on(t.userId),
  }),
);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  description: text("description"),
  updatedById: uuid("updated_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ────────────────────────────────────────────────────────────────────────
 * 6. Relations
 * ──────────────────────────────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ one, many }) => ({
  roleRef: one(roles, { fields: [users.roleId], references: [roles.id] }),
  member: one(members, { fields: [users.id], references: [members.userId] }),
  notifications: many(notifications),
  activityLogs: many(activityLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  }),
);

export const booksRelations = relations(books, ({ one, many }) => ({
  category: one(categories, {
    fields: [books.categoryId],
    references: [categories.id],
  }),
  publisher: one(publishers, {
    fields: [books.publisherId],
    references: [publishers.id],
  }),
  bookAuthors: many(bookAuthors),
  copies: many(bookCopies),
  reservations: many(reservations),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  books: many(books),
}));

export const publishersRelations = relations(publishers, ({ many }) => ({
  books: many(books),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors),
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, { fields: [bookAuthors.bookId], references: [books.id] }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id],
  }),
}));

export const bookCopiesRelations = relations(bookCopies, ({ one, many }) => ({
  book: one(books, { fields: [bookCopies.bookId], references: [books.id] }),
  borrowings: many(borrowings),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  borrowings: many(borrowings),
  reservations: many(reservations),
  fines: many(fines),
}));

export const borrowingsRelations = relations(borrowings, ({ one, many }) => ({
  copy: one(bookCopies, {
    fields: [borrowings.copyId],
    references: [bookCopies.id],
  }),
  book: one(books, { fields: [borrowings.bookId], references: [books.id] }),
  member: one(members, {
    fields: [borrowings.memberId],
    references: [members.id],
  }),
  issuedBy: one(users, {
    fields: [borrowings.issuedById],
    references: [users.id],
  }),
  return: one(returns, {
    fields: [borrowings.id],
    references: [returns.borrowingId],
  }),
  fines: many(fines),
}));

export const returnsRelations = relations(returns, ({ one }) => ({
  borrowing: one(borrowings, {
    fields: [returns.borrowingId],
    references: [borrowings.id],
  }),
  receivedBy: one(users, {
    fields: [returns.receivedById],
    references: [users.id],
  }),
  fine: one(fines, { fields: [returns.fineId], references: [fines.id] }),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  book: one(books, { fields: [reservations.bookId], references: [books.id] }),
  member: one(members, {
    fields: [reservations.memberId],
    references: [members.id],
  }),
}));

export const finesRelations = relations(fines, ({ one }) => ({
  member: one(members, {
    fields: [fines.memberId],
    references: [members.id],
  }),
  borrowing: one(borrowings, {
    fields: [fines.borrowingId],
    references: [borrowings.id],
  }),
  waivedBy: one(users, {
    fields: [fines.waivedById],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

/* ────────────────────────────────────────────────────────────────────────
 * 7. Inferred types
 * ──────────────────────────────────────────────────────────────────────── */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type BookCopy = typeof bookCopies.$inferSelect;
export type NewBookCopy = typeof bookCopies.$inferInsert;
export type Author = typeof authors.$inferSelect;
export type Publisher = typeof publishers.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Borrowing = typeof borrowings.$inferSelect;
export type NewBorrowing = typeof borrowings.$inferInsert;
export type Return = typeof returns.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type Fine = typeof fines.$inferSelect;
export type NewFine = typeof fines.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type CopyStatus = (typeof copyStatusEnum.enumValues)[number];
export type BorrowingStatus = (typeof borrowingStatusEnum.enumValues)[number];
export type ReservationStatus =
  (typeof reservationStatusEnum.enumValues)[number];
export type FineStatus = (typeof fineStatusEnum.enumValues)[number];
export type FineReason = (typeof fineReasonEnum.enumValues)[number];
export type MemberStatus = (typeof memberStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
