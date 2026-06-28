import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Globe, Calendar, Layers } from "lucide-react";

import { requirePermission } from "@/server/auth/guards";
import { getBookById } from "@/server/queries/books";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookCopiesPanel } from "@/features/books/book-copies-panel";
import { formatISBN } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("books:read");
  const { id } = await params;
  const book = await getBookById(id);
  if (!book) notFound();

  const authors = book.bookAuthors.map((ba) => ba.author.name).join(", ");
  const queue = book.reservations.filter((r) => r.status === "pending" || r.status === "ready");

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/books">
          <ArrowLeft className="size-4" /> Back to catalog
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cover + quick facts */}
        <div className="space-y-4">
          <div className="glass overflow-hidden rounded-2xl p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.coverUrl ?? `https://avatar.vercel.sh/${book.id}.png`}
              alt={book.title}
              className="aspect-[2/3] w-full rounded-xl object-cover"
            />
          </div>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 pt-6 text-sm">
              <Fact icon={Star} label="Rating" value={`${book.rating ?? "—"} / 5`} />
              <Fact icon={Layers} label="Copies" value={`${book.availableCopies}/${book.totalCopies}`} />
              <Fact icon={Calendar} label="Published" value={book.publishedYear?.toString() ?? "—"} />
              <Fact icon={Globe} label="Language" value={book.language.toUpperCase()} />
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {book.category && (
                <Badge
                  variant="outline"
                  style={{
                    borderColor: `${book.category.color}55`,
                    color: book.category.color ?? undefined,
                  }}
                >
                  {book.category.name}
                </Badge>
              )}
              <StatusBadge
                status={book.availableCopies > 0 ? "available" : "borrowed"}
              />
            </div>
            <h1 className="font-serif text-4xl tracking-tight">{book.title}</h1>
            {book.subtitle && (
              <p className="text-muted-foreground text-lg">{book.subtitle}</p>
            )}
            <p className="text-sm">
              by <span className="font-medium">{authors || "Unknown"}</span>
              {book.publisher ? ` · ${book.publisher.name}` : ""}
            </p>
            <p className="text-muted-foreground font-mono text-xs">
              ISBN {formatISBN(book.isbn)}
            </p>
          </div>

          {book.description && (
            <Card>
              <CardHeader>
                <CardTitle>About this book</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {book.description}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Copies & codes</CardTitle>
              </CardHeader>
              <CardContent>
                <BookCopiesPanel copies={book.copies} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reservation queue</CardTitle>
              </CardHeader>
              <CardContent>
                {queue.length ? (
                  <ol className="space-y-2">
                    {queue.map((r, i) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="flex items-center gap-2">
                          <span className="bg-muted flex size-6 items-center justify-center rounded-full text-xs">
                            {i + 1}
                          </span>
                          {r.member?.user?.name ?? "Member"}
                        </span>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No active reservations.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
