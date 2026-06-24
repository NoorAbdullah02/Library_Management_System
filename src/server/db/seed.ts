/**
 * Database seed — run with `npm run db:seed`.
 *
 * Idempotent-ish: it clears the domain tables first, then inserts a rich,
 * demo-ready dataset (roles/permissions, staff + members, a catalog with
 * copies, live borrowings, reservations, fines, notifications, activity).
 *
 * Default logins (password for all): `Password123`
 *   admin@lumina.dev      · Administrator
 *   librarian@lumina.dev  · Librarian
 *   member@lumina.dev     · Member
 */

import "dotenv/config";
import { sql } from "drizzle-orm";

import { db } from "./index";
import {
  roles,
  permissions,
  rolePermissions,
  users,
  members,
  categories,
  authors,
  publishers,
  books,
  bookAuthors,
  bookCopies,
  borrowings,
  reservations,
  fines,
  notifications,
  activityLogs,
  settings,
} from "./schema";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";
import { generateBarcode, generateMembershipNumber } from "@/lib/codes";
import { slugify } from "@/lib/utils";

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function reset() {
  console.log("⟳ Clearing existing data…");
  // Order matters for FKs; TRUNCATE … CASCADE handles the graph.
  await db.execute(sql`
    TRUNCATE TABLE
      ${activityLogs}, ${notifications}, ${fines}, ${reservations},
      ${borrowings}, ${bookCopies}, ${bookAuthors}, ${books},
      ${authors}, ${publishers}, ${categories}, ${members},
      ${rolePermissions}, ${permissions}, ${roles}, ${users}, ${settings}
    RESTART IDENTITY CASCADE
  `);
}

async function seedRbac() {
  console.log("⟳ Seeding roles & permissions…");
  const permRows = await db
    .insert(permissions)
    .values(
      ALL_PERMISSIONS.map((name) => {
        const [resource, action] = name.split(":");
        return { name, resource: resource!, action: action! };
      }),
    )
    .returning();
  const permByName = new Map(permRows.map((p) => [p.name, p.id]));

  for (const roleName of ["admin", "librarian", "member"] as const) {
    const [role] = await db
      .insert(roles)
      .values({
        name: roleName,
        description: ROLE_DESCRIPTIONS[roleName],
        isSystem: true,
      })
      .returning();

    const grants = ROLE_PERMISSIONS[roleName];
    const grantNames =
      grants === "*" ? ALL_PERMISSIONS : grants;
    await db.insert(rolePermissions).values(
      grantNames
        .map((n) => permByName.get(n))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role!.id, permissionId })),
    );
    console.log(`   • ${ROLE_LABELS[roleName]} (${grantNames.length} permissions)`);
  }
}

async function seedUsers() {
  console.log("⟳ Seeding users…");
  const pw = await hashPassword("Password123");

  const staff = await db
    .insert(users)
    .values([
      { name: "Ada Lovelace", email: "admin@lumina.dev", passwordHash: pw, role: "admin", emailVerified: new Date() },
      { name: "Marcus Aurelius", email: "librarian@lumina.dev", passwordHash: pw, role: "librarian", emailVerified: new Date() },
    ])
    .returning();

  const memberNames = [
    "Maya Angelou", "George Orwell", "Toni Morrison", "Haruki Murakami",
    "Chimamanda Adichie", "Gabriel García Márquez", "Ursula K. Le Guin",
    "James Baldwin", "Octavia Butler", "Italo Calvino",
  ];
  const memberUsers = await db
    .insert(users)
    .values(
      memberNames.map((name, i) => ({
        name,
        email: i === 0 ? "member@lumina.dev" : `${slugify(name)}@readers.lumina.dev`,
        passwordHash: pw,
        role: "member" as const,
        emailVerified: new Date(),
        phone: `+1 555 01${String(i).padStart(2, "0")}`,
      })),
    )
    .returning();

  await db.insert(members).values(
    memberUsers.map((u, i) => ({
      userId: u.id,
      membershipNumber: generateMembershipNumber(),
      membershipType: ["public", "student", "faculty", "staff"][i % 4]!,
      status: (i === 9 ? "suspended" : "active") as "active" | "suspended",
      maxBorrowLimit: i % 4 === 2 ? 10 : 5,
      joinedAt: daysFromNow(-(30 + i * 12)),
      expiresAt: daysFromNow(365 - i * 10),
    })),
  );

  return { staff, memberUsers };
}

async function seedCatalog(adminId: string) {
  console.log("⟳ Seeding catalog…");
  const cats = await db
    .insert(categories)
    .values(
      [
        ["Fiction", "#caa24a"],
        ["Science", "#4aa3c9"],
        ["History", "#c97a4a"],
        ["Technology", "#7a4ac9"],
        ["Philosophy", "#4ac98c"],
        ["Poetry", "#c94a86"],
      ].map(([name, color]) => ({ name: name!, slug: slugify(name!), color })),
    )
    .returning();

  const auths = await db
    .insert(authors)
    .values(
      ["Frank Herbert", "Carl Sagan", "Yuval Noah Harari", "Donella Meadows",
       "Marcus Aurelius", "Mary Oliver", "Kazuo Ishiguro", "Andy Weir"].map(
        (name) => ({ name }),
      ),
    )
    .returning();

  const pubs = await db
    .insert(publishers)
    .values(
      ["Penguin Random House", "Vintage Books", "Harper", "MIT Press"].map(
        (name) => ({ name, website: `https://example.com/${slugify(name)}` }),
      ),
    )
    .returning();

  const catalog = [
    ["Dune", "Fiction", "Frank Herbert", "9780441013593", 1965, 412],
    ["Cosmos", "Science", "Carl Sagan", "9780345539434", 1980, 396],
    ["Sapiens", "History", "Yuval Noah Harari", "9780062316097", 2011, 443],
    ["Thinking in Systems", "Technology", "Donella Meadows", "9781603580557", 2008, 240],
    ["Meditations", "Philosophy", "Marcus Aurelius", "9780140449334", 180, 304],
    ["Devotions", "Poetry", "Mary Oliver", "9780399563249", 2017, 480],
    ["Klara and the Sun", "Fiction", "Kazuo Ishiguro", "9780571364879", 2021, 320],
    ["The Martian", "Fiction", "Andy Weir", "9780553418026", 2014, 384],
    ["Project Hail Mary", "Fiction", "Andy Weir", "9780593135204", 2021, 496],
    ["Pale Blue Dot", "Science", "Carl Sagan", "9780345376596", 1994, 429],
    ["Homo Deus", "History", "Yuval Noah Harari", "9780062464316", 2015, 449],
    ["Dune Messiah", "Fiction", "Frank Herbert", "9780593098233", 1969, 256],
  ] as const;

  const createdBooks: { id: string; copies: string[] }[] = [];

  for (const [title, catName, authorName, isbn, year, pages] of catalog) {
    const category = cats.find((c) => c.name === catName)!;
    const author = auths.find((a) => a.name === authorName)!;
    const publisher = pubs[Math.floor(Math.random() * pubs.length)]!;
    const totalCopies = 2 + Math.floor(Math.random() * 4);

    const [book] = await db
      .insert(books)
      .values({
        title,
        isbn,
        categoryId: category.id,
        publisherId: publisher.id,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        language: "en",
        pageCount: pages,
        publishedYear: year,
        totalCopies,
        availableCopies: totalCopies,
        rating: (3.8 + Math.random() * 1.2).toFixed(2),
        tags: [catName.toLowerCase(), "featured"],
        createdById: adminId,
      })
      .returning();

    await db.insert(bookAuthors).values({ bookId: book!.id, authorId: author.id });

    const copies = await db
      .insert(bookCopies)
      .values(
        Array.from({ length: totalCopies }, () => ({
          bookId: book!.id,
          barcode: generateBarcode(),
          status: "available" as const,
          location: `Aisle ${1 + Math.floor(Math.random() * 9)} · Shelf ${String.fromCharCode(65 + Math.floor(Math.random() * 6))}`,
        })),
      )
      .returning({ id: bookCopies.id });

    createdBooks.push({ id: book!.id, copies: copies.map((c) => c.id) });
  }

  return { cats, createdBooks };
}

async function seedCirculation(opts: {
  librarianId: string;
  createdBooks: { id: string; copies: string[] }[];
}) {
  console.log("⟳ Seeding circulation…");
  const memberRows = await db.query.members.findMany();
  const { createdBooks, librarianId } = opts;

  // A handful of active + overdue loans.
  for (let i = 0; i < 8; i++) {
    const book = createdBooks[i % createdBooks.length]!;
    const member = memberRows[i % memberRows.length]!;
    const copyId = book.copies[0]!;
    const overdue = i % 3 === 0;
    const borrowedAt = daysFromNow(overdue ? -25 : -5);
    const dueAt = daysFromNow(overdue ? -5 : 9);

    await db.insert(borrowings).values({
      copyId,
      bookId: book.id,
      memberId: member.id,
      issuedById: librarianId,
      borrowedAt,
      dueAt,
      status: overdue ? "overdue" : "active",
    });
    await db.update(bookCopies).set({ status: "borrowed" }).where(sql`${bookCopies.id} = ${copyId}`);
    await db
      .update(books)
      .set({ availableCopies: sql`greatest(${books.availableCopies} - 1, 0)` })
      .where(sql`${books.id} = ${book.id}`);

    if (overdue) {
      await db.insert(fines).values({
        memberId: member.id,
        amount: (5 + i).toFixed(2),
        reason: "overdue",
        status: i % 2 === 0 ? "pending" : "paid",
        paidAmount: i % 2 === 0 ? "0" : (5 + i).toFixed(2),
        description: "Overdue return",
      });
    }
  }

  // Reservation queue on a popular title.
  const popular = createdBooks[0]!;
  for (let i = 0; i < 3; i++) {
    await db.insert(reservations).values({
      bookId: popular.id,
      memberId: memberRows[i + 1]!.id,
      queuePosition: i + 1,
      status: i === 0 ? "ready" : "pending",
      readyAt: i === 0 ? new Date() : null,
      expiresAt: i === 0 ? daysFromNow(3) : null,
    });
  }
}

async function seedPlatform(memberUserId: string) {
  console.log("⟳ Seeding notifications, activity & settings…");
  await db.insert(notifications).values([
    { userId: memberUserId, type: "welcome", channel: "email", title: "Welcome to Lumina", body: "Your library account is ready.", isRead: true, sentAt: new Date() },
    { userId: memberUserId, type: "due_reminder", channel: "in_app", title: "Book due soon", body: '"Dune" is due in 2 days.' },
    { userId: memberUserId, type: "reservation_ready", channel: "email", title: "Reservation ready", body: 'Your hold on "Dune" is ready for pickup.', sentAt: new Date() },
  ]);

  await db.insert(activityLogs).values([
    { userId: memberUserId, type: "auth", description: "Signed in" },
    { userId: memberUserId, type: "borrow", description: 'Borrowed "Sapiens"' },
    { userId: memberUserId, type: "return", description: 'Returned "Cosmos"' },
    { userId: memberUserId, type: "reservation", description: 'Reserved "Dune"' },
  ]);

  await db.insert(settings).values({
    key: "library_policy",
    value: { loanDays: 14, finePerDay: 0.5, maxBorrowLimit: 5, maxRenewals: 2, reservationHoldDays: 3 },
    description: "Library circulation policy",
  });
}

async function main() {
  console.log("\n📚  Seeding Lumina LMS\n");
  await reset();
  await seedRbac();
  const { staff, memberUsers } = await seedUsers();
  const adminId = staff[0]!.id;
  const librarianId = staff[1]!.id;
  const { createdBooks } = await seedCatalog(adminId);
  await seedCirculation({ librarianId, createdBooks });
  await seedPlatform(memberUsers[0]!.id);

  console.log("\n✅  Seed complete.");
  console.log("\n   Logins (password: Password123):");
  console.log("   • admin@lumina.dev      (Administrator)");
  console.log("   • librarian@lumina.dev  (Librarian)");
  console.log("   • member@lumina.dev     (Member)\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
